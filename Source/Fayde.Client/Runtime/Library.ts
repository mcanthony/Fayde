module Fayde {
    export interface ILibraryAsyncContext {
        Resolving: Library[];
    }

    interface ILibraryHash {
        [id: string]: Library;
    }
    var libraries: ILibraryHash = <any>[];
    export class Library {
        Module: any;
        Theme: Theme;

        private _ModuleUrl: string;
        private _ThemeUrl: string;
        private _IsLoading = false;
        private _IsLoaded = false;
        private _LoadError: any = null;
        private _Deferrables: IDeferrable<any>[] = [];

        constructor(moduleUrl: string, themeUrl?: string) {
            this._ModuleUrl = moduleUrl;
            this._ThemeUrl = themeUrl;
        }

        static TryGetClass(xmlns: string, xmlname: string): any {
            var library = Library.Get(xmlns);
            if (library && library.Module)
                return library.Module[xmlname];
        }

        static Get(url: string): Library {
            if (url.indexOf("lib:") !== 0)
                return undefined;
            return libraries[url.substr("lib:".length)];
        }

        Resolve(ctx?: ILibraryAsyncContext): IAsyncRequest<Library> {
            ctx = ctx || { Resolving: [] };
            ctx.Resolving.push(this);
            this._Load(ctx);

            var d = defer<Library>();
            if (this._IsLoaded) {
                d.resolve(this);
                return d.request;
            }
            if (this._LoadError) {
                d.reject(this._LoadError);
                return d.request;
            }
            this._Deferrables.push(d);
            return d.request;
        }

        private _Load(ctx: ILibraryAsyncContext) {
            if (this._IsLoading || this._IsLoaded)
                return;
            this._IsLoading = true;
            var m = defer<any>();
            (<Function>require)([this._ModuleUrl], res => m.resolve(this.Module = res), m.reject);
            var iars: IAsyncRequest<any>[] = [m.request];
            
            if (!!this._ThemeUrl) {
                this.Theme = new Theme(new Uri(this._ThemeUrl));
                iars.push(this.Theme.Resolve(ctx));
            }

            deferArraySimple(iars)
                .success(res => this._FinishLoad(ctx))
                .error(error => this._FinishLoad(ctx, this._LoadError = error));
        }
        private _FinishLoad(ctx: ILibraryAsyncContext, error?: any) {
            var index = ctx.Resolving.indexOf(this);
            if (index > -1)
                ctx.Resolving.splice(index, 1);

            this._IsLoading = false;
            this._IsLoaded = true;
            for (var i = 0, ds = this._Deferrables, len = ds.length; i < len; i++) {
                if (error)
                    ds[i].reject(error);
                else
                    ds[i].resolve(this);
            }
        }
    }

    export function RegisterLibrary(name: string, moduleUrl: string, themeUrl?: string): Library {
        var library = libraries[name];
        if (library)
            throw new Exception("Library already registered: '" + name + "'.");
        return libraries[name] = new Library(moduleUrl, themeUrl);
    }
}