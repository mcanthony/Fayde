module Fayde.Controls {
    export class ContainerMap {
        private _Containers: DependencyObject[] = [];
        private _Items: any[] = [];
        constructor(public Owner: ItemContainerGenerator) { }
        IndexFromItem(item: any) {
            var items = this._Items;
            var len = items.length;
            for (var i = 0; i < len; i++) {
                if (item === items[i])
                    return i;
            }
            return -1;
        }
        IndexFromContainer(container: DependencyObject): number {
            var containers = this._Containers;
            var len = containers.length;
            for (var i = 0; i < len; i++) {
                if (container === containers[i])
                    return i;
            }
            return -1;
        }
        ContainerFromIndex(index: number): DependencyObject { return this._Containers[index]; }
        ItemFromContainer(container: DependencyObject): any {
            var index = this.IndexFromContainer(container);
            if (index > 0)
                return this._Items[index];
            return new UnsetValue();
        }
        ContainerFromItem(item: any): DependencyObject {
            if (item == null)
                return null;
            var index = this.IndexFromItem(item);
            if (index > 0)
                return this._Containers[index];
        }
        Add(container: DependencyObject, item: any, index: number) {
            if (index < this._Containers.length)
                throw new InvalidOperationException("Cannot insert into ContainerMap - only append.");
            this._Containers.push(container);
            this._Items.push(item);
        }
        RemoveIndex(index: number): DependencyObject {
            this._Items.splice(index, 1);
            return this._Containers.splice(index, 1)[0];
        }
        Move(oldIndex: number, offset: number) {
            var items = this._Items;
            var containers = this._Containers;
            var finalIndex = oldIndex + offset;
            if (offset > 0)
                finalIndex--;
            items.splice(finalIndex, 0, items.splice(oldIndex, 1)[0]);
            containers.splice(finalIndex, 0, containers.splice(oldIndex, 1)[0]);
        }
        Clear() {
            var ic = this.Owner.Owner;
            var containers = this._Containers;
            var items = this._Items;
            var len = containers.length;
            for (var i = 0; i < len; i++) {
                ic.ClearContainerForItem(containers[i], items[i]);
            }
        }
    }
}

module Fayde.Controls {
    export enum TextWrapping {
        NoWrap = 0,
        Wrap = 1,
        WrapWithOverflow = 2,
    }
    export enum ScrollBarVisibility {
        Disabled = 0,
        Auto = 1,
        Hidden = 2,
        Visible = 3,
    }
    export enum TextTrimming {
        None = 0,
    }
    export enum ClickMode {
        Release = 0,
        Press = 1,
        Hover = 2,
    }
    export enum PlacementMode {
        Bottom = 0,
        Right = 1,
        Mouse = 2,
        Left = 3,
        Top = 4,
    }
    export enum SelectionMode {
        Single = 0,
        Multiple = 1,
        Extended = 2,
    }
    export enum MediaElementState {
        Closed = 0,
        Opening = 1,
        Buffering = 4,
        Playing = 5,
        Paused = 6,
        Stopped = 7
    }
}

module Fayde.Controls {
    export interface IGeneratorPosition {
        index: number;
        offset: number;
    }
    export interface IGenerationState {
        AllowStartAtRealizedItem: bool;
        PositionIndex: number;
        PositionOffset: number;
        Step: number;
    }
    export interface IItemsChangedListener {
        OnItemsChanged(action: ItemsChangedAction, itemCount: number, itemUICount: number, oldPosition: IGeneratorPosition, position: IGeneratorPosition);
    }
    export enum ItemsChangedAction {
        Add = 1,
        Remove = 2,
        Replace = 3,
        Reset = 4,
    }
    export interface IRange {
        Start: number;
        End: number;
    }
    function range_count(r: IRange) {
        return r.End - r.Start + 1;
    }
    export class RangeCollection {
        private _Ranges: IRange[] = [];
        private _IndexCount: number = 0;
        private _Gen: number = 0;
        get Count(): number { return this._IndexCount; }
        ToExpandedArray(): number[] {
            var arr = [];
            var count = this._IndexCount;
            for (var i = 0; i < count; i++) {
                arr.push(this.GetValueAt(i));
            }
            return arr;
        }
        FindRangeIndexForValue(value: number): number {
            var min = 0;
            var max = this._Ranges.length - 1;
            while (min <= max) {
                var mid = Math.floor(min + ((max - min) / 2));
                var range = this._Ranges[mid];
                if (value >= range.Start && value <= range.End)
                    return mid;
                if (value < range.Start)
                    max = mid - 1;
                else
                    min = mid + 1;
            }
            return ~min;
        }
        FindInsertionPosition(range: IRange): number {
            var min = 0;
            var max = this._Ranges.length - 1;
            while (min <= max) {
                var mid = Math.floor(min + ((max - min) / 2));
                var midRange = this._Ranges[mid];
                if (midRange.End === range.End)
                    return mid;
                if (midRange.End > range.End) {
                    if (mid > 0 && (this._Ranges[mid - 1].End < range.End))
                        return mid;
                    max = mid - 1;
                } else {
                    min = mid + 1;
                }
            }
            return min;
        }
        IndexOf(value: number): number {
            var offset = 0;
            var rs = this._Ranges;
            var len = rs.length;
            for (var i = 0; i < len; i++) {
                var range = rs[i];
                if (value >= range.Start && value <= range.End)
                    return offset + (value - range.Start);
                offset = offset + (range.End - range.Start + 1);
            }
            return -1;
        }
        Contains(value: number) { return this.FindRangeIndexForValue(value) >= 0; }
        Get(index: number): IRange { return this._Ranges[index]; }
        GetValueAt(index: number): number {
            var i;
            var cuml_count;
            var rs = this._Ranges;
            var len = rs.length;
            var r: IRange;
            for (i = 0, cuml_count = 0; i < len && index >= 0; i++) {
                r = rs[i];
                cuml_count = cuml_count + range_count(r);
                if (index < cuml_count)
                    return r.End - (cuml_count - index) + 1;
            }
            throw new IndexOutOfRangeException(index);
        }
        Add(value: number): bool {
            if (!this.Contains(value)) {
                this._Gen++;
                this.InsertRange({ Start: value, End: value });
                this._IndexCount++;
                return true;
            }
            return false;
        }
        Insert(position: number, range: IRange) {
            this._Ranges.splice(position, 0, range);
        }
        InsertRange(range: IRange) {
            var position = this.FindInsertionPosition(range);
            var merged_left = this.MergeLeft(range, position);
            var merged_right = this.MergeRight(range, position);
            if (!merged_left && !merged_right) {
                this.Insert(position, range);
            } else if (merged_left && merged_right) {
                this._Ranges[position - 1].End = this._Ranges[position].End;
                this.RemoveAt(position);
            }
        }
        Remove(value: number): bool {
            this._Gen++;
            return this.RemoveIndexFromRange(value);
        }
        RemoveAt(index: number) {
            this._Ranges.splice(index, 1);
        }
        RemoveIndexFromRange(index: number): bool {
            var rindex = this.FindRangeIndexForValue(index);
            if (rindex < 0)
                return false;
            var range = this._Ranges[rindex];
            if (range.Start === index && range.End === index) {
                this.RemoveAt(rindex);
            } else if (range.Start === index) {
                range.Start++;
            } else if (range.End === index) {
                range.End--;
            } else {
                var split_range = { Start: index + 1, End: range.End };
                range.End = index - 1;
                this.Insert(rindex + 1, split_range);
            }
            this._IndexCount--;
            return true;
        }
        Clear() {
            this._Ranges = [];
            this._Gen++;
            this._IndexCount = 0;
        }
        MergeLeft(range: IRange, position: number): bool {
            var left = position - 1;
            var rs = this._Ranges;
            if (left >= 0 && rs[left].End + 1 == range.Start) {
                rs[left].End = range.Start;
                return true;
            }
            return false;
        }
        MergeRight(range: IRange, position: number): bool {
            var rs = this._Ranges;
            if ((position < rs.length) && (rs[position].Start - 1 === range.End)) {
                rs[position].Start = range.End;
                return true;
            }
            return false;
        }
    }
    export class ItemContainerGenerator {
        private _GenerationState: IGenerationState;
        private RealizedElements: RangeCollection = new RangeCollection();
        private Cache: DependencyObject[] = [];
        private ContainerMap: ContainerMap;
        private _Listener: IItemsChangedListener;
        Listen(listener: IItemsChangedListener) { this._Listener = listener; }
        Unlisten(listener: IItemsChangedListener) { if (this._Listener === listener) this._Listener = null; }
        get Panel(): Panel { return this.Owner.Panel; }
        constructor(public Owner: ItemsControl) {
            this.ContainerMap = new ContainerMap(this);
        }
        GetItemContainerGeneratorForPanel(panel) {
            if (this.Panel === panel)
                return this;
            return null;
        }
        CheckOffsetAndRealized(position: IGeneratorPosition, count: number) {
            if (position.offset !== 0) {
                throw new ArgumentException("position.Offset must be zero as the position must refer to a realized element");
            }
            var index = this.IndexFromGeneratorPosition(position);
            var realized = this.RealizedElements;
            var rangeIndex = realized.FindRangeIndexForValue(index);
            var range = realized.Get(rangeIndex);
            if (index < range.Start || (index + count) > range.Start + range_count(range)) {
                throw new InvalidOperationException("Only items which have been Realized can be removed");
            }
        }
        GeneratorPositionFromIndex(index: number): IGeneratorPosition {
            var realized = this.RealizedElements;
            var realizedCount = realized.Count;
            if (index < 0)
                return { index: -1, offset: 0 };
            else if (realized.Contains(index))
                return { index: realized.IndexOf(index), offset: 0 };
            else if (index > this.Owner.Items.Count)
                return { index: -1, offset: 0 };
            if (realizedCount === 0)
                return { index: -1, offset: index + 1 };
            var index = -1;
            for (var i = 0; i < realizedCount; i++) {
                if (realized.GetValueAt(i) > index)
                    break;
                index = i;
            }
            if (index === -1) 
                return { index: index, offset: index + 1 };
            return { index: index, offset: index - realized.GetValueAt(index) };
        }
        IndexFromGeneratorPosition(position: IGeneratorPosition): number {
            var index = position.index;
            var offset = position.offset;
            if (index === -1) {
                if (offset < 0)
                    return this.Owner.Items.Count + offset;
                return offset - 1;
            }
            if (index > this.Owner.Items.Count)
                return -1;
            var realized = this.RealizedElements;
            if (index >= 0 && index < realized.Count)
                return realized.GetValueAt(index) + offset;
            return index + offset;
        }
        IndexFromContainer(container: DependencyObject): number { return this.ContainerMap.IndexFromContainer(container); }
        ContainerFromIndex(index: number): DependencyObject { return this.ContainerMap.ContainerFromIndex(index); }
        ItemFromContainer(container: DependencyObject): any { return this.ContainerMap.ItemFromContainer(container); }
        ContainerFromItem(item: any): DependencyObject { return this.ContainerMap.ContainerFromItem(item); }
        StartAt(position: IGeneratorPosition, direction: number, allowStartAtRealizedItem: bool): IGenerationState {
            if (this._GenerationState)
                throw new InvalidOperationException("Cannot call StartAt while a generation operation is in progress");
            this._GenerationState = {
                AllowStartAtRealizedItem: allowStartAtRealizedItem,
                PositionIndex: position.index,
                PositionOffset: position.offset,
                Step: direction
            };
            return this._GenerationState;
        }
        GenerateNext(isNewlyRealized: IOutValue): DependencyObject {
            if (!this._GenerationState) {
                throw new InvalidOperationException("Cannot call GenerateNext before calling StartAt");
            }
            var realized = this.RealizedElements;
            var state = this._GenerationState;
            var index: number;
            var startAt = state.PositionIndex;;
            var startOffset = state.PositionOffset;
            if (startAt === -1) {
                if (startOffset < 0)
                    index = this.Owner.Items.Count + startOffset;
                else if (startOffset == 0)
                    index = 0;
                else
                    index = startOffset - 1;
            } else if (startAt >= 0 && startAt < realized.Count) {
                index = realized.GetValueAt[startAt] + startOffset;
            } else {
                index = -1;
            }
            var alreadyRealized = realized.Contains(index);
            if (!state.AllowStartAtRealizedItem && alreadyRealized && startOffset == 0) {
                index = index + state.Step;
                alreadyRealized = realized.Contains(index);
            }
            if (index < 0 || index >= this.Owner.Items.Count) {
                isNewlyRealized.Value = false;
                return null;
            }
            if (alreadyRealized) {
                state.PositionIndex = realized.IndexOf(index);
                state.PositionOffset = state.Step;
                isNewlyRealized.Value = false;
                return this.ContainerMap.ContainerFromIndex(index);
            }
            var container: DependencyObject;
            var item = this.Owner.Items.GetValueAt(index);
            if (this.Owner.IsItemItsOwnContainer(item)) {
                if (item instanceof DependencyObject)
                    container = <DependencyObject>item;
                isNewlyRealized.Value = true;
            } else {
                if (this.Cache.length === 0) {
                    container = this.Owner.GetContainerForItem();
                    isNewlyRealized.Value = true;
                } else {
                    container = this.Cache.pop();
                    isNewlyRealized.Value = false;
                }
                if (container instanceof ContentControl)
                    (<ContentControl>container)._ContentSetsParent = false;
            }
            if (container instanceof FrameworkElement && !(item instanceof UIElement))
                (<FrameworkElement>container).DataContext = item;
            realized.Add(index);
            this.ContainerMap.Add(container, item, index);
            state.PositionIndex = realized.IndexOf(index);
            state.PositionOffset = state.Step;
            return container;
        }
        StopGeneration() { this._GenerationState = undefined; }
        PrepareItemContainer(container: DependencyObject) {
            var item = this.ContainerMap.ItemFromContainer(container);
            this.Owner.PrepareContainerForItem(container, item);
        }
        MoveExistingItems(index: number, offset: number) {
            var list = this.RealizedElements.ToExpandedArray();
            if (offset > 0)
                list = list.reverse();
            var newRanges = new RangeCollection();
            var map = this.ContainerMap;
            for (var i = 0; i < list.length; i++) {
                var oldIndex = i;
                if (oldIndex < index) {
                    newRanges.Add(oldIndex);
                } else {
                    newRanges.Add(oldIndex + offset);
                    map.Move(oldIndex, offset);
                }
            }
            this.RealizedElements = newRanges;
        }
        Recycle(position: IGeneratorPosition, count: number) {
            this.CheckOffsetAndRealized(position, count);
            var index = this.IndexFromGeneratorPosition(position);
            var realized = this.RealizedElements;
            var cache = this.Cache;
            var map = this.ContainerMap;
            var end = index + count;
            for (var i = index; i < end; i++) {
                realized.Remove(i);
                cache.push(map.RemoveIndex(i));
            }
        }
        Remove(position: IGeneratorPosition, count: number) {
            this.CheckOffsetAndRealized(position, count);
            var index = this.IndexFromGeneratorPosition(position);
            var realized = this.RealizedElements;
            var map = this.ContainerMap;
            var end = index + count;
            for (var i = index; i < end; i++) {
                realized.Remove(i);
                map.RemoveIndex(i);
            }
        }
        RemoveAll() {
            this.ContainerMap.Clear();
            this.RealizedElements.Clear();
        }
        OnOwnerItemsItemsChanged(e) {
            var itemCount: number;
            var itemUICount: number;
            var oldPosition: IGeneratorPosition = { index: -1, offset: 0 };
            var position: IGeneratorPosition;
            switch (e.Action) {
                case ItemsChangedAction.Add:
                    if ((e.NewStartingIndex + 1) !== this.Owner.Items.Count)
                        this.MoveExistingItems(e.NewStartingIndex, 1);
                    itemCount = 1;
                    itemUICount = 0;
                    position = this.GeneratorPositionFromIndex(e.NewStartingIndex);
                    position.offset = 1;
                    break;
                case ItemsChangedAction.Remove:
                    itemCount = 1;
                    if (this.RealizedElements.Contains(e.OldStartingIndex))
                        itemUICount = 1;
                    else
                        itemUICount = 0;
                    position = this.GeneratorPositionFromIndex(e.OldStartingIndex);
                    if (itemUICount === 1)
                        this.Remove(position, 1);
                    this.MoveExistingItems(e.OldStartingIndex, -1);
                    break;
                case ItemsChangedAction.Replace:
                    if (!this.RealizedElements.Contains(e.NewStartingIndex))
                        return;
                    itemCount = 1;
                    itemUICount = 1;
                    position = this.GeneratorPositionFromIndex(e.NewStartingIndex);
                    this.Remove(position, 1);
                    var newPos = this.GeneratorPositionFromIndex(e.NewStartingIndex);
                    this.StartAt(newPos, 0, true);
                    this.PrepareItemContainer(this.GenerateNext({ Value: null }));
                    break;
                case ItemsChangedAction.Reset:
                    var itemCount;
                    if (!e.OldItems)
                        itemCount = 0;
                    else
                        itemCount = e.OldItems.Count;
                    itemUICount = this.RealizedElements.Count;
                    position = { index: -1, offset: 0 };
                    this.RemoveAll();
                    break;
                default:
                    break;
            }
            var listener = this._Listener;
            if (listener) listener.OnItemsChanged(e.Action, itemCount, itemUICount, oldPosition, position);
        }
    }
}

module Fayde.Controls.Primitives {
    export class ScrollData {
        CanHorizontallyScroll: bool = false;
        CanVerticallyScroll: bool = false;
        ScrollOwner: ScrollViewer = null;
        OffsetX: number = 0;
        OffsetY: number = 0;
        CachedOffsetX: number = 0;
        CachedOffsetY: number = 0;
        ViewportWidth: number = 0;
        ViewportHeight: number = 0;
        ExtentWidth: number = 0;
        ExtentHeight: number = 0;
        MaxDesiredWidth: number = 0;
        MaxDesiredHeight: number = 0;
    }
}

module Fayde {
    export function Clone(value: any): any {
        if (value instanceof XamlObject)
            return (<XamlObject>value).Clone();
        if (typeof value === "number" || typeof value === "string")
            return value;
        var typeName = value.constructor._TypeName;
        switch (typeName) {
            case "Uri":
            case "rect":
            case "size":
            case "FontFamily":
            case "Point":
            case "Color":
            case "PropertyPath":
            case "RepeatBehavior":
            case "Duration":
            case "KeyTime":
            case "GridLength":
            case "CornerRadius":
            case "Thickness":
                return (<ICloneable>value).Clone();
        }
        return new value.constructor();
    }
}

module Fayde {
    export enum Orientation {
        Horizontal = 0,
        Vertical = 1,
    }
    export enum Visibility {
        Visible = 0,
        Collapsed = 1,
    }
    export var CursorType = {
        Default: "",
        Hand: "pointer",
        IBeam: "text",
        Wait: "wait",
        SizeNESW: "ne-resize",
        SizeNWSE: "nw-resize",
        SizeNS: "n-resize",
        SizeWE: "w-resize"
    }
    export enum HorizontalAlignment {
        Left = 0,
        Center = 1,
        Right = 2,
        Stretch = 3,
    }
    export enum VerticalAlignment {
        Top = 0,
        Center = 1,
        Bottom = 2,
        Stretch = 3,
    }
    export enum FlowDirection {
        LeftToRight = 0,
        RightToLeft = 1,
    }
    export enum FontWeight {
        Thin = 100,
        ExtraLight = 200,
        Light = 300,
        Normal = 400,
        Medium = 500,
        SemiBold = 600,
        Bold = 700,
        ExtraBold = 800,
        Black = 900,
        ExtraBlack = 950,
    }
    export enum TextAlignment {
        Left = 0,
        Center = 1,
        Right = 2,
    }
    export enum TextDecorations {
        None = 0,
        Underline = 1,
    }
    export enum LineStackingStrategy {
        MaxHeight = 0,
        BlockLineHeight = 1,
    }
}

module Fayde {
    export function CreatePropertyChangedListener(property: DependencyProperty, func: (sender, args: IDependencyPropertyChangedEventArgs) => void , closure: any): Providers.IPropertyChangedListener {
        return {
            Detach: function () { },
            Property: property,
            OnPropertyChanged: function (sender: DependencyObject, args: IDependencyPropertyChangedEventArgs) { func.call(closure, sender, args); }
        };
    }
    export function ListenToPropertyChanged(target: DependencyObject, property: DependencyProperty, func: (sender, args: IDependencyPropertyChangedEventArgs) => void , closure: any): Providers.IPropertyChangedListener {
        var listener = CreatePropertyChangedListener(property, func, closure);
        listener.Detach = function () { target._Store._UnsubscribePropertyChanged(listener); };
        target._Store._SubscribePropertyChanged(listener);
        return listener;
    }
}

module Fayde {
    class TypeConverters {
        static ThicknessConverter(str: string): Thickness {
            if (!str)
                return new Thickness();
            var tokens = str.split(",");
            var left, top, right, bottom;
            if (tokens.length === 1) {
                left = top = right = bottom = parseFloat(tokens[0]);
            } else if (tokens.length === 2) {
                left = right = parseFloat(tokens[0]);
                top = bottom = parseFloat(tokens[1]);
            } else if (tokens.length === 4) {
                left = parseFloat(tokens[0]);
                top = parseFloat(tokens[1]);
                right = parseFloat(tokens[2]);
                bottom = parseFloat(tokens[3]);
            } else {
                throw new XamlParseException("Cannot parse Thickness value '" + str + "'");
            }
            return new Thickness(left, top, right, bottom);
        }
        static CornerRadiusConverter(str: string): CornerRadius {
            if (!str)
                return new CornerRadius();
            var tokens = str.split(",");
            var topLeft, topRight, bottomRight, bottomLeft;
            if (tokens.length === 1) {
                topLeft = topRight = bottomRight = bottomLeft = parseFloat(tokens[0]);
            } else if (tokens.length === 4) {
                topLeft = parseFloat(tokens[0]);
                topRight = parseFloat(tokens[1]);
                bottomLeft = parseFloat(tokens[2]);
                bottomRight = parseFloat(tokens[3]);
            } else {
                throw new XamlParseException("Cannot parse CornerRadius value '" + str + "'");
            }
            return new CornerRadius(topLeft, topRight, bottomRight, bottomLeft);
        }
        static BrushConverter(str: string): Media.Brush {
            var scb = new Media.SolidColorBrush();
            scb.Color = ColorConverter(str);
            return scb;
        }
        static ColorConverter(str: string): Color {
            if (!str)
                return new Color();
            if (str.substr(0, 1) !== "#") {
                var color = Color.KnownColors[str];
                if (!color)
                    throw new NotSupportedException("Unknown Color: " + str);
                return color;
            }
            return Color.FromHex(str);
        }
    }
    export class TypeConverter {
        static ConvertObject(propd: DependencyProperty, val: any, objectType: Function, doStringConversion: bool) {
            if (val == null)
                return val;
            var targetType = propd.GetTargetType();
            if (typeof targetType === "function" && (<any>targetType)._IsNullstone) {
                if (val instanceof targetType)
                    return val;
                var converter = TypeConverters[(<any>targetType)._TypeName + "Converter"];
                if (converter)
                    return converter(val);
            } else if (targetType instanceof Enum) {
                if (typeof val === "string") {
                    var ret = (<Enum><any>targetType).Object[val];
                    if (ret !== undefined)
                        return ret;
                    return val;
                }
            } else if (typeof targetType === "number" || targetType === Number) {
                if (typeof val === "number")
                    return val;
                if (!val)
                    return 0;
                if (val instanceof Thickness)
                    return val.Left;
                return parseFloat(val.toString());
            }
            if (typeof targetType === "string" || targetType === String)
                return doStringConversion ? val.toString() : "";
            var tc;
            if (propd._IsAttached) {
            } else {
            }
            return val;
        }
        static GeometryFromString(val: string): Media.Geometry {
            return Media.ParseGeometry(val);
        }
    }
}

module Fayde {
    export class VisualTreeHelper {
        static GetParent(d: DependencyObject): DependencyObject {
            if (!(d instanceof FrameworkElement))
                throw new InvalidOperationException("Reference is not a valid visual DependencyObject");
            var parentNode = (<UIElement>d).XamlNode.VisualParentNode;
            if (parentNode)
                return parentNode.XObject;
        }
        static GetRoot(d: DependencyObject): DependencyObject {
            if (!(d instanceof FrameworkElement))
                throw new InvalidOperationException("Reference is not a valid visual DependencyObject");
            var rootNode = (<UIElement>d).XamlNode.GetVisualRoot();
            if (rootNode)
                return rootNode.XObject;
        }
        static FindElementsInHostCoordinates(intersectingPoint: Point, subtree: UIElement): UIElement[] {
            var uies: UIElement[] = [];
            var enumerator = ArrayEx.GetEnumerator(subtree.XamlNode.FindElementsInHostCoordinates(intersectingPoint));
            while (enumerator.MoveNext()) {
                uies.push((<UINode>enumerator.Current).XObject);
            }
            return uies;
        }
        static __Debug(ui, func?: (uin: UINode, tabIndex: number) => string): string {
            var uin: UINode;
            if (ui instanceof UIElement) {
                uin = (<UIElement>ui).XamlNode;
            } else if (ui instanceof UINode) {
                uin = <UINode>ui;
            } else if (ui) {
                return "[Object is not a UIElement.]";
            }
            var topNode: UINode;
            if (!uin) {
                var rv = App.Instance.RootVisual;
                topNode = (rv) ? rv.XamlNode : null;
            } else {
                topNode = uin.GetVisualRoot();
            }
            if (!topNode)
                return "[No top node.]";
            if (!func)
                func = __DebugUIElement;
            return __DebugTree(topNode, uin, 1, func);
        }
        private static __DebugTree(curNode: UINode, matchNode: UINode, tabIndex: number, func: (uin: UINode, tabIndex: number) => string) {
            var str = "";
            if (curNode === matchNode) {
                for (var i = 0; i < tabIndex; i++) {
                    str += ">>>>>>>>";
                }
            } else {
                for (var i = 0; i < tabIndex; i++) {
                    str += "\t";
                }
            }
            var cur = curNode.XObject;
            str += (<any>cur).constructor._TypeName;
            var name = curNode.Name;
            if (name)
                str += " [" + name + "]";
            if (func)
                str += func(curNode, tabIndex);
            str += "\n";
            var enumerator = curNode.GetVisualTreeEnumerator();
            if (!enumerator) 
                return str;
            var childNode: UINode;
            while (enumerator.MoveNext()) {
                childNode = enumerator.Current;
                str += __DebugTree(childNode, matchNode, tabIndex + 1, func);
            }
            return str;
        }
        private static __DebugUIElement(uin: UINode, tabIndex: number): string {
            if (!uin)
                return "";
            var uie = uin.XObject;
            var str = "(";
            if (uie.Visibility === Fayde.Visibility.Visible)
                str += "Visible";
            else
                str += "Collapsed";
            var lu = uin.LayoutUpdater;
            if (lu) {
                str += " ";
                var p = lu.VisualOffset;
                if (p)
                    str += p.toString();
                var s = size.fromRaw(lu.ActualWidth, lu.ActualHeight);
                str += " ";
                str += s.toString();
            }
            str += ")";
            var gridStr = __DebugGrid(uin, tabIndex);
            if (gridStr)
                str += "\n" + gridStr;
            return str;
        }
        private static __DebugGrid(uin: UINode, tabIndex: number): string {
            var grid: Controls.Grid;
            if (uin instanceof Controls.GridNode)
                grid = <Controls.Grid>uin.XObject;
            if (!grid)
                return "";
            var rds = grid.RowDefinitions;
            var rcount = rds.Count;
            var cds = grid.ColumnDefinitions;
            var ccount = cds.Count;
            var tabs = "";
            for (var i = 0; i < tabIndex; i++) {
                tabs += "\t";
            }
            var enumerator: IEnumerator;
            var str = "";
            if (rcount > 0) {
                str += tabs;
                str += "  Rows (" + rcount + "):\n";
                enumerator = rds.GetEnumerator();
                var rowdef: Controls.RowDefinition;
                while (enumerator.MoveNext()) {
                    rowdef = enumerator.Current;
                    str += tabs;
                    str += "\t[" + i + "] -> " + rowdef.ActualHeight + "\n";
                }
            }
            if (ccount > 0) {
                str += tabs;
                str += "  Columns (" + ccount + "):\n";
                enumerator = cds.GetEnumerator();
                var coldef: Controls.ColumnDefinition;
                while (enumerator.MoveNext()) {
                    coldef = enumerator.Current;
                    str += tabs;
                    str += "\t[" + i + "] -> " + coldef.ActualWidth + "\n";
                }
            }
            return str;
        }
    }
}

module Fayde {
    export interface IWalker {
        Step(): any;
    }
    export interface IStyleWalker extends IWalker {
        Step(): Setter;
    }
    export interface IDeepTreeWalker extends IWalker {
        Step(): UINode;
        SkipBranch();
    }
    export interface ITabNavigationWalker {
        FocusChild(): bool;
    }
    function setterSort(setter1: Setter, setter2: Setter) {
        var a = setter1.Property;
        var b = setter2.Property;
        return (a === b) ? 0 : ((a._ID > b._ID) ? 1 : -1);
    }
    function mergeSetters(arr: any[], dps: any[], style: Style) {
        var enumerator = style.Setters.GetEnumerator(true);
        var setter: Setter;
        while (enumerator.MoveNext()) {
            setter = <Setter>enumerator.Current;
            if (!(setter instanceof Fayde.Setter))
                continue;
            var propd = setter.Property;
            if (!propd)
                continue;
            if (dps[propd._ID])
                continue;
            dps[propd._ID] = setter;
            arr.push(setter);
        }
    }
    export function SingleStyleWalker(style: Style): IStyleWalker {
        var dps = [];
        var flattenedSetters = [];
        var cur = style;
        while (cur) {
            mergeSetters(flattenedSetters, dps, cur);
            cur = cur.BasedOn;
        }
        flattenedSetters.sort(setterSort);
        return {
            Step: function () {
                return flattenedSetters.shift();
            }
        };
    }
    export function MultipleStylesWalker(styles: Style[]): IStyleWalker {
        var flattenedSetters = [];
        if (styles) {
            var dps = [];
            var stylesSeen = [];
            var len = styles.length;
            for (var i = 0; i < len; i++) {
                var style = styles[i];
                while (style) {
                    if (stylesSeen.indexOf(style) > -1)
                        continue;
                    mergeSetters(flattenedSetters, dps, style);
                    stylesSeen.push(style);
                    style = style.BasedOn;
                }
            }
            flattenedSetters.sort(setterSort);
        }
        return {
            Step: function () {
                return flattenedSetters.shift();
            }
        };
    }
    export function DeepTreeWalker(topNode: UINode, direction?: VisualTreeDirection): IDeepTreeWalker {
        var last: UINode = undefined;
        var dir = VisualTreeDirection.Logical;
        var walkList: UINode[] = [topNode];
        if (direction)
            dir = direction;
        return {
            Step: function () {
                if (last) {
                    var enumerator = last.GetVisualTreeEnumerator(dir);
                    var insertIndex = 0;
                    while (enumerator.MoveNext()) {
                        walkList.splice(insertIndex, 0, enumerator.Current);
                        insertIndex++;
                    }
                }
                var next = walkList.shift();
                if (!next) {
                    last = undefined;
                    return;
                }
                return (last = next);
            },
            SkipBranch: function () {
                last = undefined;
            }
        };
    }
    function compare(left: Controls.ControlNode, right: Controls.ControlNode) {
        if (!left)
            return !right ? 0 : -1;
        if (!right)
            return 1;
        var v1 = left.XObject.TabIndex;
        var v2 = right.XObject.TabIndex;
        if (v1 == null) {
            return v2 != null ? -1 : 0;
        } else if (v2 == null) {
            return 1;
        }
        if (v1 > v2)
            return 1;
        return v1 === v2 ? 0 : -1;
    }
    function getParentNavigationMode(uin: UINode): Input.KeyboardNavigationMode {
        while (uin) {
            if (uin instanceof Controls.ControlNode)
                return (<Controls.ControlNode>uin).XObject.TabNavigation;
            return Input.KeyboardNavigationMode.Local;
        }
        return Input.KeyboardNavigationMode.Local;
    }
    function getActiveNavigationMode(uin: UINode): Input.KeyboardNavigationMode {
        while (uin) {
            if (uin instanceof Controls.ControlNode)
                return (<Controls.ControlNode>uin).XObject.TabNavigation;
            uin = uin.VisualParentNode;
        }
        return Input.KeyboardNavigationMode.Local;
    }
    function walkChildren(root: UINode, cur?: UINode, forwards?: bool) {
        var walker = new TabNavigationWalker(root, cur, forwards);
        return walker.FocusChild();
    }
    export class TabNavigationWalker implements ITabNavigationWalker {
        private _Root: UINode;
        private _Current: UINode;
        private _Forwards: bool;
        private _TabSorted: UINode[];
        constructor(root: UINode, cur: UINode, forwards: bool) {
            this._Root = root;
            this._Current = cur;
            this._Forwards = forwards;
            this._TabSorted = [];
        }
        FocusChild(): bool {
            var childNode: UINode;
            var childIsControl;
            var curIndex = -1;
            var childWalker = DeepTreeWalker(this._Root);
            while (childNode = childWalker.Step()) {
                if (childNode === this._Root || !(childNode instanceof Controls.ControlNode))
                    continue;
                this._TabSorted.push(childNode);
                childWalker.SkipBranch();
            }
            if (this._TabSorted.length > 1) {
                this._TabSorted.sort(compare);
                if (!this._Forwards)
                    this._TabSorted = this._TabSorted.reverse();
            }
            var len = this._TabSorted.length;
            for (var i = 0; i < len; i++) {
                if (this._TabSorted[i] === this._Current)
                    curIndex = i;
            }
            if (curIndex !== -1 && getActiveNavigationMode(this._Root) === Input.KeyboardNavigationMode.Once) {
                if (!this._Forwards && this._Root instanceof Controls.ControlNode)
                    return (<Controls.ControlNode>this._Root).TabTo();
                return false;
            }
            var len = this._TabSorted.length;
            if (len > 0) {
                for (var j = 0; j < len; j++) {
                    if ((j + curIndex + 1) === len && getActiveNavigationMode(this._Root) !== Input.KeyboardNavigationMode.Cycle)
                        break;
                    childNode = this._TabSorted[(j + curIndex + 1) % len];
                    childIsControl = childNode instanceof Controls.ControlNode;
                    if (childIsControl && !(<Controls.ControlNode>childNode).XObject.IsEnabled)
                        continue;
                    if (!this._Forwards && walkChildren(childNode))
                        return true;
                    if (childIsControl && (<Controls.ControlNode>childNode).TabTo())
                        return true;
                    if (this._Forwards && walkChildren(childNode))
                        return true;
                }
            }
            if (curIndex !== -1 && !this._Forwards) {
                if (this._Root instanceof Controls.ControlNode)
                    return (<Controls.ControlNode>this._Root).TabTo();
            }
            return false;
        }
        static Focus(uin: UINode, forwards?: bool): bool {
            var focused = false;
            var cur = uin;
            var root = uin;
            if ((root.VisualParentNode && getParentNavigationMode(root.VisualParentNode) === Input.KeyboardNavigationMode.Once)
                || (!forwards && root && root.VisualParentNode)) {
                while (root = root.VisualParentNode)
                    if (root instanceof Controls.ControlNode || !root.VisualParentNode)
                        break;
            }
            do {
                focused = focused || walkChildren(root, cur, forwards);
                if (!focused && getActiveNavigationMode(root) === Input.KeyboardNavigationMode.Cycle)
                    return true;
                cur = root;
                root = root.VisualParentNode;
                while (root && !(root instanceof Controls.ControlNode) && root.VisualParentNode)
                    root = root.VisualParentNode
            } while (!focused && root);
            if (!focused)
                focused = focused || walkChildren(cur, null, forwards);
            return focused;
        }
    }
}

module Fayde.Providers {
    export enum _PropertyPrecedence {
        IsEnabled = 0,
        LocalValue = 1,
        DynamicValue = 2,
        LocalStyle = 3,
        ImplicitStyle = 4,
        Inherited = 5,
        InheritedDataContext = 6,
        DefaultValue = 7,
        AutoCreate = 8,
        Lowest = 8,
        Highest = 0,
        Count = 9,
    }
    export enum _StyleIndex {
        VisualTree = 0,
        ApplicationResources = 1,
        GenericXaml = 2,
        Count = 3,
    }
    export enum _StyleMask {
        None = 0,
        VisualTree = 1 << _StyleIndex.VisualTree,
        ApplicationResources = 1 << _StyleIndex.ApplicationResources,
        GenericXaml = 1 << _StyleIndex.GenericXaml,
        All = _StyleMask.VisualTree | _StyleMask.ApplicationResources | _StyleMask.GenericXaml,
    }
    export enum _Inheritable {
        Foreground = 1 << 0,
        FontFamily = 1 << 1,
        FontStretch = 1 << 2,
        FontStyle = 1 << 3,
        FontWeight = 1 << 4,
        FontSize = 1 << 5,
        Language = 1 << 6,
        FlowDirection = 1 << 7,
        UseLayoutRounding = 1 << 8,
        TextDecorations = 1 << 9,
        All = 0x7ff,
        None = 0,
    }
}

module Fayde.Providers {
    export interface IPropertyProvider {
        GetPropertyValue(store: IProviderStore, propd: DependencyProperty): any;
    }
    export interface IPropertyChangedListener {
        Property: DependencyProperty;
        OnPropertyChanged(sender: DependencyObject, args: IDependencyPropertyChangedEventArgs);
        Detach();
    }
    export interface IProviderStore {
        GetValue(propd: DependencyProperty): any;
        GetValueSpec(propd: DependencyProperty, startingPrecedence?, endingPrecedence?): any;
        SetValue(propd: DependencyProperty, value: any);
        ClearValue(propd: DependencyProperty, notifyListeners?: bool);
        ReadLocalValue(propd: DependencyProperty): any;
        _Object: DependencyObject;
        _ProviderValueChanged(providerPrecedence: number, propd: DependencyProperty, oldProviderValue: any, newProviderValue: any, notifyListeners: bool, error: BError);
    }
}

module Fayde.Data {
    export enum RelativeSourceMode {
        TemplatedParent = 1,
        Self = 2,
        FindAncestor = 3,
    }
    export enum BindingMode {
        TwoWay = 0,
        OneWay = 1,
        OneTime = 2,
        OneWayToSource = 3,
    }
    export enum UpdateSourceTrigger {
        Default = 0,
        PropertyChanged = 1,
        Explicit = 3,
    }
    export enum _PropertyNodeType {
        AttachedProperty = 0,
        Property = 1,
        Indexed = 2,
        None = 3,
    }
}

module Fayde.Data {
    export interface IPropertyPathParserData {
        typeName: string;
        propertyName: string;
        index: number;
    }
    export enum PropertyNodeType {
        None = 0,
        AttachedProperty = 1,
        Indexed = 2,
        Property = 3,
    }
    export class PropertyPathParser {
        Path: string;
        constructor(path: string) {
            this.Path = path;
        }
        Step(data: IPropertyPathParserData): PropertyNodeType {
            var type = PropertyNodeType.None;
            var path = this.Path;
            if (path.length === 0) {
                data.typeName = null;
                data.propertyName = null;
                data.index = null;
                return type;
            }
            var end: number = 0;
            if (path.charAt(0) === '(') {
                type = PropertyNodeType.AttachedProperty;
                end = path.indexOf(')');
                if (end === -1)
                    throw new ArgumentException("Invalid property path. Attached property is missing the closing bracket");
                var tickOpen = path.indexOf('\'');
                var tickClose = 0;
                var typeOpen: number;
                var typeClose: number;
                var propOpen: number;
                var propClose: number;
                typeOpen = path.indexOf('\'');
                if (typeOpen > 0) {
                    typeOpen++;
                    typeClose = path.indexOf('\'', typeOpen + 1);
                    if (typeClose < 0)
                        throw new Exception("Invalid property path, Unclosed type name '" + path + "'.");
                    propOpen = path.indexOf('.', typeClose);
                    if (propOpen < 0)
                        throw new Exception("Invalid properth path, No property indexer found '" + path + "'.");
                    propOpen++;
                } else {
                    typeOpen = 1;
                    typeClose = path.indexOf('.', typeOpen);
                    if (typeClose < 0)
                        throw new Exception("Invalid property path, No property indexer found on '" + path + "'.");
                    propOpen = typeClose + 1;
                }
                propClose = end;
                data.typeName = path.slice(typeOpen, typeClose);
                data.propertyName = path.slice(propOpen, propClose);
                data.index = null;
                if (path.length > (end + 1) && path.charAt(end + 1) === '.')
                    end++;
                path = path.substr(end + 1);
            } else if (path.charAt(0) === '[') {
                type = PropertyNodeType.Indexed;
                end = path.indexOf(']');
                data.typeName = null;
                data.propertyName = null;
                data.index = parseInt(path.substr(1, end - 1));
                path = path.substr(end + 1);
                if (path.charAt(0) === '.')
                    path = path.substr(1);
            } else {
                type = PropertyNodeType.Property;
                end = indexOfAny(path, ['.', '[']);
                if (end === -1) {
                    data.propertyName = path;
                    path = "";
                } else {
                    data.propertyName = path.substr(0, end);
                    if (path.charAt(end) === '.')
                        path = path.substr(end + 1);
                    else
                        path = path.substr(end);
                }
                data.typeName = null;
                data.index = null;
            }
            this.Path = path;
            return type;
        }
    }
    function indexOfAny(str: string, carr: string[], start?: number): number {
        if (!carr)
            return -1;
        if (!start) start = 0;
        for (var cur = start; cur < str.length; cur++) {
            var c = str.charAt(cur);
            for (var i = 0; i < carr.length; i++) {
                if (c === carr[i])
                    return cur;
            }
        }
        return -1;
    }
}

module Fayde.Data {
    declare var AbstractMethod;
    export interface IPropertyPathWalkerListener {
        IsBrokenChanged();
        ValueChanged();
    }
    export interface IPropertyPathNode {
        Next: IPropertyPathNode;
        Value: any;
        IsBroken: bool;
        ValueType: Function;
        SetSource(source: any);
        SetValue(value: any);
        Listen(listener: IPropertyPathNodeListener);
        Unlisten(listener: IPropertyPathNodeListener);
    }
    export interface ICollectionViewNode extends IPropertyPathNode {
        BindToView: bool;
    }
    export interface IPropertyPathNodeListener {
        IsBrokenChanged(node: IPropertyPathNode);
        ValueChanged(node: IPropertyPathNode);
    }
    export class PropertyPathWalker implements IPropertyPathNodeListener {
        Path: string;
        IsDataContextBound: bool;
        Source: any;
        ValueInternal: any;
        Node: IPropertyPathNode;
        FinalNode: IPropertyPathNode;
        private _Listener: IPropertyPathWalkerListener;
        private _Value: any;
        get Value(): any { return this._Value; }
        get IsPathBroken(): bool {
            var path = this.Path;
            if (this.IsDataContextBound && (!path || path.length < 1))
                return false;
            var node = this.Node;
            while (node) {
                if (node.IsBroken)
                    return true;
                node = node.Next;
            }
            return false;
        }
        constructor(path: string, bindDirectlyToSource?: bool, bindsToView?: bool, isDataContextBound?: bool) {
            bindDirectlyToSource = bindDirectlyToSource !== false;
            bindsToView = bindsToView === true;
            this.IsDataContextBound = isDataContextBound === true;
            this.Path = path;
            this.IsDataContextBound = isDataContextBound;
            var lastCVNode: ICollectionViewNode = null;
            if (!path || path === ".") {
                lastCVNode = createCollectionViewNode(bindDirectlyToSource, bindsToView);
                this.Node = lastCVNode;
                this.FinalNode = lastCVNode;
            } else {
                var data: IPropertyPathParserData = {
                    typeName: undefined,
                    propertyName: undefined,
                    index: undefined
                };
                var type: PropertyNodeType;
                var parser = new PropertyPathParser(path);
                while ((type = parser.Step(data)) !== PropertyNodeType.None) {
                    var isViewProperty = false;
                    var node = createCollectionViewNode(bindDirectlyToSource, isViewProperty);
                    lastCVNode = node;
                    switch (type) {
                        case PropertyNodeType.AttachedProperty:
                        case PropertyNodeType.Property:
                            node.Next = createStandardNode(data.typeName, data.propertyName);
                            break;
                        case PropertyNodeType.Indexed:
                            node.Next = createIndexedNode(data.index);
                            break
                        default:
                            break;
                    }
                    if (this.FinalNode)
                        this.FinalNode.Next = node;
                    else
                        this.Node = node;
                    this.FinalNode = node.Next;
                }
            }
            lastCVNode.BindToView = lastCVNode.BindToView || bindsToView;
            this.FinalNode.Listen(this);
        }
        GetValue(item: any) {
            this.Update(item);
            var o = this.FinalNode.Value;
            this.Update(null);
            return o;
        }
        Update(source: any) {
            this.Source = source;
            this.Node.SetSource(source);
        }
        Listen(listener: IPropertyPathWalkerListener) { this._Listener = listener; }
        Unlisten(listener: IPropertyPathWalkerListener) { if (this._Listener === listener) this._Listener = null; }
        IsBrokenChanged(node: IPropertyPathNode) {
            this.ValueInternal = node.Value;
            var listener = this._Listener;
            if (listener) listener.IsBrokenChanged();
        }
        ValueChanged(node: IPropertyPathNode) {
            this.ValueInternal = node.Value;
            var listener = this._Listener;
            if (listener) listener.ValueChanged();
        }
    }
    class PropertyPathNode implements IPropertyPathNode {
        Next: IPropertyPathNode;
        private _IsBroken: bool;
        private _Source: any;
        private _Value: any;
        DependencyProperty: DependencyProperty;
        PropertyInfo: IPropertyInfo;
        Listener: any;
        private _NodeListener: IPropertyPathNodeListener;
        ValueType: Function;
        get IsBroken(): bool { return this._IsBroken; }
        get Source(): any { return this._Source; }
        get Value(): any { return this._Value; }
        Listen(listener: IPropertyPathNodeListener) { this._NodeListener = listener; }
        Unlisten(listener: IPropertyPathNodeListener) { if (this._NodeListener === listener) this._NodeListener = null; }
        OnSourceChanged(oldSource, newSource) { }
        OnSourcePropertyChanged(o, e) { }
        UpdateValue() { AbstractMethod("PropertyPathNode.UpdateValue"); }
        SetValue(value: any) { AbstractMethod("PropertyPathNode.SetValue"); }
        SetSource(value: any) {
            if (value == null || !Nullstone.Equals(value, this._Source)) {
                var oldSource = this._Source;
                if (oldSource)
                    (<INotifyPropertyChanged>oldSource).PropertyChanged.Unsubscribe(this.OnSourcePropertyChanged, this);
                this._Source = value;
                if (this._Source && Nullstone.ImplementsInterface(this._Source, INotifyPropertyChanged_)) {
                    (<INotifyPropertyChanged>this._Source).PropertyChanged.Subscribe(this.OnSourcePropertyChanged, this);
                }
                this.OnSourceChanged(oldSource, this._Source);
                this.UpdateValue();
                if (this.Next)
                    this.Next.SetSource(this._Value);
            }
        }
        UpdateValueAndIsBroken(newValue: any, isBroken: bool) {
            var emitBrokenChanged = this._IsBroken !== isBroken;
            var emitValueChanged = !Nullstone.Equals(this.Value, newValue);
            this._IsBroken = isBroken;
            this._Value = newValue;
            if (emitValueChanged) {
                var listener = this._NodeListener;
                if (listener) listener.ValueChanged(this);
            } else if (emitBrokenChanged) {
                var listener = this._NodeListener;
                if (listener) listener.IsBrokenChanged(this);
            }
        }
        _CheckIsBroken(): bool {
            return !this.Source || (!this.PropertyInfo && !this.DependencyProperty);
        }
    }
    function createStandardNode(typeName: string, propertyName: string): IPropertyPathNode {
        return new StandardPropertyPathNode(typeName, propertyName);
    }
    class StandardPropertyPathNode extends PropertyPathNode {
        private _STypeName: string;
        private _PropertyName: string;
        PropertyInfo: PropertyInfo;
        private _DPListener: Providers.IPropertyChangedListener;
        constructor(typeName: string, propertyName: string) {
            super();
            this._STypeName = typeName;
            this._PropertyName = propertyName;
        }
        SetValue(value: any) {
            if (this.DependencyProperty)
                this.Source.SetValue(this.DependencyProperty, value);
            else if (this.PropertyInfo)
                this.PropertyInfo.SetValue(this.Source, value);
        }
        UpdateValue() {
            if (this.DependencyProperty) {
                this.ValueType = this.DependencyProperty.GetTargetType();
                this.UpdateValueAndIsBroken(this.Source.$GetValue(this.DependencyProperty), this._CheckIsBroken());
            } else if (this.PropertyInfo) {
                this.ValueType = null;
                try {
                    this.UpdateValueAndIsBroken(this.PropertyInfo.GetValue(this.Source), this._CheckIsBroken());
                } catch (err) {
                    this.UpdateValueAndIsBroken(null, this._CheckIsBroken());
                }
            } else {
                this.ValueType = null;
                this.UpdateValueAndIsBroken(null, this._CheckIsBroken());
            }
        }
        OnSourceChanged(oldSource: any, newSource: any) {
            super.OnSourceChanged(oldSource, newSource);
            var oldDO: DependencyObject;
            var newDO: DependencyObject;
            if (oldSource instanceof DependencyObject) oldDO = <DependencyObject>oldSource;
            if (newSource instanceof DependencyObject) newDO = <DependencyObject>newSource;
            var listener = this._DPListener;
            if (listener) {
                listener.Detach();
                this._DPListener = listener = null;
            }
            this.DependencyProperty = null;
            this.PropertyInfo = null;
            if (!this.Source)
                return;
            if (newDO) {
                var propd = DependencyProperty.GetDependencyProperty(this.Source.constructor, this._PropertyName);
                if (propd) {
                    this.DependencyProperty = propd;
                    this._DPListener = listener = Fayde.ListenToPropertyChanged(newDO, propd, this.OnPropertyChanged, this);
                }
            }
            if (!this.DependencyProperty || !this.DependencyProperty._IsAttached) {
                this.PropertyInfo = PropertyInfo.Find(this.Source, this._PropertyName);
            }
        }
        OnPropertyChanged(sender, args: IDependencyPropertyChangedEventArgs) {
            try {
                this.UpdateValue();
                if (this.Next)
                    this.Next.SetSource(this.Value);
            } catch (err) {
            }
        }
        OnSourcePropertyChanged(sender, e) {
            if (e.PropertyName === this._PropertyName && this.PropertyInfo) {
                this.UpdateValue();
                var next = this.Next;
                if (next)
                    next.SetSource(this.Value);
            }
        }
    }
    function createCollectionViewNode(bindsDirectlyToSource: bool, bindsToView: bool): ICollectionViewNode {
        return new CollectionViewNode(bindsDirectlyToSource, bindsToView);
    }
    class CollectionViewNode extends PropertyPathNode implements ICollectionViewNode {
        BindsDirectlyToSource: bool;
        BindToView: bool;
        private _ViewPropertyListener: Providers.IPropertyChangedListener;
        private _View: ICollectionView;
        constructor(bindsDirectlyToSource: bool, bindToView: bool) {
            super();
            this.BindsDirectlyToSource = bindsDirectlyToSource === true;
            this.BindToView = bindToView === true;
        }
        OnSourceChanged(oldSource: any, newSource: any) {
            super.OnSourceChanged(oldSource, newSource);
            this.DisconnectViewHandlers();
            this.ConnectViewHandlers(newSource, newSource);
        }
        ViewChanged(sender, e) {
            this.DisconnectViewHandlers(true);
            this.ConnectViewHandlers(null, e.NewValue);
            this.ViewCurrentChanged(this, EventArgs.Empty);
        }
        ViewCurrentChanged(sender, e) {
            this.UpdateValue();
            if (this.Next)
                this.Next.SetSource(this.Value);
        }
        SetValue() {
            throw new NotSupportedException("SetValue");
        }
        UpdateValue() {
            if (this.BindsDirectlyToSource) {
                this.ValueType = this.Source == null ? null : this.Source.constructor;
                this.UpdateValueAndIsBroken(this.Source, this._CheckIsBroken());
            } else {
                var usableSource = this.Source;
                var view;
                if (this.Source instanceof CollectionViewSource) {
                    usableSource = null;
                    view = this.Source.View;
                } else if (Nullstone.ImplementsInterface(this.Source, ICollectionView_)) {
                    view = this.Source;
                }
                if (!view) {
                    this.ValueType = usableSource == null ? null : usableSource.constructor;
                    this.UpdateValueAndIsBroken(usableSource, this._CheckIsBroken());
                } else {
                    if (this.BindToView) {
                        this.ValueType = view.constructor;
                        this.UpdateValueAndIsBroken(view, this._CheckIsBroken());
                    } else {
                        this.ValueType = view.GetCurrentItem() == null ? null : view.GetCurrentItem().constructor;
                        this.UpdateValueAndIsBroken(view.GetCurrentItem(), this._CheckIsBroken());
                    }
                }
            }
        }
        _CheckIsBroken(): bool { return this.Source == null; }
        ConnectViewHandlers(source: CollectionViewSource, view: ICollectionView) {
            if (source instanceof CollectionViewSource) {
                this._ViewPropertyListener = Fayde.ListenToPropertyChanged(source, CollectionViewSource.ViewProperty, this.ViewChanged, this);
                view = source.View;
            }
            if (Nullstone.ImplementsInterface(view, ICollectionView_)) {
                this._View = view;
                this._View.CurrentChanged.Subscribe(this.ViewCurrentChanged, this);
            }
        }
        DisconnectViewHandlers(onlyView?: bool) {
            if (!onlyView)
                onlyView = false;
            if (this._ViewPropertyListener && !onlyView) {
                this._ViewPropertyListener.Detach();
                this._ViewPropertyListener = null;
            }
            if (this._View) {
                this._View.CurrentChanged.Unsubscribe(this.ViewCurrentChanged, this);
            }
        }
    }
    function createIndexedNode(index: number): IPropertyPathNode {
        return new IndexedPropertyPathNode(index);
    }
    class IndexedPropertyPathNode extends PropertyPathNode {
        private _Index: number;
        private _Source: any; //Defind in PropertyPathNode
        private _IsBroken: bool; //Defind in PropertyPathNode
        PropertyInfo: IndexedPropertyInfo;
        constructor(index: any) {
            super();
            this._IsBroken = false;
            var val = parseInt(index, 10);
            if (isNaN(val))
                this._Index = index;
            else
                this._Index = val;
        }
        get Index(): number { return this._Index; }
        UpdateValue() {
            if (this.PropertyInfo == null) {
                this._IsBroken = true;
                this.ValueType = null;
                this.UpdateValueAndIsBroken(null, this._IsBroken);
                return;
            }
            try {
                var newVal = this.PropertyInfo.GetValue(this.Source, this._Index);
                this._IsBroken = false;
                this.ValueType = this.PropertyInfo.PropertyType;
                this.UpdateValueAndIsBroken(newVal, this._IsBroken);
            } catch (err) {
                this._IsBroken = true;
                this.ValueType = null;
                this.UpdateValueAndIsBroken(null, this._IsBroken);
            }
        }
        SetValue(value: any) {
            if (this.PropertyInfo != null)
                this.PropertyInfo.SetValue(this.Source, this._Index, value);
        }
        _CheckIsBroken(): bool {
            return this._IsBroken || super._CheckIsBroken();
        }
        OnSourcePropertyChanged(o, e) {
            this.UpdateValue();
            if (this.Next != null)
                this.Next.SetSource(this.Value);
        }
        OnSourceChanged(oldSource: any, newSource: any) {
            super.OnSourceChanged(oldSource, newSource);
            if (this.Listener != null) {
                this.Listener.Detach();
                this.Listener = null;
            }
            if (Nullstone.ImplementsInterface(newSource, Collections.INotifyCollectionChanged_)) {
                (<Collections.INotifyCollectionChanged>newSource).CollectionChanged.Subscribe(this.CollectionChanged, this);
            }
            this._GetIndexer();
        }
        private _GetIndexer() {
            this.PropertyInfo = null;
            if (this._Source != null) {
                this.PropertyInfo = IndexedPropertyInfo.Find(this._Source);
            }
        }
        CollectionChanged(o, e) {
            this.UpdateValue();
            if (this.Next != null)
                this.Next.SetSource(this.Value);
        }
    }
}

enum _Dirty {
    Transform = 1 << 0,
    LocalTransform = 1 << 1,
    LocalProjection = 1 << 2,
    Clip = 1 << 3,
    LocalClip = 1 << 4,
    RenderVisibility = 1 << 5,
    HitTestVisibility = 1 << 6,
    Measure = 1 << 7,
    Arrange = 1 << 8,
    ChildrenZIndices = 1 << 9,
    Bounds = 1 << 20,
    NewBounds = 1 << 21,
    Invalidate = 1 << 22,
    InUpDirtyList = 1 << 30,
    InDownDirtyList = 1 << 31,
    DownDirtyState = Transform | LocalTransform | LocalProjection 
        | Clip | LocalClip | RenderVisibility | HitTestVisibility | ChildrenZIndices,
    UpDirtyState = Bounds | Invalidate,
}

module Fayde {
    export interface IRenderContext {
    }
    export interface IStoryboard {
        Update(nowTime: number);
    }
}

module Fayde {
    export class XamlResolver {
        private _IsXamlLoaded: bool = false;
        private _IsScriptLoaded: bool = false;
        private _BaseHref: string = null;
        private _ScriptResult: HTMLScriptElement = null;
        private _XamlResult: AjaxJsonResult = null;
        constructor(public OnSuccess: (xamlResult: AjaxJsonResult, scriptResult: HTMLScriptElement) => void , public OnSubSuccess, public OnError: (error: string) => void ) {
        }
        Load(href: string, hash: string) {
            this._BaseHref = href;
            var xamlRequest = new AjaxJsonRequest((result) => this._HandleXamlSuccess(result), (error) => this._HandleXamlFailed(error));
            xamlRequest.Get(href, "p=" + hash);
            Nullstone.ImportJsFile(href + "?js=true&p=" + hash, (script) => this._HandleScriptSuccess(script));
        }
        LoadGeneric(href: string, hash: string) {
            this._BaseHref = href;
            var xamlRequest = new AjaxJsonRequest((result) => this._HandleXamlSuccess(result), (error) => this._HandleXamlFailed(error));
            xamlRequest.Get(href, hash);
            Nullstone.ImportJsFile(href + "?js=true&" + hash, (script) => this._HandleScriptSuccess(script));
        }
        private _HandleScriptSuccess(script: HTMLScriptElement) {
            this._IsScriptLoaded = true;
            this._ScriptResult = script;
            this._CheckIfLoaded();
        }
        private _HandleXamlSuccess(result: AjaxJsonResult) {
            this._IsXamlLoaded = true;
            this._XamlResult = result;
            this._CheckIfLoaded();
        }
        private _HandleXamlFailed(error: string) {
            this.OnError(error);
        }
        private _CheckIfLoaded() {
            if (!this._IsXamlLoaded || !this._IsScriptLoaded)
                return;
            this.ResolveDependencies(
                () => this.OnSuccess(this._XamlResult, this._ScriptResult),
                (error) => this.OnError(error));
        }
        ResolveDependencies(onResolve: () => void , onFail: (error: string) => void ) {
            var dependencies = this._XamlResult.GetHeader("Dependencies");
            if (!dependencies) {
                onResolve();
                return;
            }
            var resolvers = dependencies.split("|");
            var len = resolvers.length;
            if (len < 1) {
                onResolve();
                return;
            }
            var completes = [];
            for (var i = 0; i < len; i++) {
                completes[i] = false;
            }
            function isFullyResolved(completedIndex) {
                completes[completedIndex] = true;
                for (var j = 0; j < len; j++) {
                    if (!completes[j])
                        return false;
                }
                return true;
            }
            for (var i = 0; i < len; i++) {
                resolve(this._BaseHref, resolvers[i], i, isFullyResolved, onResolve, this.OnSubSuccess, onFail);
            }
        }
    }
    function resolve(href: string, hash: string, index: number, isFullyResolved: (index: number) => bool, onSuccess: () => void , onSubSuccess: (xamlResult: AjaxJsonResult, scriptResult: HTMLScriptElement) => void , onFail: (error: string) => void ) {
        var os = (function () {
            return function (xamlResult: AjaxJsonResult, scriptResult: HTMLScriptElement) {
                if (onSubSuccess) onSubSuccess(xamlResult, scriptResult);
                if (isFullyResolved(index))
                    onSuccess();
            };
        })();
        var resolver = new XamlResolver(os, onSubSuccess, onFail);
        resolver.LoadGeneric(href, hash);
    }
}

module Fayde.Media {
    export enum BrushMappingMode {
        Absolute = 0,
        RelativeToBoundingBox = 1,
    }
    export enum GradientSpreadMethod {
        Pad = 0,
        Reflect = 1,
        Repeat = 2,
    }
    export enum Stretch {
        None = 0,
        Fill = 1,
        Uniform = 2,
        UniformToFill = 3,
    }
    export enum AlignmentX {
        Left = 0,
        Center = 1,
        Right = 2,
    }
    export enum AlignmentY {
        Top = 0,
        Center = 1,
        Bottom = 2,
    }
    export enum TextHintingMode {
        Fixed = 0,
        Animated = 1,
    }
}

module Fayde.Media {
    export interface ICoordinates {
        x: number;
        y: number;
    }
    export class GradientMetrics {
        static Calculate(dir: ICoordinates, first: ICoordinates, last: ICoordinates, bounds: rect) {
            if (dir.y === 0) {
                if (dir.x < 0)
                    W(dir, first, last, bounds);
                else
                    E(dir, first, last, bounds);
            } else if (dir.x === 0) {
                if (dir.y < 0)
                    N(dir, first, last, bounds);
                else
                    S(dir, first, last, bounds);
            } else if (dir.x < 0 && dir.y < 0) { // e\s
                NW(dir, first, last, bounds);
            } else if (dir.x < 0 && dir.y > 0) { // e/s
                SW(dir, first, last, bounds);
            } else if (dir.x > 0 && dir.y < 0) { // s/e
                NE(dir, first, last, bounds);
            } else if (dir.x > 0 && dir.y > 0) { // s\e
                SE(dir, first, last, bounds);
            }
        }
        private static E(dir: ICoordinates, first: ICoordinates, last: ICoordinates, bounds: rect) {
            var maxX = bounds.X + bounds.Width;
            while (first.x >= bounds.X)
                first.x -= dir.x;
            while (last.x <= maxX)
                last.x += dir.x;
        }
        private static W(dir: ICoordinates, first: ICoordinates, last: ICoordinates, bounds: rect) {
            var maxX = bounds.X + bounds.Width;
            while (first.x <= maxX)
                first.x -= dir.x;
            while (last.x >= bounds.X)
                last.x += dir.x;
        }
        private static S(dir: ICoordinates, first: ICoordinates, last: ICoordinates, bounds: rect) {
            var maxY = bounds.Y + bounds.Height;
            while (first.y >= bounds.Y)
                first.y -= dir.y;
            while (last.y <= maxY)
                last.y += dir.y;
        }
        private static N(dir: ICoordinates, first: ICoordinates, last: ICoordinates, bounds: rect) {
            var maxY = bounds.Y + bounds.Height;
            while (first.y <= maxY)
                first.y -= dir.y;
            while (last.y >= bounds.Y)
                last.y += dir.y;
        }
        private static NW(dir: ICoordinates, first: ICoordinates, last: ICoordinates, bounds: rect) {
            var maxX = bounds.X + bounds.Width;
            var maxY = bounds.Y + bounds.Height;
            while (first.x <= maxX && first.y <= maxY) {
                first.x -= dir.x;
                first.y -= dir.y;
            }
            while (last.x >= bounds.X && last.y >= bounds.Y) {
                last.x += dir.x;
                last.y += dir.y;
            }
        }
        private static SW(dir: ICoordinates, first: ICoordinates, last: ICoordinates, bounds: rect) {
            var maxX = bounds.X + bounds.Width;
            var maxY = bounds.Y + bounds.Height;
            while (first.x <= maxX && first.y >= bounds.Y) {
                first.x -= dir.x;
                first.y -= dir.y;
            }
            while (last.x >= bounds.X && last.y <= maxY) {
                last.x += dir.x;
                last.y += dir.y;
            }
        }
        private static NE(dir: ICoordinates, first: ICoordinates, last: ICoordinates, bounds: rect) {
            var maxX = bounds.X + bounds.Width;
            var maxY = bounds.Y + bounds.Height;
            while (first.x >= bounds.X && first.y <= maxY) {
                first.x -= dir.x;
                first.y -= dir.y;
            }
            while (last.x <= maxX && last.y >= bounds.Y) {
                last.x += dir.x;
                last.y += dir.y;
            }
        }
        private static SE(dir: ICoordinates, first: ICoordinates, last: ICoordinates, bounds: rect) {
            var maxX = bounds.X + bounds.Width;
            var maxY = bounds.Y + bounds.Height;
            while (first.x >= bounds.X && first.y >= bounds.Y) {
                first.x -= dir.x;
                first.y -= dir.y;
            }
            while (last.x <= maxX && last.y <= maxY) {
                last.x += dir.x;
                last.y += dir.y;
            }
        }
    }
}

module Fayde.Media {
    export function ParseGeometry(val: string): Geometry {
        return (new MediaParser(val)).ParseGeometryImpl();
    }
    export function ParseShapePoints(val: string): Point[] {
        return (new MediaParser(val)).ParseShapePoints();
    }
    class MediaParser {
        private str: string;
        private len: number;
        private index: number = 0;
        constructor(str: string) {
            this.str = str;
            this.len = str.length;
        }
        ParseGeometryImpl():Geometry {
            var cp = new Point();
            var cp1: Point, cp2: Point, cp3: Point;
            var start = new Point();
            var fillRule = Shapes.FillRule.EvenOdd;
            var cbz = false; // last figure is a cubic bezier curve
            var qbz = false; // last figure is a quadratic bezier curve
            var cbzp = new Point(); // points needed to create "smooth" beziers
            var qbzp = new Point(); // points needed to create "smooth" beziers
            var path = new Shapes.RawPath();
            while (this.index < this.len) {
                var c;
                while (this.index < this.len && (c = this.str.charAt(this.index)) === ' ') {
                    this.index++;
                }
                this.index++
                var relative = false;
                switch (c) {
                    case 'f':
                    case 'F':
                        c = this.str.charAt(this.index);
                        if (c === '0')
                            fillRule = Shapes.FillRule.EvenOdd;
                        else if (c === '1')
                            fillRule = Shapes.FillRule.NonZero;
                        else
                            return null;
                        this.index++
                        c = this.str.charAt(this.index);
                        break;
                    case 'm':
                        relative = true;
                    case 'M':
                        cp1 = this.ParsePoint();
                        if (cp1 == null)
                            break;
                        if (relative) {
                            cp1.X += cp.X;
                            cp1.Y += cp.Y;
                        }
                        path.Move(cp1.X, cp1.Y);
                        start.X = cp.X = cp1.X;
                        start.Y = cp.Y = cp1.Y;
                        this.Advance();
                        while (this.MorePointsAvailable()) {
                            if ((cp1 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp1.X += cp.X;
                                cp1.Y += cp.Y;
                            }
                            path.Line(cp1.X, cp1.Y);
                        }
                        cp.X = cp1.X;
                        cp.Y = cp1.Y;
                        cbz = qbz = false;
                        break;
                    case 'l':
                        relative = true;
                    case 'L':
                        while (this.MorePointsAvailable()) {
                            if ((cp1 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp1.X += cp.X;
                                cp1.Y += cp.Y;
                            }
                            path.Line(cp1.X, cp1.Y);
                            cp.X = cp1.X;
                            cp.Y = cp1.Y;
                            this.Advance();
                        }
                        cbz = qbz = false;
                        break;
                    case 'h':
                        relative = true;
                    case 'H':
                        var x = this.ParseDouble();
                        if (x == null)
                            break;
                        if (relative)
                            x += cp.X;
                        cp = new Point(x, cp.Y);
                        path.Line(cp.X, cp.Y);
                        cbz = qbz = false;
                        break;
                    case 'v':
                        relative = true;
                    case 'V':
                        var y = this.ParseDouble();
                        if (y == null)
                            break;
                        if (relative)
                            y += cp.Y;
                        cp = new Point(cp.X, y);
                        path.Line(cp.X, cp.Y);
                        cbz = qbz = false;
                        break;
                    case 'c':
                        relative = true;
                    case 'C':
                        while (this.MorePointsAvailable()) {
                            if ((cp1 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp1.X += cp.X;
                                cp1.Y += cp.Y;
                            }
                            this.Advance();
                            if ((cp2 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp2.X += cp.X;
                                cp2.Y += cp.Y;
                            }
                            this.Advance();
                            if ((cp3 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp3.X += cp.X;
                                cp3.Y += cp.Y;
                            }
                            this.Advance();
                            path.Bezier(cp1.X, cp1.Y, cp2.X, cp2.Y, cp3.X, cp3.Y);
                            cp1.X = cp3.X;
                            cp1.Y = cp3.Y;
                        }
                        cp.X = cp3.X;
                        cp.Y = cp3.Y;
                        cbz = true;
                        cbzp.X = cp2.X;
                        cbzp.Y = cp2.Y;
                        qbz = false;
                        break;
                    case 's':
                        relative = true;
                    case 'S':
                        while (this.MorePointsAvailable()) {
                            if ((cp2 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp2.X += cp.X;
                                cp2.Y += cp.Y;
                            }
                            this.Advance();
                            if ((cp3 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp3.X += cp.X;
                                cp3.Y += cp.Y;
                            }
                            if (cbz) {
                                cp1.X = 2 * cp.X - cbzp.X;
                                cp1.Y = 2 * cp.Y - cbzp.Y;
                            } else
                                cp1 = cp;
                            path.Bezier(cp1.X, cp1.Y, cp2.X, cp2.Y, cp3.X, cp3.Y);
                            cbz = true;
                            cbzp.X = cp2.X;
                            cbzp.Y = cp2.Y;
                            cp.X = cp3.X;
                            cp.Y = cp3.Y;
                            this.Advance();
                        }
                        qbz = false;
                        break;
                    case 'q':
                        relative = true;
                    case 'Q':
                        while (this.MorePointsAvailable()) {
                            if ((cp1 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp1.X += cp.X;
                                cp1.Y += cp.Y;
                            }
                            this.Advance();
                            if ((cp2 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp2.X += cp.X;
                                cp2.Y += cp.Y;
                            }
                            this.Advance();
                            path.Quadratic(cp1.X, cp1.Y, cp2.X, cp2.Y);
                            cp.X = cp2.X;
                            cp.Y = cp2.Y;
                        }
                        qbz = true;
                        qbzp.X = cp1.X;
                        qbzp.Y = cp1.Y;
                        cbz = false;
                        break;
                    case 't':
                        relative = true;
                    case 'T':
                        while (this.MorePointsAvailable()) {
                            if ((cp2 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp2.X += cp.X;
                                cp2.Y += cp.Y;
                            }
                            if (qbz) {
                                cp1.X = 2 * cp.X - qbzp.X;
                                cp1.Y = 2 * cp.Y - qbzp.Y;
                            } else
                                cp1 = cp;
                            path.Quadratic(cp1.X, cp1.Y, cp2.X, cp2.Y);
                            qbz = true;
                            qbzp.X = cp1.X;
                            qbzp.Y = cp1.Y;
                            cp.X = cp2.X;
                            cp.Y = cp2.Y;
                            this.Advance();
                        }
                        cbz = false;
                        break;
                    case 'a':
                        relative = true;
                    case 'A':
                        while (this.MorePointsAvailable()) {
                            if ((cp1 = this.ParsePoint()) == null)
                                break;
                            var angle = this.ParseDouble();
                            var is_large = this.ParseDouble() !== 0;
                            var sweep = this.ParseDouble() !== 0;
                            if ((cp2 = this.ParsePoint()) == null)
                                break;
                            if (relative) {
                                cp2.X += cp.X;
                                cp2.Y += cp.Y;
                            }
                            path.EllipticalArc(cp1.X, cp1.Y, angle, is_large, sweep, cp2.X, cp2.Y);
                            cp.X = cp2.X;
                            cp.Y = cp2.Y;
                            this.Advance();
                        }
                        cbz = qbz = false;
                        break;
                    case 'z':
                    case 'Z':
                        path.Close();
                        cp.X = start.X;
                        cp.Y = start.Y;
                        cbz = qbz = false;
                        break;
                    default:
                        break;
                }
            }
            var pg = new PathGeometry();
            pg.SetPath(path);
            pg.FillRule = fillRule;
            return pg;
        }
        ParseShapePoints(): Point[] {
            var points: Point[] = [];
            var p: Point;
            while (this.MorePointsAvailable() && (p = this.ParsePoint()) != null) {
                points.push(p);
            }
            return points;
        }
        private ParsePoint(): Point {
            var x = this.ParseDouble();
            if (x == null)
                return null;
            var c;
            while (this.index < this.len && ((c = this.str.charAt(this.index)) === ' ' || c === ',')) {
                this.index++;
            }
            if (this.index >= this.len)
                return null;
            var y = this.ParseDouble();
            if (y == null)
                return null;
            return new Point(x, y);
        }
        private ParseDouble(): number {
            this.Advance();
            var isNegative = false;
            if (this.Match('-')) {
                isNegative = true;
                this.index++;
            } else if (this.Match('+')) {
                this.index++;
            }
            if (this.Match('Infinity')) {
                this.index += 8;
                return isNegative ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
            }
            if (this.Match('NaN'))
                return NaN;
            var temp = '';
            while (this.index < this.len) {
                var code = this.str.charCodeAt(this.index);
                var c = String.fromCharCode(code);
                if (code >= 48 && code <= 57)
                    temp += c;
                else if (code === 46)
                    temp += c;
                else if (c === 'E' || c === 'e')
                    temp += c;
                else
                    break;
                this.index++;
            }
            if (temp.length === 0)
                return null;
            var f = parseFloat(temp);
            return isNegative ? -f : f;
        }
        private Match(matchStr: string): bool {
            var c1: string;
            var c2: string;
            for (var i = 0; i < matchStr.length && (this.index + i) < this.len; i++) {
                c1 = matchStr.charAt(i);
                c2 = this.str.charAt(this.index + i);
                if (c1 !== c2)
                    return false;
            }
            return true;
        }
        private Advance() {
            var code: number;
            var c: string;
            while (this.index < this.len) {
                code = this.str.charCodeAt(this.index);
                if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57))
                    break;
                c = String.fromCharCode(code);
                if (c === '.')
                    break;
                if (c === '-')
                    break;
                if (c === '+')
                    break;
                this.index++;
            }
        }
        private MorePointsAvailable(): bool {
            var c;
            while (this.index < this.len && ((c = this.str.charAt(this.index)) === ',' || c === ' ')) {
                this.index++;
            }
            if (this.index >= this.len)
                return false;
            if (c === '.' || c === '-' || c === '+')
                return true;
            var code = this.str.charCodeAt(this.index);
            return code >= 48 && code <= 57;
        }
    }
}

module Fayde.Media.Animation {
    export interface ICurvePoint {
        x: number;
        y: number;
    }
    export interface IQuadraticCurve {
        c0: ICurvePoint;
        c1: ICurvePoint;
        c2: ICurvePoint;
    }
    export interface ICubicCurve {
        c0: ICurvePoint;
        c1: ICurvePoint;
        c2: ICurvePoint;
        c3: ICurvePoint;
    }
    export interface ISubdiviedCubicCurve {
        b1: ICubicCurve;
        b2: ICubicCurve;
    }
    export class Curves {
        static QuadraticArrayYForX(arr: IQuadraticCurve[], x: number, count: number): number {
            for (var i = 0; i < count; i++) {
                if (x < arr[i].c2.x)
                    return QuadraticYForX(x, arr[i]);
            }
            return 0.0;
        }
        static QuadraticYForX(x: number, src: IQuadraticCurve): number {
            var l = src.c2.x - src.c0.x;
            if (l <= 0)
                return 0.0;
            x = (x - src.c0.x) / l;
            return ((1 - x) * (1 - x)) * src.c0.y + ((2 * x) * (1 - x) * src.c1.y) + ((x * x) * src.c2.y);
        }
        static SubdivideCubicAtLevel(b: ICubicCurve[], lvl: number, src: ICubicCurve) {
            RecursiveSubdivide(b, lvl, 1, 0, src);
        }
        static RecursiveSubdivide(b: ICubicCurve[], lvl: number, currentlvl: number, pos: number, src: ICubicCurve) {
            var data: ISubdiviedCubicCurve = { b1: null, b2: null };
            SubdivideCubic(data, src);
            var b1 = data.b1;
            var b2 = data.b2;
            if (currentlvl === lvl) {
                b[pos] = b1;
                b[pos + 1] = b2;
                return pos + 2;
            }
            pos = Curves.RecursiveSubdivide(b, lvl, currentlvl + 1, pos, b1);
            pos = Curves.RecursiveSubdivide(b, lvl, currentlvl + 1, pos, b2);
            return pos;
        }
        static SubdivideCubic(data: ISubdiviedCubicCurve, src: ICubicCurve) {
            var p01 = { x: 0, y: 0 }, p012 = { x: 0, y: 0 }, p0123 = { x: 0, y: 0 };
            var p12 = { x: 0, y: 0 }, p123 = { x: 0, y: 0 };
            var p23 = { x: 0, y: 0 };
            Curves.HalfLerpPoint(p01, src.c0, src.c1);
            Curves.HalfLerpPoint(p12, src.c1, src.c2);
            Curves.HalfLerpPoint(p23, src.c2, src.c3);
            Curves.HalfLerpPoint(p012, p01, p12);
            Curves.HalfLerpPoint(p123, p12, p23);
            Curves.HalfLerpPoint(p0123, p012, p123);
            data.b1 = {
                c0: src.c0,
                c1: p01,
                c2: p012,
                c3: p0123
            };
            data.b2 = {
                c0: p0123,
                c1: p123,
                c2: p23,
                c3: src.c3
            };
        }
        static HalfLerpPoint(p: ICurvePoint, p1: ICurvePoint, p2: ICurvePoint) {
            p.x = p1.x + (p2.x - p1.x) * 0.5;
            p.y = p1.y + (p2.y - p1.y) * 0.5;
        }
        static ConvertCubicsToQuadratics(srcArray: ICubicCurve[], count: number): IQuadraticCurve[] {
            var destArray: IQuadraticCurve[] = [];
            for (var i = 0; i < count; i++) {
                destArray.push(QuadraticFromCubic(srcArray[i]));
            }
            return destArray;
        }
        static QuadraticFromCubic(src: ICubicCurve): IQuadraticCurve {
            return {
                c0: {
                    x: src.c0.x,
                    y: src.c0.y
                },
                c1: {
                    x: (src.c1.x + src.c2.x) / 2.0,
                    y: (src.c1.y + src.c2.y) / 2.0
                },
                c2: {
                    x: src.c3.x,
                    y: src.c3.y
                }
            };
        }
    }
}

module Fayde.Media.Animation {
    export enum EasingMode {
        EaseOut = 0,
        EaseIn = 1,
        EaseInOut = 2,
    }
    export enum FillBehavior {
        HoldEnd = 0,
        Stop = 1,
    }
}

module vec2 {
    interface IArray {
        new (length: number): number[];
    }
    var arrayType: IArray = (typeof Float32Array !== "undefined") ? <any>Float32Array : <any>Array;
    export function createFrom(x: number, y: number): number[] {
        var dest = new arrayType(2);
        dest[0] = x;
        dest[1] = y;
        return dest;
    }
}
module vec4 {
    interface IArray {
        new (length: number): number[];
    }
    var arrayType: IArray = (typeof Float32Array !== "undefined") ? <any>Float32Array : <any>Array;
    export function create(vec?: number[]): number[] {
        var dest = new arrayType(4);
        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
            dest[2] = vec[2];
            dest[3] = vec[3];
        } else {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;
        }
        return dest;
    }
    export function createFrom(x: number, y: number, z: number, w: number): number[] {
        var dest = new arrayType(4);
        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = w;
        return dest;
    }
}
module mat3 {
    interface IArray {
        new (length: number): number[];
    }
    var arrayType: IArray = (typeof Float32Array !== "undefined") ? <any>Float32Array : <any>Array;
    export function create(mat?: number[]): number[] {
        var dest = new arrayType(9);
        if (mat) {
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];
            dest[8] = mat[8];
        } else {
            dest[0] = dest[1] =
            dest[2] = dest[3] =
            dest[4] = dest[5] =
            dest[6] = dest[7] =
            dest[8] = 0;
        }
        return dest;
    }
    export function inverse(mat: number[], dest?: number[]): number[] {
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8],
            b01 = a22 * a11 - a12 * a21,
            b11 = -a22 * a10 + a12 * a20,
            b21 = a21 * a10 - a11 * a20,
            d = a00 * b01 + a01 * b11 + a02 * b21,
            id;
        if (!d) { return null; }
        id = 1 / d;
        if (!dest) { dest = create(); }
        dest[0] = b01 * id;
        dest[1] = (-a22 * a01 + a02 * a21) * id;
        dest[2] = (a12 * a01 - a02 * a11) * id;
        dest[3] = b11 * id;
        dest[4] = (a22 * a00 - a02 * a20) * id;
        dest[5] = (-a12 * a00 + a02 * a10) * id;
        dest[6] = b21 * id;
        dest[7] = (-a21 * a00 + a01 * a20) * id;
        dest[8] = (a11 * a00 - a01 * a10) * id;
        return dest;
    }
    export function multiply(mat: number[], mat2: number[], dest?: number[]): number[] {
        if (!dest) { dest = mat; }
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8],
            b00 = mat2[0], b01 = mat2[1], b02 = mat2[2],
            b10 = mat2[3], b11 = mat2[4], b12 = mat2[5],
            b20 = mat2[6], b21 = mat2[7], b22 = mat2[8];
        dest[0] = b00 * a00 + b01 * a10 + b02 * a20;
        dest[1] = b00 * a01 + b01 * a11 + b02 * a21;
        dest[2] = b00 * a02 + b01 * a12 + b02 * a22;
        dest[3] = b10 * a00 + b11 * a10 + b12 * a20;
        dest[4] = b10 * a01 + b11 * a11 + b12 * a21;
        dest[5] = b10 * a02 + b11 * a12 + b12 * a22;
        dest[6] = b20 * a00 + b21 * a10 + b22 * a20;
        dest[7] = b20 * a01 + b21 * a11 + b22 * a21;
        dest[8] = b20 * a02 + b21 * a12 + b22 * a22;
        return dest;
    }
    export function set (mat: number[], dest: number[]): number[] {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        return dest;
    }
    export function identity(dest?: number[]): number[] {
        if (!dest) { dest = mat3.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 1;
        dest[5] = 0;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 1;
        return dest;
    }
    export function str(mat: number[]): string {
        return "[" + mat[0] + ", " + mat[1] + ", " + mat[2] +
            ", " + mat[3] + ", " + mat[4] + ", " + mat[5] +
            ", " + mat[6] + ", " + mat[7] + ", " + mat[8] + "]";
    }
    export function clone(mat: number[]): number[] {
        if (typeof Float32Array !== "undefined")
            return <number[]><any>new Float32Array(mat);
        return mat.slice(0);
    }
    export function toAffineMat4(mat: number[], dest?: number[]): number[] {
        if (!dest) { dest = mat4.create(); }
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = 0;
        dest[3] = mat[2];
        dest[4] = mat[3];
        dest[5] = mat[4];
        dest[6] = 0;
        dest[7] = mat[5];
        dest[8] = 0;
        dest[9] = 0;
        dest[10] = 1;
        dest[11] = 0;
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;
        return dest;
    }
    export function transformVec2(mat: number[], vec: number[], dest?: number[]): number[] {
        if (!dest) dest = vec;
        var x = vec[0], y = vec[1];
        dest[0] = x * mat[0] + y * mat[3] + mat[2];
        dest[1] = x * mat[1] + y * mat[4] + mat[5];
        return dest;
    }
    export function translate(mat: number[], x: number, y: number): number[] {
        mat[2] += x;
        mat[5] += y;
        return mat;
    }
    export function createTranslate(x: number, y: number, dest?: number[]): number[] {
        if (!dest) { dest = mat3.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = x;
        dest[3] = 0;
        dest[4] = 1;
        dest[5] = y;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 1;
        return dest;
    }
    export function scale(mat: number[], x: number, y: number): number[] {
        mat[0] *= x;
        mat[1] *= x;
        mat[2] *= x;
        mat[3] *= y;
        mat[4] *= y;
        mat[5] *= y;
        return mat;
    }
    export function createScale(x: number, y: number, dest?: number[]): number[] {
        if (!dest) { dest = mat3.create(); }
        dest[0] = x;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = y;
        dest[5] = 0;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 1;
        return dest;
    }
    export function createRotate(angleRad: number, dest?: number[]): number[] {
        if (!dest) { dest = mat3.create(); }
        var c = Math.cos(angleRad);
        var s = Math.sin(angleRad);
        dest[0] = c;
        dest[1] = -s;
        dest[2] = 0;
        dest[3] = s;
        dest[4] = c;
        dest[5] = 0;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 1;
        return dest;
    }
    export function createSkew(angleRadX: number, angleRadY: number, dest?: number[]): number[] {
        if (!dest) { dest = mat3.create(); }
        dest[0] = 1;
        dest[1] = Math.tan(angleRadY);
        dest[2] = 0;
        dest[3] = Math.tan(angleRadX);
        dest[4] = 1;
        dest[5] = 0;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 1;
        return dest;
    }
}
module mat4 {
    interface IArray {
        new (length: number): number[];
    }
    var arrayType: IArray = (typeof Float32Array !== "undefined") ? <any>Float32Array : <any>Array;
    var FLOAT_EPSILON = 0.000001;
    export function create(mat?: number[]): number[] {
        var dest = new arrayType(16);
        if (mat) {
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];
            dest[8] = mat[8];
            dest[9] = mat[9];
            dest[10] = mat[10];
            dest[11] = mat[11];
            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }
        return dest;
    }
    export function set (mat: number[], dest: number[]): number[] {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        dest[9] = mat[9];
        dest[10] = mat[10];
        dest[11] = mat[11];
        dest[12] = mat[12];
        dest[13] = mat[13];
        dest[14] = mat[14];
        dest[15] = mat[15];
        return dest;
    }
    export function equal(a: number[], b: number[]): bool {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON &&
            Math.abs(a[4] - b[4]) < FLOAT_EPSILON &&
            Math.abs(a[5] - b[5]) < FLOAT_EPSILON &&
            Math.abs(a[6] - b[6]) < FLOAT_EPSILON &&
            Math.abs(a[7] - b[7]) < FLOAT_EPSILON &&
            Math.abs(a[8] - b[8]) < FLOAT_EPSILON &&
            Math.abs(a[9] - b[9]) < FLOAT_EPSILON &&
            Math.abs(a[10] - b[10]) < FLOAT_EPSILON &&
            Math.abs(a[11] - b[11]) < FLOAT_EPSILON &&
            Math.abs(a[12] - b[12]) < FLOAT_EPSILON &&
            Math.abs(a[13] - b[13]) < FLOAT_EPSILON &&
            Math.abs(a[14] - b[14]) < FLOAT_EPSILON &&
            Math.abs(a[15] - b[15]) < FLOAT_EPSILON
        );
    }
    export function identity(dest?: number[]): number[] {
        if (!dest) { dest = mat4.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = 1;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 0;
        dest[9] = 0;
        dest[10] = 1;
        dest[11] = 0;
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;
        return dest;
    }
    export function inverse(mat: number[], dest?: number[]): number[] {
        if (!dest) { dest = mat; }
        var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
            a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
            a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
            a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],
            b00 = a00 * a11 - a01 * a10,
            b01 = a00 * a12 - a02 * a10,
            b02 = a00 * a13 - a03 * a10,
            b03 = a01 * a12 - a02 * a11,
            b04 = a01 * a13 - a03 * a11,
            b05 = a02 * a13 - a03 * a12,
            b06 = a20 * a31 - a21 * a30,
            b07 = a20 * a32 - a22 * a30,
            b08 = a20 * a33 - a23 * a30,
            b09 = a21 * a32 - a22 * a31,
            b10 = a21 * a33 - a23 * a31,
            b11 = a22 * a33 - a23 * a32,
            d = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06),
            invDet;
        if (!d) { return null; }
        invDet = 1 / d;
        dest[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
        dest[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
        dest[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
        dest[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
        dest[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
        dest[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
        dest[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
        dest[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
        dest[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
        dest[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
        dest[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
        dest[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
        dest[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
        dest[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
        dest[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
        dest[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;
        return dest;
    }
    export function multiply(mat: number[], mat2: number[], dest?: number[]): number[] {
        if (!dest) { dest = mat; }
        var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
        var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
        var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
        var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];
        var b0 = mat2[0], b1 = mat2[1], b2 = mat2[2], b3 = mat2[3];
        dest[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        dest[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        dest[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        dest[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = mat2[4];
        b1 = mat2[5];
        b2 = mat2[6];
        b3 = mat2[7];
        dest[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        dest[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        dest[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        dest[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = mat2[8];
        b1 = mat2[9];
        b2 = mat2[10];
        b3 = mat2[11];
        dest[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        dest[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        dest[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        dest[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        b0 = mat2[12];
        b1 = mat2[13];
        b2 = mat2[14];
        b3 = mat2[15];
        dest[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
        dest[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
        dest[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
        dest[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
        return dest;
    }
    export function transformVec4(mat: number[], vec: number[], dest?: number[]): number[] {
        if (!dest) { dest = vec; }
        var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
        dest[0] = mat[0] * x + mat[1] * y + mat[2] * z + mat[3] * w;
        dest[1] = mat[4] * x + mat[5] * y + mat[6] * z + mat[7] * w;
        dest[2] = mat[8] * x + mat[9] * y + mat[10] * z + mat[11] * w;
        dest[3] = mat[12] * x + mat[13] * y + mat[14] * z + mat[15] * w;
        return dest;
    }
    export function createTranslate(x: number, y: number, z: number, dest?: number[]): number[] {
        if (!dest) { dest = mat4.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = 1;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 0;
        dest[9] = 0;
        dest[10] = 1;
        dest[11] = 0;
        dest[12] = x;
        dest[13] = y;
        dest[14] = z;
        dest[15] = 1;
        return dest;
    }
    export function toAffineMat3(mat: number[], dest?: number[]): number[] {
        if (!dest) { dest = mat3.create(); }
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[3];
        dest[3] = mat[4];
        dest[4] = mat[5];
        dest[5] = mat[7];
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 1;
        return dest;
    }
    export function clone(mat: number[]): number[] {
        if (typeof Float32Array !== "undefined")
            return <number[]><any>new Float32Array(mat);
        return mat.slice(0);
    }
}

module Fayde {
    export class AjaxJsonResult {
        private xmlhttp: XMLHttpRequest;
        constructor(xmlhttp: XMLHttpRequest) {
            this.xmlhttp = xmlhttp;
        }
        CreateJson(): any {
            var data = this.xmlhttp.responseText;
            if (!data)
                return null;
            if ((<any>window).JSON && JSON.parse) {
                try {
                    return JSON.parse(data);
                } catch (err) {
                }
            }
            try {
                return new Function("return " + data)();
            } catch (err) {
                throw new InvalidJsonException(data, err);
            }
        }
        GetHeader(name: string): string {
            return this.xmlhttp.getResponseHeader(name);
        }
    }
    export class AjaxJsonRequest {
        private xmlhttp: XMLHttpRequest = null;
        constructor(public OnSuccess: (result: AjaxJsonResult) => void, public OnError: (error: string) => void) { }
        Get(url: string, query?: string) {
            this._PrepareRequest();
            var fullUrl = url;
            if (query)
                fullUrl += "?" + query;
            this.xmlhttp.open("GET", fullUrl, true);
            this.xmlhttp.send();
        }
        Post(url: string, query: string, data: any) {
            this._PrepareRequest();
            var fullUrl: string = url;
            if (query)
                fullUrl += "?" + query;
            this.xmlhttp.open("POST", fullUrl, true);
            this.xmlhttp.send(data);
        }
        Cancel() {
            this.xmlhttp.abort();
        }
        private _PrepareRequest() {
            var xmlhttp: XMLHttpRequest = new XMLHttpRequest();
            xmlhttp.onreadystatechange = () => this._HandleStateChange();
            this.xmlhttp = xmlhttp;
        }
        private _HandleStateChange() {
            if (this.xmlhttp.readyState === 4) {
                var req = this.xmlhttp;
                this.xmlhttp = undefined;
                if (req.status === 200) {
                    this.OnSuccess(new AjaxJsonResult(req));
                } else {
                    this.OnError("Unsuccessful request: " + req.status);
                }
            }
        }
    }
}

interface IOutValue {
    Value: any;
}
interface ICloneable {
    Clone(): any;
}
interface IInterfaceDeclaration {
    Name: string;
}
class Nullstone {
    static RegisterType(type: Function, name: string, interfaces?: IInterfaceDeclaration[]) {
        var t: any = type;
        t._TypeName = name;
        t._BaseClass = Object.getPrototypeOf(type.prototype).constructor;
        t._Interfaces = interfaces;
    }
    static Equals(val1: any, val2: any): bool {
        if (val1 == null && val2 == null)
            return true;
        if (val1 == null || val2 == null)
            return false;
        if (val1 === val2)
            return true;
        if (val1.Equals)
            return val1.Equals(val2);
        return false;
    }
    static DoesInheritFrom(t: Function, type: Function): bool {
        var temp = t;
        while (temp && temp !== type) {
            temp = (<any>temp)._BaseClass;
        }
        return temp != null;
    }
    static GetPropertyDescriptor(obj: any, name: string): PropertyDescriptor {
        if (!obj)
            return;
        var type: Function = (<any>obj).constructor;
        var propDesc = Object.getOwnPropertyDescriptor(type.prototype, name);
        if (propDesc)
            return propDesc;
        return Object.getOwnPropertyDescriptor(obj, name);
    }
    static HasProperty(obj: any, name: string): bool {
        if (!obj)
            return false;
        if (obj.hasOwnProperty(name))
            return true;
        var type = obj.constructor;
        return type.prototype.hasOwnProperty(name);
    }
    static RegisterInterface(name: string): IInterfaceDeclaration {
        return { Name: name };
    }
    static ImplementsInterface(obj: any, i: IInterfaceDeclaration): bool {
        if (!obj)
            return false;
        var curType: any = obj.constructor;
        if (!curType)
            return false;
        var is: IInterfaceDeclaration[];
        do {
            is = curType._Interfaces;
            if (!is)
                continue;
            if (is.indexOf(i) > -1)
                return true;
        } while (curType = curType._BaseClass);
        return false;
    }
    static ImportJsFile(url: string, onComplete: (script: HTMLScriptElement) => void ) {
        var scripts = document.getElementsByTagName("script");
        var script: HTMLScriptElement = null;
        for (var i = 0; i < scripts.length; i++) {
            script = <HTMLScriptElement>scripts[i];
            if (script.src === url) {
                if (onComplete) onComplete(script);
                return;
            }
        }
        var script = <HTMLScriptElement>document.createElement("script");
        script.type = "text/javascript";
        script.src = url;
        script.onreadystatechange = function (e: Event) {
            if (this.readyState === "completed") {
                if (onComplete) onComplete(script);
                return;
            }
        };
        script.onload = function () { if (onComplete) onComplete(script); };
        var head = <HTMLHeadElement>document.getElementsByTagName("head")[0];
        head.appendChild(script);
    }
}

interface IPropertyInfo {
}
class PropertyInfo implements IPropertyInfo {
    GetFunc: () => any;
    SetFunc: (value: any) => any;
    GetValue(ro: any): any {
        if (this.GetFunc)
            return this.GetFunc.call(ro);
    }
    SetValue(ro: any, value: any) {
        if (this.SetFunc)
            this.SetFunc.call(ro, value);
    }
    static Find(typeOrObj, name: string): PropertyInfo {
        var o = typeOrObj;
        var isType = typeOrObj instanceof Function;
        if (isType)
            o = new typeOrObj();
        var nameClosure = name;
        var propDesc = Nullstone.GetPropertyDescriptor(o, name);
        if (propDesc) {
            var pi = new PropertyInfo();
            pi.GetFunc = propDesc.get;
            if (!pi.GetFunc)
                pi.GetFunc = function () { return this[nameClosure]; }
            pi.SetFunc = propDesc.set;
            if (!pi.SetFunc && propDesc.writable)
                pi.SetFunc = function (value) { this[nameClosure] = value; }
            return pi;
        }
        var type = isType ? typeOrObj : typeOrObj.constructor;
        var pi = new PropertyInfo();
        pi.GetFunc = type.prototype["Get" + name];
        pi.SetFunc = type.prototype["Set" + name];
        return pi;
    }
}
class IndexedPropertyInfo implements IPropertyInfo {
    GetFunc: (index: number) => any;
    SetFunc: (index: number, value: any) => any;
    get PropertyType(): Function {
        return undefined;
    }
    GetValue(ro: any, index: number): any {
        if (this.GetFunc)
            return this.GetFunc.call(ro, index);
    }
    SetValue(ro: any, index: number, value: any) {
        if (this.SetFunc)
            this.SetFunc.call(ro, index, value);
    }
    static Find(typeOrObj): IndexedPropertyInfo {
        var o = typeOrObj;
        var isType = typeOrObj instanceof Function;
        if (isType)
            o = new typeOrObj();
        if (o instanceof Array) {
            var pi = new IndexedPropertyInfo();
            pi.GetFunc = function (index) { return this[index]; };
            pi.SetFunc = function (index, value) { this[index] = value; };
            return pi;
        } else if (o instanceof Fayde.XamlObjectCollection) {
            var pi = new IndexedPropertyInfo();
            pi.GetFunc = function (index) { return this.GetValueAt(index); };
            pi.SetFunc = function (index, value) { return this.SetValueAt(index, value); };
            return pi;
        }
    }
}

class StringEx {
    static Format(format: string, ...items: any[]): string {
        var args = arguments;
        return format.replace(/{(\d+)}/g, function (match: string, num: string) {
            var i = parseInt(num);
            return typeof items[i] != 'undefined'
              ? items[i]
              : match;
        });
    }
}

module Fayde.Shapes {
    export enum PathEntryType {
        Move = 0,
        Line = 1,
        Rect = 2,
        Quadratic = 3,
        Bezier = 4,
        EllipticalArc = 5,
        Arc = 6,
        ArcTo = 7,
        Close = 8,
    }
    export enum ShapeFlags {
        None = 0,
        Empty = 1,
        Normal = 2,
        Degenerate = 4,
        Radii = 8,
    }
    export enum PenLineCap {
        Flat = 0,
        Square = 1,
        Round = 2,
        Triangle = 3,
    }
    export enum PenLineJoin {
        Miter = 0,
        Bevel = 1,
        Round = 2,
    }
    export enum FillRule {
        EvenOdd = 0,
        NonZero = 1,
    }
    export enum SweepDirection {
        Counterclockwise = 0,
        Clockwise = 1,
    }
}

module Fayde.Shapes {
    declare var NotImplemented;
    export interface IRange {
        min: number;
        max: number;
    }
    export interface IPointRange {
        xMin: number;
        xMax: number;
        yMin: number;
        yMax: number;
    }
    export interface IPathEntry {
        type: PathEntryType;
    }
    export class RawPath {
        private _Path: IPathEntry[] = [];
        Move(x: number, y: number) {
            this._Path.push({
                type: PathEntryType.Move,
                x: x,
                y: y
            });
        }
        Line(x: number, y: number) {
            this._Path.push({
                type: PathEntryType.Line,
                x: x,
                y: y
            });
        }
        Rect(x: number, y: number, width: number, height: number) {
            this._Path.push({
                type: PathEntryType.Rect,
                x: x,
                y: y,
                width: width,
                height: height
            });
        }
        RoundedRectFull(left: number, top: number, width: number, height: number, topLeft: number, topRight: number, bottomRight: number, bottomLeft: number) {
            var right = left + width;
            var bottom = top + height;
            this.Move(left + topLeft, top);
            this.Line(right - topRight, top);
            if (topRight > 0)
                this.Quadratic(right, top, right, top + topRight);
            this.Line(right, bottom - bottomRight);
            if (bottomRight > 0)
                this.Quadratic(right, bottom, right - bottomRight, bottom);
            this.Line(left + bottomLeft, bottom);
            if (bottomLeft > 0)
                this.Quadratic(left, bottom, left, bottom - bottomLeft);
            this.Line(left, top + topLeft);
            if (topLeft > 0)
                this.Quadratic(left, top, left + topLeft, top);
            this.Close();
        }
        RoundedRect(left: number, top: number, width: number, height: number, radiusX: number, radiusY: number) {
            if (radiusX === 0.0 && radiusY === 0.0) {
                this.Rect(left, top, width, height);
                return;
            }
            var right = left + width;
            var bottom = top + height;
            this.Move(left + radiusX, top);
            this.Line(right - radiusX, top);
            this.Quadratic(right, top, right, top + radiusY);
            this.Line(right, bottom - radiusY);
            this.Quadratic(right, bottom, right - radiusX, bottom);
            this.Line(left + radiusX, bottom);
            this.Quadratic(left, bottom, left, bottom - radiusY);
            this.Line(left, top + radiusY);
            this.Quadratic(left, top, left + radiusX, top);
            this.Close();
        }
        Quadratic(cpx: number, cpy: number, x: number, y: number) {
            this._Path.push({
                type: PathEntryType.Quadratic,
                cpx: cpx,
                cpy: cpy,
                x: x,
                y: y
            });
        }
        Bezier(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) {
            this._Path.push({
                type: PathEntryType.Bezier,
                cp1x: cp1x,
                cp1y: cp1y,
                cp2x: cp2x,
                cp2y: cp2y,
                x: x,
                y: y
            });
        }
        Ellipse(x: number, y: number, width: number, height: number) {
            var radiusX = width / 2;
            var radiusY = height / 2;
            var right = x + width;
            var bottom = y + height;
            var centerX = x + radiusX;
            var centerY = y + radiusY;
            if (width === height) { //circle
                this.Arc(centerX, centerY, radiusX, 0, Math.PI * 2, false);
            } else { //oval
                var kappa = .5522848; // 4 * ((sqrt(2) - 1) / 3)
                var ox = radiusX * kappa;
                var oy = radiusY * kappa;
                this.Move(x, centerY);
                this.Bezier(x, centerY - oy, centerX - ox, y, centerX, y);
                this.Bezier(centerX + ox, y, right, centerY - oy, right, centerY);
                this.Bezier(right, centerY + oy, centerX + ox, bottom, centerX, bottom);
                this.Bezier(centerX - ox, bottom, x, centerY + oy, x, centerY);
                this.Close();
            }
        }
        EllipticalArc(width: number, height: number, rotationAngle: number, isLargeArcFlag: bool, sweepDirectionFlag: bool, ex: number, ey: number) {
            this._Path.push({
                type: PathEntryType.EllipticalArc,
                width: width,
                height: height,
                rotationAngle: rotationAngle,
                isLargeArcFlag: isLargeArcFlag,
                sweepDirectionFlag: sweepDirectionFlag,
                ex: ex,
                ey: ey
            });
        }
        Arc(x: number, y: number, r: number, sAngle: number, eAngle: number, aClockwise: bool) {
            this._Path.push({
                type: PathEntryType.Arc,
                x: x,
                y: y,
                r: r,
                sAngle: sAngle,
                eAngle: eAngle,
                aClockwise: aClockwise
            });
        }
        ArcTo(cpx: number, cpy: number, x: number, y: number, radius: number) {
            this._Path.push({
                type: PathEntryType.ArcTo,
                cpx: cpx,
                cpy: cpy,
                x: x,
                y: y,
                r: radius
            });
        }
        Close() {
            this._Path.push({
                type: PathEntryType.Close
            });
        }
        DrawRenderCtx(ctx: RenderContext) {
            this.DrawCanvasCtx(ctx.CanvasContext);
        }
        DrawCanvasCtx(canvasCtx: CanvasRenderingContext2D) {
            canvasCtx.beginPath();
            var backing = this._Path;
            for (var i = 0; i < backing.length; i++) {
                var p: any = backing[i];
                switch (p.type) {
                    case PathEntryType.Move:
                        canvasCtx.moveTo(p.x, p.y);
                        break;
                    case PathEntryType.Line:
                        canvasCtx.lineTo(p.x, p.y);
                        break;
                    case PathEntryType.Rect:
                        canvasCtx.rect(p.x, p.y, p.width, p.height);
                        break;
                    case PathEntryType.Quadratic:
                        canvasCtx.quadraticCurveTo(p.cpx, p.cpy, p.x, p.y);
                        break;
                    case PathEntryType.Bezier:
                        canvasCtx.bezierCurveTo(p.cp1x, p.cp1y, p.cp2x, p.cp2y, p.x, p.y);
                        break;
                    case PathEntryType.Arc:
                        canvasCtx.arc(p.x, p.y, p.r, p.sAngle, p.eAngle, p.aClockwise);
                        break;
                    case PathEntryType.ArcTo:
                        canvasCtx.arcTo(p.cpx, p.cpy, p.x, p.y, p.r);
                        break;
                    case PathEntryType.Close:
                        canvasCtx.closePath();
                        break;
                }
            }
        }
        CalculateBounds(thickness: number): rect {
            var backing = this._Path;
            var startX: number = null;
            var startY: number = null;
            var xMin: number = null;
            var xMax: number = null;
            var yMin: number = null;
            var yMax: number = null;
            var xRange: IRange = null;
            var yRange: IRange = null;
            for (var i = 0; i < backing.length; i++) {
                var p: any = backing[i];
                switch (p.type) {
                    case PathEntryType.Move:
                        if (xMin == null && yMin == null) {
                            xMin = xMax = p.x;
                            yMin = yMax = p.y;
                        } else {
                            xMin = Math.min(p.x, xMin);
                            yMin = Math.min(p.y, yMin);
                            xMax = Math.max(p.x, xMax);
                            yMax = Math.max(p.y, yMax);
                        }
                        startX = p.x;
                        startY = p.y;
                        break;
                    case PathEntryType.Line:
                        xMin = Math.min(p.x, xMin);
                        yMin = Math.min(p.y, yMin);
                        xMax = Math.max(p.x, xMax);
                        yMax = Math.max(p.y, yMax);
                        startX = p.x;
                        startY = p.y;
                        break;
                    case PathEntryType.Rect: //does not use current x,y
                        xMin = Math.min(p.x, xMin);
                        yMin = Math.min(p.y, yMin);
                        xMax = Math.max(p.x + p.width, xMax);
                        yMax = Math.max(p.y + p.height, yMax);
                        break;
                    case PathEntryType.Quadratic:
                        xRange = RawPath._CalculateQuadraticBezierRange(startX, p.cpx, p.x);
                        xMin = Math.min(xMin, xRange.min);
                        xMax = Math.max(xMax, xRange.max);
                        yRange = RawPath._CalculateQuadraticBezierRange(startY, p.cpy, p.y);
                        yMin = Math.min(yMin, yRange.min);
                        yMax = Math.max(yMax, yRange.max);
                        startX = p.x;
                        startY = p.y;
                        break;
                    case PathEntryType.Bezier:
                        xRange = RawPath._CalculateCubicBezierRange(startX, p.cp1x, p.cp2x, p.x);
                        xMin = Math.min(xMin, xRange.min);
                        xMax = Math.max(xMax, xRange.max);
                        yRange = RawPath._CalculateCubicBezierRange(startY, p.cp1y, p.cp2y, p.y);
                        yMin = Math.min(yMin, yRange.min);
                        yMax = Math.max(yMax, yRange.max);
                        startX = p.x;
                        startY = p.y;
                        break;
                    case PathEntryType.Arc: //does not use current x,y
                        if (p.sAngle !== p.eAngle) {
                            var r = RawPath._CalculateArcRange(p.x, p.y, p.r, p.sAngle, p.eAngle, p.aClockwise);
                            xMin = Math.min(xMin, r.xMin);
                            xMax = Math.max(xMax, r.xMax);
                            yMin = Math.min(yMin, r.yMin);
                            yMax = Math.max(yMax, r.yMax);
                        }
                        break;
                    case PathEntryType.ArcTo:
                        var r = RawPath._CalculateArcToRange(startX, startY, p.cpx, p.cpy, p.x, p.y, p.r);
                        xMin = Math.min(xMin, r.xMin);
                        xMax = Math.max(xMax, r.xMax);
                        yMin = Math.min(yMin, r.yMin);
                        yMax = Math.max(yMax, r.yMax);
                        startX = p.x;
                        startY = p.y;
                        break;
                }
            }
            var r2 = new rect();
            rect.set(r2, xMin, yMin, xMax - xMin, yMax - yMin);
            return r2;
        }
        private static _CalculateQuadraticBezierRange(a: number, b: number, c: number): IRange {
            var min = Math.min(a, c);
            var max = Math.max(a, c);
            if (min <= b && b <= max) {
                return {
                    min: min,
                    max: max
                };
            }
            var t = (a - b) / (a - 2 * b + c);
            var xt = (a * Math.pow(1 - t, 2)) + (2 * b * (1 - t) * t) + (c * Math.pow(t, 2));
            if (min > b) {
                min = Math.min(min, xt);
            } else {
                max = Math.max(max, xt);
            }
            return {
                min: min,
                max: max
            };
        }
        private static _CalculateCubicBezierRange(a: number, b: number, c: number, d: number): IRange {
            var min = Math.min(a, d);
            var max = Math.max(a, d);
            if ((min <= b && b <= max) && (min <= c && c <= max)) {
                return {
                    min: min,
                    max: max
                };
            }
            var u = 2 * a - 4 * b + 2 * c;
            var v = b - a;
            var w = -a + 3 * b + d - 3 * c;
            var rt = Math.sqrt(u * u - 4 * v * w);
            if (!isNaN(rt)) {
                var t;
                t = (-u + rt) / (2 * w);
                if (t >= 0 && t <= 1) {
                    var ot = 1 - t;
                    var xt = (a * ot * ot * ot) + (3 * b * t * ot * ot) + (3 * c * ot * t * t) + (d * t * t * t);
                    min = Math.min(min, xt);
                    max = Math.max(max, xt);
                }
                t = (-u - rt) / (2 * w);
                if (t >= 0 && t <= 1) {
                    var ot = 1 - t;
                    var xt = (a * ot * ot * ot) + (3 * b * t * ot * ot) + (3 * c * ot * t * t) + (d * t * t * t);
                    min = Math.min(min, xt);
                    max = Math.max(max, xt);
                }
            }
            return {
                min: min,
                max: max
            };
        }
        private static _CalculateArcRange(cx: number, cy: number, r: number, sa: number, ea: number, cc: bool): IPointRange {
            var sx = cx + (r * Math.cos(sa));
            var sy = cy + (r * Math.sin(sa));
            var ex = cx + (r * Math.cos(ea));
            var ey = cy + (r * Math.sin(ea));
            return _CalculateArcPointsRange(cx, cy, sx, sy, ex, ey, r, cc);
        }
        private static _CalculateArcToRange(sx: number, sy: number, cpx: number, cpy: number, ex: number, ey: number, r: number): IPointRange {
            NotImplemented("RawPath._CalculateArcToRange");
            return {
                xMin: sx,
                xMax: sx,
                yMin: sy,
                yMax: sy
            };
            var v1x = cpx - sx;
            var v1y = cpy - sy;
            var v2x = ex - cpx;
            var v2y = ey - cpy;
            var theta_outer1 = Math.atan2(Math.abs(v1y), Math.abs(v1x));
            var theta_outer2 = Math.atan2(Math.abs(v2y), Math.abs(v2x));
            var inner_theta = Math.PI - theta_outer1 - theta_outer2;
            var h = r / Math.sin(inner_theta / 2);
            var cx = cpx + h * Math.cos(inner_theta / 2 + theta_outer2);
            var cy = cpy + h * Math.sin(inner_theta / 2 + theta_outer2);
            var a = r / Math.tan(inner_theta / 2);
            var sx = cpx + a * Math.cos(theta_outer2 + inner_theta);
            var sy = cpy + a * Math.sin(theta_outer2 + inner_theta);
            var ex = cpx + a * Math.cos(theta_outer2);
            var ey = cpy + a * Math.sin(theta_outer2);
            var cc = true;
            var r = _CalculateArcPointsRange(cx, cy, sx, sy, ex, ey, r, cc);
            return {
                xMin: Math.min(sx, r.xMin),
                xMax: Math.max(sx, r.xMax),
                yMin: Math.min(sy, r.yMin),
                yMax: Math.max(sy, r.yMax)
            };
        }
        private static _CalculateArcPointsRange(cx: number, cy: number, sx: number, sy: number, ex: number, ey: number, r: number, cc: bool): IPointRange {
            var xMin = Math.min(sx, ex);
            var xMax = Math.max(sx, ex);
            var yMin = Math.min(sy, ey);
            var yMax = Math.max(sy, ey);
            var xLeft = cx - r;
            if (_ArcContainsPoint(sx, sy, ex, ey, xLeft, cy, cc)) {
                xMin = Math.min(xMin, xLeft);
            }
            var xRight = cx + r;
            if (_ArcContainsPoint(sx, sy, ex, ey, xRight, cy, cc)) {
                xMax = Math.max(xMax, xRight);
            }
            var yTop = cy - r;
            if (_ArcContainsPoint(sx, sy, ex, ey, cx, yTop, cc)) {
                yMin = Math.min(yMin, yTop);
            }
            var yBottom = cy + r;
            if (_ArcContainsPoint(sx, sy, ex, ey, cx, yBottom, cc)) {
                yMax = Math.max(yMax, yBottom);
            }
            return {
                xMin: xMin,
                xMax: xMax,
                yMin: yMin,
                yMax: yMax
            };
        }
        private static _ArcContainsPoint(sx: number, sy: number, ex: number, ey: number, cpx: number, cpy: number, cc: bool): bool {
            var n = (ex - sx) * (cpy - sy) - (cpx - sx) * (ey - sy);
            if (n === 0)
                return true;
            if (n > 0 && cc)
                return true;
            if (n < 0 && !cc)
                return true;
            return false;
        }
        static Merge(path1: RawPath, path2: RawPath) {
            NotImplemented("RawPath.Merge");
        }
        Serialize(): string {
            var s = "";
            var len = this._Path.length;
            var backing = this._Path;
            for (var i = 0; i < len; i++) {
                if (i > 0)
                    s += " ";
                var p: any = backing[i];
                switch (p.type) {
                    case PathEntryType.Move:
                        s += "M" + p.x.toString() + " " + p.y.toString();
                        break;
                    case PathEntryType.Line:
                        s += "L" + p.x.toString() + " " + p.y.toString();
                        break;
                    case PathEntryType.Rect:
                        break;
                    case PathEntryType.Quadratic:
                        s += "Q" + p.cpx.toString() + " " + p.cpy.toString() + ", " + p.x.toString() + " " + p.y.toString();
                        break;
                    case PathEntryType.Bezier:
                        s += "C" + p.cp1x.toString() + " " + p.cp1y.toString() + ", " + p.cp2x.toString() + " " + p.cp2y.toString() + ", " + p.x.toString() + " " + p.y.toString();
                        break;
                    case PathEntryType.EllipticalArc:
                        s += "A" + p.width.toString() + " " + p.height.toString() + " " + p.rotationAngle.toString() + " " + p.isLargeArcFlag.toString() + " " + p.sweepDirectionFlag.toString() + " " + p.ex.toString() + " " + p.ey.toString();
                        break;
                    case PathEntryType.ArcTo:
                        break;
                    case PathEntryType.Close:
                        s += "Z";
                        break;
                }
            }
            return s;
        }
    }
}

module Fayde.Text {
    export interface ITextAttributes {
        GetBackground(selected: bool): Media.Brush;
        GetForeground(selected: bool): Media.Brush;
        Font: Font;
        Direction: FlowDirection;
        IsUnderlined: bool;
        Start: number;
    }
    export interface ITextAttributesSource {
        SelectionBackground: Media.Brush;
        Background: Media.Brush;
        SelectionForeground: Media.Brush;
        Foreground: Media.Brush;
        Font: Font;
        Direction: FlowDirection;
        TextDecorations: TextDecorations;
    }
    export class TextLayoutAttributes implements ITextAttributes {
        private _Source: ITextAttributesSource;
        Start: number;
        constructor(source: ITextAttributesSource, start?: number) {
            this._Source = source;
            this.Start = (start == null) ? 0 : start;
        }
        GetBackground(selected: bool): Media.Brush {
            if (selected)
                return this._Source.SelectionBackground;
            return null;
        }
        GetForeground(selected: bool): Media.Brush {
            if (selected)
                return this._Source.SelectionForeground;
            return this._Source.Foreground;
        }
        get Font(): Font { return this._Source.Font; }
        get Direction(): FlowDirection { return this._Source.Direction; }
        get IsUnderlined(): bool { return (this._Source.TextDecorations & TextDecorations.Underline) === TextDecorations.Underline; }
    }
}

module Fayde.Text {
    export interface IBreakOp {
        Advance: number;
        Index: number;
        Btype: number;
        c: string;
    }
    export interface ILayoutWord {
        Advance: number;
        LineAdvance: number;
        Length: number;
        BreakOps: IBreakOp[];
        Font: Font;
    }
    export class TextLayoutGlyphCluster {
        private _Text: string;
        private _Selected: bool = false;
        _Advance: number = 0;
        constructor(text: string, font: Font, selected?: bool) {
            this._Text = text;
            this._Selected = selected == true;
            this._Advance = Surface.MeasureWidth(text, font);
        }
        _Render(ctx: RenderContext, origin: Point, attrs: ITextAttributes, x: number, y: number) {
            if (this._Text.length == 0 || this._Advance == 0.0)
                return;
            var font = attrs.Font;
            var y0 = font._Ascender();
            ctx.Translate(x, y - y0);
            var brush: Media.Brush;
            var fontHeight = font.GetActualHeight();
            var area = new rect();
            var ox = 0;
            var oy = 0;
            if (origin) {
                ox = origin.X;
                oy = origin.Y;
            }
            rect.set(area, ox, oy, this._Advance, fontHeight);
            if (this._Selected && (brush = attrs.GetBackground(true))) {
                ctx.FillRect(brush, area); //selection background
            }
            var canvasCtx = ctx.CanvasContext;
            brush = attrs.GetForeground(this._Selected);
            if (brush) {
                brush.SetupBrush(canvasCtx, area);
                var brushHtml5 = brush.ToHtml5Object();
                canvasCtx.fillStyle = brushHtml5;
            } else {
                canvasCtx.fillStyle = "#000000";
            }
            canvasCtx.font = font.ToHtml5Object();
            canvasCtx.textAlign = "left";
            canvasCtx.textBaseline = "top";
            canvasCtx.fillText(this._Text, 0, 0);
            if (attrs.IsUnderlined) {
                canvasCtx.beginPath();
                canvasCtx.moveTo(0, fontHeight);
                canvasCtx.lineTo(this._Advance, fontHeight);
                canvasCtx.lineWidth = 2;
                canvasCtx.strokeStyle = brushHtml5;
                canvasCtx.stroke();
            }
        }
    }
    export class TextLayoutRun {
        private _Clusters: TextLayoutGlyphCluster[] = [];
        _Attrs: ITextAttributes = null;
        _Start: number = 0;
        private _Line: TextLayoutLine = null;
        _Advance: number = 0.0; //after layout, will contain horizontal distance this run advances
        _Length: number = 0;
        constructor(line: TextLayoutLine, attrs: ITextAttributes, start: number) {
            this._Attrs = attrs;
            this._Start = start;
            this._Line = line;
        }
        _GenerateCache() {
            var layout = this._Line._Layout;
            var selectionLength = layout.SelectionLength;
            var selectionStart = layout.SelectionStart;
            var text = layout.Text;
            var font = this._Attrs.Font;
            var len;
            var index = this._Start;
            var cluster1;
            var cluster2;
            if (selectionLength === 0 || this._Start < selectionStart) {
                len = selectionLength > 0 ? Math.min(selectionStart - this._Start, this._Length) : this._Length;
                cluster1 = new TextLayoutGlyphCluster(text.substr(this._Start, len), font);
                this._Clusters.push(cluster1);
                index += len;
            }
            var selectionEnd = selectionStart + selectionLength;
            var runEnd = this._Start + this._Length;
            if (index < runEnd && index < selectionEnd) {
                len = Math.min(runEnd - index, selectionEnd - index);
                cluster2 = new TextLayoutGlyphCluster(text.substr(index, len), font, true);
                this._Clusters.push(cluster2);
                index += len;
            }
            var cluster3;
            if (index < runEnd) {
                len = runEnd - index;
                cluster3 = new TextLayoutGlyphCluster(text.substr(index, len), font);
                this._Clusters.push(cluster3);
                index += len;
            }
        }
        _ClearCache() {
            this._Clusters = [];
        }
        _Render(ctx: RenderContext, origin: Point, x: number, y: number) {
            var x0 = x;
            if (this._Clusters.length === 0)
                this._GenerateCache();
            for (var i = 0; i < this._Clusters.length; i++) {
                var cluster = this._Clusters[i];
                ctx.Save();
                cluster._Render(ctx, origin, this._Attrs, x0, y);
                ctx.Restore();
                x0 += cluster._Advance;
            }
        }
        __Debug(allText) {
            return allText.substr(this._Start, this._Length);
        }
    }
    export class TextLayoutLine {
        _Runs: TextLayoutRun[] = [];
        _Layout: TextLayout = null;
        _Start: number = 0;
        private _Offset: number = 0;
        _Advance: number = 0.0; //after layout, will contain horizontal distance this line advances
        _Descend: number = 0.0;
        _Height: number = 0.0;
        _Width: number = 0.0;
        _Length: number = 0;
        constructor(layout: TextLayout, start: number, offset: number) {
            this._Layout = layout;
            this._Start = start;
            this._Offset = offset;
        }
        GetCursorFromX(offset: Point, x: number): number {
            var run = null;
            var layout = this._Layout;
            var ox: number = 0;
            if (offset) ox = offset.X;
            var x0 = ox + layout._HorizontalAlignment(this._Advance);
            var cursor = this._Offset;
            var text = layout.Text;
            var index = this._Start;
            var end: number = 0;
            var c: string = null;
            var i: number;
            for (i = 0; i < this._Runs.length; i++) {
                run = this._Runs[i];
                if (x < (x0 + run._Advance))
                    break; // x is somewhere inside this run
                cursor += run._Length;
                index += run._Length;
                x0 += run._Advance;
                run = null;
            }
            if (run != null) {
                index = run._Start;
                end = run._Start + run._Length;
                var font = run._Attrs.GetFont();
                var m: number = 0;
                var ch: number = 0;
                while (index < end) {
                    ch = index;
                    cursor++;
                    c = text.charAt(index);
                    index++;
                    if (c === '\t')
                        c = ' ';
                    m = Surface.MeasureWidth(c, font);
                    if (x <= x0 + (m / 2.0)) {
                        index = ch;
                        cursor--;
                        break;
                    }
                    x0 += m;
                }
            } else if (i > 0) {
                run = this._Runs[i - 1];
                end = run._Start + run._Length;
                index = run._Start;
                c = end - 1 < 0 ? null : text.charAt(end - 1);
                if (c == '\n') {
                    cursor--;
                    end--;
                    c = end - 1 < 0 ? null : text.charAt(end - 1);
                    if (c == '\r') {
                        cursor--;
                        end--;
                    }
                }
            }
            return cursor;
        }
        _Render(ctx, origin: Point, left: number, top: number) {
            var run: TextLayoutRun = null;
            var x0 = left;
            var y0 = top;
            for (var i = 0; i < this._Runs.length; i++) {
                run = this._Runs[i];
                run._Render(ctx, origin, x0, y0);
                x0 += run._Advance;
            }
        }
        __Debug(allText) {
            var t = "";
            t += "\t\tRuns: " + this._Runs.length.toString() + "\n";
            for (var i = 0; i < this._Runs.length; i++) {
                t += "\t\t\tRun " + i.toString() + ": ";
                t += this._Runs[i].__Debug(allText);
                t += "\n";
            }
            return t;
        }
    }
    function cloneBreakOp(bop: IBreakOp):IBreakOp {
        return {
            Advance: bop.Advance,
            Index: bop.Index,
            Btype: bop.Btype,
            c: bop.c
        };
    }
    function setWordBasics(bop: IBreakOp, word: ILayoutWord) {
        word.Length = this.Index;
        word.Advance = this.Advance;
    }
    function layoutLwsp(word:ILayoutWord, text: string, font: Font) {
        var advance = Surface.MeasureWidth(text, font);
        word.Advance = advance;
        word.LineAdvance += advance;
        word.Length = text.length;
    }
    function isLineBreak(text: string): number {
        var c0 = text.charAt(0);
        if (c0 === '\n')
            return 1;
        var c1 = text.charAt(1);
        if (c0 === '\r' && c1 === '\n')
            return 2;
        return 0;
    }
    function getWidthConstraint(availWidth: number, maxWidth: number, actualWidth: number): number {
        if (!isFinite(availWidth)) {
            if (!isFinite(maxWidth))
                return actualWidth;
            else
                return Math.min(actualWidth, maxWidth);
        }
        return availWidth;
    }
    function validateAttributes(attributes: ITextAttributes[]): bool {
        var len = attributes.length;
        var attr: ITextAttributes = attributes[0];
        if (!attr || attr.Start !== 0)
            return false;
        for (var i = 0 ; i < len; i++) {
            attr = attributes[i];
            if (!attr.Font) //WTF: This whole method may not be valid in our case
                return false;
        }
        return true;
    }
    function layoutWordWrap(word: ILayoutWord, text: string, maxWidth: number) {
        word.Length = 0;
        word.Advance = 0.0;
        var measuredIndex = 0;
        var measuredText = "";
        if (text.indexOf(" ", measuredIndex) === -1) {
            var advance = Surface.MeasureWidth(text, word.Font);
            if (isFinite(maxWidth) && (word.LineAdvance + advance) > maxWidth) {
                return true;
            }
            word.Advance = advance;
            word.LineAdvance = advance;
            word.Length = text.length;
            return false;
        }
        var tempText = text;
        while (true) {
            var index = tempText.indexOf(" ", measuredIndex);
            if (index === -1)
                break;
            index += 1; //include " "
            tempText = tempText.slice(measuredIndex, index);
            var advance = Surface.MeasureWidth(tempText, word.Font);
            if (isFinite(maxWidth) && (word.LineAdvance + advance) > maxWidth) {
                return true;
            }
            measuredIndex = index;
            measuredText = tempText;
            word.Advance += advance;
            word.LineAdvance += advance;
            word.Length += measuredText.length;
        }
        return false;
    }
    function layoutWordNoWrap(word: ILayoutWord, text: string, maxWidth: number): bool {
        var advance = Surface.MeasureWidth(text, word.Font);
        word.Advance = advance;
        word.LineAdvance += advance;
        word.Length = text.length;
        return false;
    }
    export class TextLayout {
        private _Attrs: ITextAttributes[];
        private _SelectionStart: number = 0;
        private _SelectionLength: number = 0;
        private _Text: string = null;
        AvailableWidth: number = Number.POSITIVE_INFINITY;
        private _Strategy: LineStackingStrategy = LineStackingStrategy.MaxHeight;
        private _Alignment: TextAlignment = TextAlignment.Left;
        private _Trimming: Controls.TextTrimming = Controls.TextTrimming.None;
        private _Wrapping: Controls.TextWrapping = Controls.TextWrapping.NoWrap;
        private _MaxHeight: number = Number.POSITIVE_INFINITY;
        private _MaxWidth: number = Number.POSITIVE_INFINITY;
        private _BaseDescent: number = 0.0;
        private _BaseHeight: number = 0.0;
        private _ActualHeight: number = NaN;
        private _ActualWidth: number = NaN;
        private _LineHeight: number = NaN;
        private _Lines: TextLayoutLine[] = [];
        private _IsWrapped: bool = true;
        private _Length: number = 0;
        get SelectionStart(): number { return this._SelectionStart; }
        get SelectionLength(): number { return this._SelectionLength; }
        get ActualExtents(): size {
            return size.fromRaw(this._ActualWidth, this._ActualHeight);
        }
        get RenderExtents(): rect {
            this.Layout();
            var r = new rect();
            rect.set(r, this._HorizontalAlignment(this._ActualWidth), 0.0, this._ActualWidth, this._ActualHeight);
            return r;
        }
        get MaxWidth(): number { return this._MaxWidth; }
        set MaxWidth(maxWidth: number) {
            if (maxWidth === 0.0)
                maxWidth = Number.POSITIVE_INFINITY;
            if (this._MaxWidth === maxWidth)
                return false;
            if (!this._IsWrapped && (!isFinite(maxWidth) || maxWidth > this._ActualWidth)) {
                this._MaxWidth = maxWidth;
                return false;
            }
            this._MaxWidth = maxWidth;
            this.ResetState();
            return true;
        }
        get TextAlignment() { return this._Alignment; }
        set TextAlignment(align: TextAlignment) {
            if (this._Alignment === align)
                return;
            this._Alignment = align;
            this.ResetState();
        }
        SetTextAlignment(align: TextAlignment): bool {
            if (this._Alignment === align)
                return false;
            this._Alignment = align;
            this.ResetState();
            return true;
        }
        get TextTrimming(): Controls.TextTrimming { return this._Trimming; }
        set TextTrimming(value: Controls.TextTrimming) { this.SetTextTrimming(value); }
        SetTextTrimming(value: Controls.TextTrimming): bool {
            if (this._Trimming === value)
                return false;
            this._Trimming = value;
            this.ResetState();
            return true;
        }
        get TextWrapping(): Controls.TextWrapping { return this._Wrapping; }
        set TextWrapping(wrapping: Controls.TextWrapping) {
            this.SetTextWrapping(wrapping);
        }
        SetTextWrapping(wrapping: Controls.TextWrapping): bool {
            switch (wrapping) {
                case Fayde.Controls.TextWrapping.NoWrap:
                case Fayde.Controls.TextWrapping.Wrap:
                    break;
                default:
                    wrapping = Fayde.Controls.TextWrapping.Wrap;
                    break;
            }
            if (this._Wrapping === wrapping)
                return false;
            this._Wrapping = wrapping;
            this.ResetState();
            return true;
        }
        get LineStackingStrategy(): LineStackingStrategy { return this._Strategy; }
        set LineStackingStategy(value) { this.SetLineStackingStategy(value); }
        SetLineStackingStategy(strategy: LineStackingStrategy): bool {
            if (this._Strategy === strategy)
                return false;
            this._Strategy = strategy;
            this.ResetState();
            return true;
        }
        get LineHeight(): number { return this._LineHeight; }
        set LineHeight(value: number) { this.SetLineHeight(value); }
        SetLineHeight(value: number): bool {
            if (this._LineHeight === value)
                return false;
            this._LineHeight = value;
            this.ResetState();
            return true;
        }
        get TextAttributes(): ITextAttributes[] { return this._Attrs; }
        set TextAttributes(attrs: ITextAttributes[]) {
            this._Attrs = attrs;
            this.ResetState();
            return true;
        }
        get Text(): string { return this._Text; }
        set Text(text: string) {
            if (text != null) {
                this._Text = text;
                this._Length = text.length;
            } else {
                this._Text = null;
                this._Length = 0;
            }
            this.ResetState();
            return true;
        }
        GetSelectionCursor(offset: Point, pos: number): rect {
            var ox: number = 0;
            var oy: number = 0;
            if (offset) {
                ox = offset.X;
                oy = offset.Y;
            }
            var x0 = ox;
            var y0 = oy;
            var height = 0.0;
            var y1 = 0.0;
            var cursor = 0;
            var end: number = 0;
            var line: TextLayoutLine;
            var lines = this._Lines;
            for (var i = 0; i < lines.length; i++) {
                line = lines[i];
                x0 = ox + this._HorizontalAlignment(line._Advance);
                y1 = y0 + line._Height + line._Descend;
                height = line._Height;
                if (pos >= cursor + line._Length) {
                    if ((i + 1) === this._Lines.length) {
                        if (isLineBreak(this._Text.substr(line._Start + line._Length - 1, 2))) {
                            x0 = ox + this._HorizontalAlignment(0.0);
                            y0 += line._Height;
                        } else {
                            x0 += line._Advance;
                        }
                        break;
                    }
                    cursor += line._Length;
                    y0 += line._Height;
                    continue;
                }
                var runs = line._Runs;
                var run: TextLayoutRun = null;
                for (var j = 0; j < runs.length; j++) {
                    run = runs[j];
                    end = run._Start + run._Length;
                    if (pos >= cursor + run._Length) {
                        cursor += run._Length;
                        x0 += run._Advance;
                        continue;
                    }
                    if (run._Start === pos)
                        break;
                    var font = run._Attrs.Font;
                    x0 += Surface.MeasureWidth(this._Text.slice(run._Start, pos), font);
                    break;
                }
                break;
            }
            var r = new rect();
            rect.set(r, x0, y0, 1.0, height);
            return r;
        }
        GetBaselineOffset(): number {
            var lines = this._Lines;
            if (lines.length === 0)
                return 0;
            var line = lines[0];
            return line._Height + line._Descend;
        }
        GetLineFromY(offset: Point, y: number): TextLayoutLine {
            var line: TextLayoutLine = null;
            var y0 = (offset) ? offset.Y : 0.0;
            var y1: number;
            var lines = this._Lines;
            for (var i = 0; i < lines.length; i++) {
                line = lines[i];
                y1 = y0 + line._Height; //set y1 to top of next line
                if (y < y1) {
                    return line;
                }
                y0 = y1;
            }
        }
        GetLineFromIndex(index: number): TextLayoutLine {
            var lines = this._Lines;
            if (index >= lines.length || index < 0)
                return null;
            return lines[index];
        }
        GetCursorFromXY(offset: Point, x: number, y: number): number {
            var oy: number = 0;
            if (offset) oy = offset.Y;
            var lines = this._Lines;
            var line: TextLayoutLine;
            if (y < oy) {
                line = lines[0];
            } else if (!(line = this.GetLineFromY(offset, y))) {
                line = lines[lines.length - 1];
            }
            return line.GetCursorFromX(offset, x);
        }
        Select(start: number, length: number) {
            if (!this._Text) {
                this._SelectionLength = 0;
                this._SelectionStart = 0;
                return;
            }
            var newSelectionStart: number = 0;
            var newSelectionLength: number = 0;
            var index: number = 0;
            var end: number = 0;
            if (!false) {
                newSelectionStart = index = start;
                end = index + length;
                newSelectionLength = length;
            } else {
                newSelectionLength = length;
                newSelectionStart = start;
            }
            if (this._SelectionStart === newSelectionStart && this._SelectionLength === newSelectionLength)
                return;
            if (this._SelectionLength > 0 || newSelectionLength > 0)
                this._ClearCache();
            this._SelectionLength = newSelectionLength;
            this._SelectionStart = newSelectionStart;
        }
        Layout() {
            if (!isNaN(this._ActualWidth))
                return;
            this._ActualHeight = 0.0;
            this._ActualWidth = 0.0;
            this._IsWrapped = false;
            this._ClearLines();
            if (this._Text == null || !validateAttributes(this._Attrs))
                return;
            var word: ILayoutWord = {
                Advance: 0.0,
                LineAdvance: 0.0,
                Length: 0.0,
                BreakOps: null,
                Font: new Font()
            };
            if (this._Wrapping === Controls.TextWrapping.Wrap)
                word.BreakOps = [];
            else
                word.BreakOps = null;
            var layoutWordFunc: (word: ILayoutWord, text: string, maxWidth: number) => bool;
            layoutWordFunc = this._Wrapping === Controls.TextWrapping.NoWrap ? layoutWordNoWrap : layoutWordWrap;
            var line = new TextLayoutLine(this, 0, 0);
            if (this._OverrideLineHeight()) {
                line._Descend = this._GetDescendOverride();
                line._Height = this._GetLineHeightOverride();
            }
            this._Lines.push(line);
            var index = 0;
            var end: number;
            var run: TextLayoutRun;
            var font: Font;
            var attrindex = 0;
            var attrs = this._Attrs;
            var attr: ITextAttributes = attrs[0];
            var nattr: ITextAttributes = attrs[1];
            do {
                end = nattr ? nattr.Start : this._Length;
                run = new TextLayoutRun(line, attr, index);
                line._Runs.push(run);
                word.Font = font = attr.Font;
                if (end - index <= 0) {
                    if (!this._OverrideLineHeight()) {
                        line._Descend = Math.min(line._Descend, font._Descender());
                        line._Height = Math.max(line._Height, font.GetActualHeight());
                    }
                    this._ActualHeight += line._Height;
                    break;
                }
                while (index < end) {
                    var linebreak = false;
                    var wrapped = false;
                    while (index < end) {
                        var lineBreakLength = isLineBreak(this._Text.slice(index, end));
                        if (lineBreakLength > 0) {
                            if (line._Length == 0 && !this._OverrideLineHeight()) {
                                line._Descend = font._Descender();
                                line._Height = font.GetActualHeight();
                            }
                            line._Length += lineBreakLength;
                            run._Length += lineBreakLength;
                            index += lineBreakLength;
                            linebreak = true;
                            break;
                        }
                        word.LineAdvance = line._Advance;
                        if (layoutWordFunc(word, this._Text.slice(index, end), this._MaxWidth)) {
                            this._IsWrapped = true;
                            wrapped = true;
                        }
                        if (word.Length > 0) {
                            if (!this._OverrideLineHeight()) {
                                line._Descend = Math.min(line._Descend, font._Descender());
                                line._Height = Math.max(line._Height, font.GetActualHeight());
                            }
                            line._Advance += word.Advance;
                            run._Advance += word.Advance;
                            line._Width = line._Advance;
                            line._Length += word.Length;
                            run._Length += word.Length;
                            index += word.Length;
                        }
                        if (wrapped)
                            break;
                        word.LineAdvance = line._Advance;
                        layoutLwsp(word, this._Text.slice(index, end), font);
                        if (word.Length > 0) {
                            if (!this._OverrideLineHeight()) {
                                line._Descend = Math.min(line._Descend, font._Descender());
                                line._Height = Math.max(line._Height, font.GetActualHeight());
                            }
                            line._Advance += word.Advance;
                            run._Advance += word.Advance;
                            line._Width = line._Advance;
                            line._Length += word.Length;
                            run._Length += word.Length;
                            index += word.Length;
                        }
                    }
                    var atend = index >= end;
                    if (linebreak || wrapped || atend) {
                        this._ActualWidth = Math.max(this._ActualWidth, atend ? line._Advance : line._Width);
                        this._ActualHeight += line._Height;
                        if (linebreak || wrapped) {
                            line = new TextLayoutLine(this, index, index);
                            if (!this._OverrideLineHeight()) {
                                if (end - index < 1) {
                                    line._Descend = font._Descender();
                                    line._Height = font.GetActualHeight();
                                }
                            } else {
                                line._Descend = this._GetDescendOverride();
                                line._Height = this._GetLineHeightOverride();
                            }
                            if (linebreak && (end - index < 1))
                                this._ActualHeight += line._Height;
                            this._Lines.push(line);
                        }
                        if (index < end) {
                            run = new TextLayoutRun(line, attr, index);
                            line._Runs.push(run);
                        }
                    }
                }
                attrindex++;
                attr = nattr;
                nattr = attrs[attrindex + 1];
            } while (end - index > 0);
        }
        _HorizontalAlignment(lineWidth: number): number {
            var deltax = 0.0;
            var width: number;
            switch (this._Alignment) {
                case Fayde.TextAlignment.Center:
                    width = getWidthConstraint(this.AvailableWidth, this._MaxWidth, this._ActualWidth);
                    if (lineWidth < width)
                        deltax = (width - lineWidth) / 2.0;
                    break;
                case Fayde.TextAlignment.Right:
                    width = getWidthConstraint(this.AvailableWidth, this._MaxWidth, this._ActualWidth);
                    if (lineWidth < width)
                        deltax = width - lineWidth;
                    break;
            }
            return deltax;
        }
        Render(ctx: RenderContext, origin?: Point, offset?: Point) {
            var line: TextLayoutLine;
            var x: number = 0.0;
            var ox: number = (offset) ? offset.X : 0.0;
            var y = (offset) ? offset.Y : 0.0;
            this.Layout();
            for (var i = 0; i < this._Lines.length; i++) {
                line = this._Lines[i];
                x = ox + this._HorizontalAlignment(line._Advance);
                line._Render(ctx, origin, x, y);
                y += line._Height;
            }
        }
        __Debug(): string {
            var allText = this.Text;
            var t = "";
            t += "Lines: " + this._Lines.length.toString() + "\n";
            for (var i = 0; i < this._Lines.length; i++) {
                t += "\tLine " + i.toString() + ":\n";
                t += this._Lines[i].__Debug(allText);
            }
            return t;
        }
        ResetState() {
            this._ActualHeight = NaN;
            this._ActualWidth = NaN;
        }
        private _ClearCache() {
            var line: TextLayoutLine = null;
            var lines = this._Lines;
            var len = lines.length;
            var runs: TextLayoutRun[];
            var runlen: number = 0;
            for (var i = 0; i < len; i++) {
                line = lines[i];
                runs = line._Runs;
                runlen = runs.length;
                for (var j = 0; j < runlen; j++) {
                    runs[i]._ClearCache();
                }
            }
        }
        private _ClearLines() {
            this._Lines = [];
        }
        private _OverrideLineHeight(): bool {
            return this._Strategy === LineStackingStrategy.BlockLineHeight && this._LineHeight !== 0;
        }
        private _GetLineHeightOverride(): number {
            if (isNaN(this._LineHeight))
                return this._BaseHeight;
            return this._LineHeight;
        }
        private _GetDescendOverride() {
            if (isNaN(this._LineHeight))
                return this._BaseDescent;
            if (this._BaseHeight == 0.0)
                return 0.0;
            return this._LineHeight * (this._BaseDescent / this._BaseHeight);
        }
    }
}

module Fayde.Collections {
    export interface INotifyCollectionChanged {
        CollectionChanged: MulticastEvent;
    }
    export var INotifyCollectionChanged_ = Nullstone.RegisterInterface("INotifyCollectionChanged");
}

module Fayde.Controls {
    export enum GridUnitType {
        Auto = 0,
        Pixel = 1,
        Star = 2,
    }
    export class GridLength implements ICloneable {
        Value: number;
        Type: GridUnitType;
        constructor(value?: number, unitType?: GridUnitType) {
            this.Value = value == null ? 0 : value;
            this.Type = unitType == null ? GridUnitType.Auto : unitType;
        }
        static Equals(gl1: GridLength, gl2: GridLength): bool {
            return Math.abs(gl1.Value - gl2.Value) < 0.001 && gl1.Type == gl2.Type;
        }
        Clone(): GridLength {
            return new Controls.GridLength(this.Value, this.Type);
        }
    }
    Nullstone.RegisterType(GridLength, "GridLength");
}

module Fayde.Controls.Primitives {
    export interface IScrollInfo {
        ScrollOwner: ScrollViewer;
        LineUp();
        LineDown();
        LineLeft();
        LineRight();
        MouseWheelUp();
        MouseWheelDown();
        MouseWheelLeft();
        MouseWheelRight();
        PageUp();
        PageDown();
        PageLeft();
        PageRight();
        MakeVisible(uie: UIElement, rectangle: rect): rect;
        SetHorizontalOffset(offset: number);
        SetVerticalOffset(offset: number);
        CanHorizontallyScroll: bool;
        CanVerticallyScroll: bool;
        ExtentHeight: number;
        ExtentWidth: number;
        HorizontalOffset: number;
        VerticalOffset: number;
        ViewportHeight: number;
        ViewportWidth: number;
    }
    export var IScrollInfo_ = Nullstone.RegisterInterface("IScrollInfo");
}

interface IAutoCreator {
    GetValue(propd: DependencyProperty, dobj: Fayde.DependencyObject): any;
}
interface IDependencyPropertyChangedEventArgs {
    Property: DependencyProperty;
    OldValue: any;
    NewValue: any;
}
interface IOutIsValid {
    IsValid: bool;
}
module Fayde.Providers {
    var pp = _PropertyPrecedence;
    export function BuildBitmask(propd: DependencyProperty): number {
        var bitmask = (1 << pp.Inherited) | (1 << pp.DynamicValue);
        if (propd._IsAutoCreated)
            bitmask |= (1 << pp.AutoCreate);
        if (propd._HasDefaultValue)
            bitmask |= (1 << pp.DefaultValue);
        return bitmask;
    }
}
class DependencyProperty {
    private static _IDs: DependencyProperty[] = [];
    private static _Inherited: DependencyProperty[][] = [];
    private static _LastID: number = 0;
    _ID: number;
    Name: string;
    GetTargetType: () => Function;
    OwnerType: Function;
    DefaultValue: any;
    IsReadOnly: bool;
    IsCustom: bool;
    _HasDefaultValue: bool;
    _ChangedCallback: (dobj: Fayde.DependencyObject, args: IDependencyPropertyChangedEventArgs) => void;
    _AutoCreator: IAutoCreator;
    _IsAutoCreated: bool;
    private _Coercer: (dobj: Fayde.DependencyObject, propd: DependencyProperty, value: any) => any;
    _AlwaysChange: bool;
    private _Validator: (dobj: Fayde.DependencyObject, propd: DependencyProperty, value: any) => bool;
    _IsAttached: bool;
    _BitmaskCache: number;
    _Inheritable: number;
    static Register(name: string, getTargetType: () => Function, ownerType: Function, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: IDependencyPropertyChangedEventArgs) => void) {
        return RegisterFull(name, getTargetType, ownerType, defaultValue, changedCallback, undefined, undefined, undefined, undefined, true);
    }
    static RegisterReadOnly(name: string, getTargetType: () => Function, ownerType: Function, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: IDependencyPropertyChangedEventArgs) => void) {
        return RegisterFull(name, getTargetType, ownerType, defaultValue, changedCallback, undefined, undefined, undefined, undefined, true, true);
    }
    static RegisterAttached(name: string, getTargetType: () => Function, ownerType: Function, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: IDependencyPropertyChangedEventArgs) => void) {
        return RegisterFull(name, getTargetType, ownerType, defaultValue, changedCallback, undefined, undefined, undefined, undefined, true, undefined, true);
    }
    static RegisterCore(name: string, getTargetType: () => Function, ownerType: Function, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: IDependencyPropertyChangedEventArgs) => void) {
        return RegisterFull(name, getTargetType, ownerType, defaultValue, changedCallback, undefined, undefined, undefined, undefined, false);
    }
    static RegisterReadOnlyCore(name: string, getTargetType: () => Function, ownerType: Function, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: IDependencyPropertyChangedEventArgs) => void) {
        return RegisterFull(name, getTargetType, ownerType, defaultValue, changedCallback, undefined, undefined, undefined, undefined, false, true);
    }
    static RegisterAttachedCore(name: string, getTargetType: () => Function, ownerType: Function, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: IDependencyPropertyChangedEventArgs) => void) {
        return RegisterFull(name, getTargetType, ownerType, defaultValue, changedCallback, undefined, undefined, undefined, undefined, false, undefined, true);
    }
    static RegisterInheritable(name: string, getTargetType: () => Function, ownerType: Function, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: IDependencyPropertyChangedEventArgs) => void , autocreator?: IAutoCreator, inheritable?) {
        return RegisterFull(name, getTargetType, ownerType, defaultValue, changedCallback, autocreator, undefined, undefined, undefined, false, undefined, undefined, inheritable);
    }
    static RegisterFull(name: string, getTargetType: () => Function, ownerType: Function, defaultValue?: any, changedCallback?: (dobj: Fayde.DependencyObject, args: IDependencyPropertyChangedEventArgs) => void, autocreator?: IAutoCreator, coercer?: (dobj: Fayde.DependencyObject, propd: DependencyProperty, value: any) => any, alwaysChange?: bool, validator?: (dobj: Fayde.DependencyObject, propd: DependencyProperty, value: any) => bool, isCustom?: bool, isReadOnly?: bool, isAttached?: bool, inheritable?): DependencyProperty {
        var registeredDPs: DependencyProperty[] = (<any>ownerType)._RegisteredDPs;
        if (!registeredDPs)
            (<any>ownerType)._RegisteredDPs = registeredDPs = [];
        if (registeredDPs[name] !== undefined)
            throw new InvalidOperationException("Dependency Property is already registered. [" + (<any>ownerType)._TypeName + "." + name + "]");
        var propd = new DependencyProperty();
        propd.Name = name;
        propd.GetTargetType = getTargetType;
        propd.OwnerType = ownerType;
        propd.DefaultValue = defaultValue;
        propd._HasDefaultValue = defaultValue !== undefined;
        propd._ChangedCallback = changedCallback;
        propd._AutoCreator = autocreator;
        propd._IsAutoCreated = autocreator != null;
        propd._Coercer = coercer;
        propd._AlwaysChange = alwaysChange;
        propd._Validator = validator;
        propd.IsCustom = isCustom !== false;
        propd.IsReadOnly = isReadOnly === true;
        propd._IsAttached = isAttached === true;
        propd._ID = _LastID = _LastID + 1;
        propd._BitmaskCache = Fayde.Providers.BuildBitmask(propd);
        propd._Inheritable = inheritable;
        if (inheritable !== undefined) {
            var i = _Inherited;
            if (!i[inheritable])
                i[inheritable] = [];
            i[inheritable].push(propd);
        }
        if (!ownerType || typeof ownerType !== "function")
            throw new InvalidOperationException("DependencyProperty does not have a valid OwnerType.");
        propd.CreateAutoProperty();
        registeredDPs[name] = propd;
        _IDs[propd._ID] = propd;
        return propd;
    }
    CreateAutoProperty() {
        var propd = this;
        var getter = function () { return (<Fayde.DependencyObject>this).GetValue(propd); };
        var setter = function (value) { (<Fayde.DependencyObject>this).SetValue(propd, value); };
        Object.defineProperty(this.OwnerType.prototype, this.Name, {
            get: getter,
            set: setter,
            configurable: true
        });
    }
    ValidateSetValue(dobj: Fayde.DependencyObject, value: any, isValidOut: IOutIsValid) {
        isValidOut.IsValid = false;
        var coerced = value;
        if (this._Coercer && !(coerced = this._Coercer(dobj, this, coerced)))
            return coerced;
        /* TODO: Handle Type Problems
        if (!this._IsValueValid(dobj, coerced))
            return coerced;
        */
        if (this._Validator && !this._Validator(dobj, this, coerced))
            return coerced;
        isValidOut.IsValid = true;
        return coerced;
    }
    static GetDependencyProperty(ownerType: Function, name: string) {
        if (!ownerType)
            return null;
        var reg: DependencyProperty[] = (<any>ownerType)._RegisteredDPs;
        var propd: DependencyProperty;
        if (reg)
            propd = reg[name];
        if (!propd)
            propd = DependencyProperty.GetDependencyProperty((<any>ownerType)._BaseClass, name);
        return propd;
    }
}
Nullstone.RegisterType(DependencyProperty, "DependencyProperty");

module Fayde {
    export class Expression {
        IsUpdating: bool;
        IsAttached: bool;
        GetValue(propd: DependencyProperty): any { }
        OnAttached(dobj: DependencyObject) {
            this.IsAttached = true;
        }
        OnDetached(dobj: DependencyObject) {
            this.IsAttached = false;
        }
    }
    Nullstone.RegisterType(Expression, "Expression");
}

module Fayde {
    export interface INotifyPropertyChanged {
        PropertyChanged: MulticastEvent;
    }
    export var INotifyPropertyChanged_ = Nullstone.RegisterInterface("INotifyPropertyChanged");
}

module Fayde {
    export class LayoutInformation {
        static GetLayoutClip(uie: UIElement): Media.Geometry {
            return uie.XamlNode.LayoutUpdater.LayoutClip;
        }
        static SetLayoutClip(uie: UIElement, value: Media.Geometry) {
            uie.XamlNode.LayoutUpdater.LayoutClip = value;
        }
        static GetLayoutExceptionElement(): UIElement {
            var lu = LayoutUpdater.LayoutExceptionUpdater;
            if (lu)
                return lu.Node.XObject;
        }
        static GetLayoutSlot(uie: UIElement): rect {
            return uie.XamlNode.LayoutUpdater.LayoutSlot;
        }
        static SetLayoutSlot(uie: UIElement, value: rect) {
            uie.XamlNode.LayoutUpdater.LayoutSlot = value;
        }
    }
    Nullstone.RegisterType(LayoutInformation, "LayoutInformation");
}

module Fayde {
    var dirtyEnum = _Dirty;
    var localTransformFlag = _Dirty.LocalTransform;
    var localProjectionFlag = _Dirty.LocalProjection;
    var transformFlag = _Dirty.Transform;
    var rvFlag = _Dirty.RenderVisibility;
    var htvFlag = _Dirty.HitTestVisibility;
    var localClipFlag = _Dirty.LocalClip;
    var clipFlag = _Dirty.Clip;
    var downDirtyFlag = _Dirty.DownDirtyState
    var upDirtyFlag = _Dirty.UpDirtyState;
    export enum UIElementFlags {
        None = 0,
        RenderVisible = 0x02,
        HitTestVisible = 0x04,
        TotalRenderVisible = 0x08,
        TotalHitTestVisible = 0x10,
        DirtyArrangeHint = 0x800,
        DirtyMeasureHint = 0x1000,
        DirtySizeHint = 0x2000,
        RenderProjection = 0x4000,
    }
    export interface ILayoutPass {
        MeasureList: LayoutUpdater[];
        ArrangeList: LayoutUpdater[];
        SizeList: LayoutUpdater[];
        Count: number;
        Updated: bool;
    }
    export interface IMeasurable {
        MeasureOverride(availableSize: size): size;
    }
    export interface IMeasurableHidden {
        _MeasureOverride(availableSize: size, error: BError): size;
    }
    export interface IArrangeable {
        ArrangeOverride(finalSize: size): size;
    }
    export interface IArrangeableHidden {
        _ArrangeOverride(finalSize: size, error: BError): size;
    }
    export interface IRenderable {
        Render(ctx: RenderContext, lu:LayoutUpdater, region: rect);
    }
    export interface IActualSizeComputable {
        ComputeActualSize(baseComputer: () => size, lu: LayoutUpdater);
    }
    export interface IBoundsComputable {
        ComputeBounds(baseComputer: () => void , lu: LayoutUpdater);
    }
    var maxPassCount = 250;
    export class LayoutUpdater {
        static LayoutExceptionUpdater: LayoutUpdater = undefined;
        Surface: Surface;
        LayoutClip: Media.Geometry = undefined;
        LayoutSlot: rect = undefined;
        PreviousConstraint: size = undefined;
        LastRenderSize: size = undefined;
        HiddenDesire: size = size.createNegativeInfinite();
        DesiredSize: size = new size();
        RenderSize: size = new size();
        VisualOffset: Point = new Point();
        ActualHeight: number = NaN;
        ActualWidth: number = NaN;
        AbsoluteXform: number[] = mat3.identity();
        LayoutXform: number[] = mat3.identity();
        LocalXform: number[] = mat3.identity();
        RenderXform: number[] = mat3.identity();
        LocalProjection: number[] = mat4.identity();
        AbsoluteProjection: number[] = mat4.identity();
        RenderProjection: number[] = mat4.identity();
        TotalOpacity: number = 1.0;
        TotalIsRenderVisible: bool = true;
        TotalIsHitTestVisible: bool = true;
        Extents: rect = new rect();
        ExtentsWithChildren: rect = new rect();
        Bounds: rect = new rect();
        BoundsWithChildren: rect = new rect();
        GlobalBounds: rect = new rect();
        GlobalBoundsWithChildren: rect = new rect();
        SurfaceBounds: rect = new rect();
        SurfaceBoundsWithChildren: rect = new rect();
        LayoutClipBounds: rect = new rect();
        EffectPadding: Thickness = new Thickness();
        ClipBounds: rect = new rect();
        IsContainer: bool = false;
        IsLayoutContainer: bool = false;
        BreaksLayoutClipRender: bool = false;
        Flags: Fayde.UIElementFlags = Fayde.UIElementFlags.RenderVisible | Fayde.UIElementFlags.HitTestVisible;
        DirtyFlags: _Dirty = 0;
        InUpDirty: bool = false;
        InDownDirty: bool = false;
        DirtyRegion: rect = new rect();
        private _ForceInvalidateOfNewBounds: bool = false;
        constructor(public Node: UINode) { }
        OnIsAttachedChanged(newIsAttached: bool, visualParentNode: UINode) {
            this.UpdateTotalRenderVisibility();
            if (!newIsAttached) {
                this._CacheInvalidateHint();
                var surface = this.Surface;
                if (surface) surface.OnNodeDetached(this);
            }
        }
        OnAddedToTree() {
            this.UpdateTotalRenderVisibility();
            this.UpdateTotalHitTestVisibility();
            this.Invalidate();
            this.SetLayoutClip(undefined);
            size.clear(this.RenderSize);
            this.UpdateTransform();
            this.UpdateProjection();
            this.InvalidateMeasure();
            this.InvalidateArrange();
            if (this._HasFlag(UIElementFlags.DirtySizeHint) || this.LastRenderSize !== undefined)
                this._PropagateFlagUp(UIElementFlags.DirtySizeHint);
        }
        OnRemovedFromTree() {
            this.LayoutSlot = new rect();
            this.SetLayoutClip(undefined);
        }
        SetContainerMode(isLayoutContainer: bool, isContainer?: bool) {
            if (isLayoutContainer != null)
                this.IsLayoutContainer = isLayoutContainer;
            if (isContainer != null)
                this.IsContainer = isContainer;
            else
                this.IsContainer = isLayoutContainer;
        }
        HasMeasureArrangeHint(): bool {
            return (this.Flags & (UIElementFlags.DirtyMeasureHint | UIElementFlags.DirtyArrangeHint)) > 0;
        }
        ProcessDown() {
            var thisNode = this.Node;
            var thisUie = thisNode.XObject;
            var visualParentNode = thisNode.VisualParentNode;
            var visualParentLu: Fayde.LayoutUpdater;
            if (visualParentNode)
                visualParentLu = visualParentNode.LayoutUpdater;
            var f = this.DirtyFlags;
            /*
            DirtyDebug.Level++;
            DirtyDebug("[" + uie.__DebugToString() + "]" + uie.__DebugDownDirtyFlags());
            */
            if (f & rvFlag) {
                f &= ~rvFlag;
                var ovisible = this.TotalIsRenderVisible;
                this.UpdateBounds();
                if (visualParentLu)
                    visualParentLu.UpdateBounds();
                this.UpdateRenderVisibility(visualParentLu);
                if (!this.TotalIsRenderVisible)
                    this._CacheInvalidateHint();
                if (ovisible !== this.TotalIsRenderVisible)
                    this.Surface._AddDirtyElement(this, dirtyEnum.NewBounds);
                this._PropagateDirtyFlagToChildren(rvFlag);
            }
            if (f & htvFlag) {
                f &= ~htvFlag;
                this.UpdateHitTestVisibility(visualParentLu);
                this._PropagateDirtyFlagToChildren(htvFlag);
            }
            var isLT = f & localTransformFlag;
            var isLP = f & localProjectionFlag;
            var isT = isLT || isLP || f & transformFlag;
            f &= ~(localTransformFlag | localProjectionFlag | transformFlag);
            if (isLT) {
                this.ComputeLocalTransform(thisUie);
            }
            if (isLP) {
                this.ComputeLocalProjection(thisUie);
            }
            if (isT) {
                this.ComputeTransform(thisNode, visualParentLu);
                if (visualParentLu)
                    visualParentLu.UpdateBounds();
                this._PropagateDirtyFlagToChildren(dirtyEnum.Transform);
            }
            var isLocalClip = f & localClipFlag;
            var isClip = isLocalClip || f & clipFlag;
            f &= ~(localClipFlag | clipFlag);
            if (isClip)
                this._PropagateDirtyFlagToChildren(dirtyEnum.Clip);
            if (f & dirtyEnum.ChildrenZIndices) {
                f &= ~dirtyEnum.ChildrenZIndices;
                thisNode._ResortChildrenByZIndex();
            }
            this.DirtyFlags = f;
            return !(f & downDirtyFlag);
        }
        ProcessUp(): bool {
            var thisNode = this.Node;
            var visualParentNode = thisNode.VisualParentNode;
            var visualParentLu: Fayde.LayoutUpdater;
            if (visualParentNode)
                visualParentLu = visualParentNode.LayoutUpdater;
            var f = this.DirtyFlags;
            var invalidateSubtreePaint = false;
            if (f & dirtyEnum.Bounds) {
                f &= ~dirtyEnum.Bounds;
                var oextents = rect.clone(this.ExtentsWithChildren);
                var oglobalbounds = rect.clone(this.GlobalBoundsWithChildren);
                var osubtreebounds = rect.clone(this.SurfaceBoundsWithChildren);
                if ((<IBoundsComputable><any>thisNode).ComputeBounds)
                    (<IBoundsComputable><any>thisNode).ComputeBounds(this.ComputeBounds, this);
                else
                    this.ComputeBounds();
                if (!rect.isEqual(oglobalbounds, this.GlobalBoundsWithChildren)) {
                    if (visualParentLu) {
                        visualParentLu.UpdateBounds();
                        visualParentLu.Invalidate(osubtreebounds);
                        visualParentLu.Invalidate(this.SurfaceBoundsWithChildren);
                    }
                }
                invalidateSubtreePaint = !rect.isEqual(oextents, this.ExtentsWithChildren) || this._ForceInvalidateOfNewBounds;
                this._ForceInvalidateOfNewBounds = false;
            }
            if (f & dirtyEnum.NewBounds) {
                if (visualParentLu)
                    visualParentLu.Invalidate(this.SurfaceBoundsWithChildren);
                else if (thisNode.IsTopLevel)
                    invalidateSubtreePaint = true;
                f &= ~dirtyEnum.NewBounds;
            }
            if (invalidateSubtreePaint)
                this.Invalidate(this.SurfaceBoundsWithChildren);
            if (f & dirtyEnum.Invalidate) {
                f &= ~dirtyEnum.Invalidate;
                var dirty = this.DirtyRegion;
                if (visualParentLu) {
                    visualParentLu.Invalidate(dirty);
                } else {
                    if (thisNode.IsAttached) {
                        this.Surface._Invalidate(dirty);
                        /*
                        OPTIMIZATION NOT IMPLEMENTED
                        var count = dirty.GetRectangleCount();
                        for (var i = count - 1; i >= 0; i--) {
                        surface._Invalidate(dirty.GetRectangle(i));
                        }
                        */
                    }
                }
                rect.clear(dirty);
            }
            this.DirtyFlags = f;
            return !(f & upDirtyFlag);
        }
        private _PropagateDirtyFlagToChildren(dirt: _Dirty) {
            var enumerator = this.Node.GetVisualTreeEnumerator();
            var s = this.Surface;
            while (enumerator.MoveNext()) {
                s._AddDirtyElement((<UINode>enumerator.Current).LayoutUpdater, dirt);
            }
        }
        FullInvalidate(invTransforms?: bool) {
            this.Invalidate();
            if (invTransforms) {
                this.UpdateTransform();
                this.UpdateProjection();
            }
            this.UpdateBounds(true);
        }
        Invalidate(r?: rect) {
            if (!r)
                r = this.SurfaceBounds;
            if (!this.TotalIsRenderVisible || (this.TotalOpacity * 255) < 0.5)
                return;
            if (this.Node.IsAttached) {
                this.Surface._AddDirtyElement(this, _Dirty.Invalidate);
                this.InvalidateBitmapCache();
                if (false) {
                    rect.union(this.DirtyRegion, this.SurfaceBoundsWithChildren);
                } else {
                    rect.union(this.DirtyRegion, r);
                }
            }
        }
        private _CacheInvalidateHint() {
        }
        ComputeComposite() {
        }
        InvalidateBitmapCache() {
        }
        InvalidateMeasure() {
            this.DirtyFlags |= _Dirty.Measure;
            this._PropagateFlagUp(UIElementFlags.DirtyMeasureHint);
        }
        InvalidateArrange() {
            this.DirtyFlags |= _Dirty.Arrange;
            this._PropagateFlagUp(UIElementFlags.DirtyArrangeHint);
        }
        InvalidateSubtreePaint() {
            this.Invalidate(this.SurfaceBoundsWithChildren);
        }
        UpdateTransform() {
            if (this.Node.IsAttached)
                this.Surface._AddDirtyElement(this, _Dirty.LocalTransform);
        }
        ComputeLocalTransform(uie: UIElement) {
            var transform = uie.RenderTransform;
            if (!transform)
                return;
            var transformOrigin: IPoint;
            if (uie instanceof Controls.TextBlock)
                transformOrigin = this.GetTextBlockTransformOrigin(<Controls.TextBlock>uie);
            else
                transformOrigin = this.GetTransformOrigin(uie);
            mat3.identity(this.LocalXform);
            var render = mat3.create();
            mat3.set(transform.Value._Raw, render);
            mat3.translate(this.LocalXform, transformOrigin.X, transformOrigin.Y);
            mat3.multiply(this.LocalXform, render, this.LocalXform); //local = render * local
            mat3.translate(this.LocalXform, -transformOrigin.X, -transformOrigin.Y);
        }
        ComputeLocalProjection(uie: UIElement) {
            var projection = uie.Projection;
            if (!projection) {
                Controls.Panel.SetZ(uie, NaN);
                return;
            }
            var objectSize: ISize = (uie instanceof Shapes.Shape) ? this._GetShapeBrushSize(<Shapes.Shape>uie) : this._GetBrushSize();
            var z = projection.GetDistanceFromXYPlane(objectSize);
            Controls.Panel.SetZ(uie, z);
        }
        ComputeTransform(uin: UINode, vplu: LayoutUpdater) {
            var uie = uin.XObject;
            var projection = uie.Projection;
            var oldProjection = mat4.clone(this.LocalProjection);
            var old = mat3.clone(this.AbsoluteXform);
            var renderXform = mat3.identity(this.RenderXform);
            mat4.identity(this.LocalProjection);
            this._CarryParentTransform(vplu, uin.ParentNode);
            mat3.multiply(renderXform, this.LayoutXform, renderXform); //render = layout * render
            mat3.multiply(renderXform, this.LocalXform, renderXform); //render = local * render
            var m = mat3.toAffineMat4(renderXform);
            mat4.multiply(this.LocalProjection, m, this.LocalProjection); //local = m * local
            if (false) {
            } else {
                mat3.multiply(this.AbsoluteXform, this.RenderXform, this.AbsoluteXform); //abs = render * abs
            }
            if (projection) {
                m = projection.GetTransform();
                mat4.multiply(m, this.LocalProjection, this.LocalProjection); //local = local * m
                this.Flags |= UIElementFlags.RenderProjection;
            }
            mat4.multiply(this.LocalProjection, this.AbsoluteProjection, this.AbsoluteProjection); //abs = abs * local
            if (uin instanceof Controls.Primitives.PopupNode) {
                var popupChildNode = <UINode>(<Controls.Primitives.PopupNode>uin).SubtreeNode;
                if (popupChildNode)
                    popupChildNode.LayoutUpdater.UpdateTransform();
            }
            if (!mat4.equal(oldProjection, this.LocalProjection)) {
                if (vplu)
                    vplu.Invalidate(this.SurfaceBoundsWithChildren);
                else if (uin.IsTopLevel)
                    this.InvalidateSubtreePaint();
                if (uin.IsAttached)
                    this.Surface._AddDirtyElement(this, _Dirty.NewBounds);
            }
            mat4.set(this.LocalProjection, this.RenderProjection);
            this.UpdateBounds();
            this.ComputeComposite();
        }
        private _CarryParentTransform(vpLu: LayoutUpdater, parentNode: XamlNode) {
            if (vpLu) {
                mat3.set(vpLu.AbsoluteXform, this.AbsoluteXform);
                mat4.set(vpLu.AbsoluteProjection, this.AbsoluteProjection);
                return;
            }
            mat3.identity(this.AbsoluteXform);
            mat4.identity(this.AbsoluteProjection);
            if (parentNode instanceof Controls.Primitives.PopupNode) {
                var popupNode = <Controls.Primitives.PopupNode>parentNode;
                var elNode: UINode = popupNode;
                while (elNode) {
                    this.Flags |= (elNode.LayoutUpdater.Flags & UIElementFlags.RenderProjection);
                    elNode = elNode.VisualParentNode;
                }
                var popup = popupNode.XObject;
                var popupLu = popupNode.LayoutUpdater;
                if (this.Flags & UIElementFlags.RenderProjection) {
                    mat4.set(popupLu.AbsoluteProjection, this.LocalProjection);
                    var m = mat4.createTranslate(popup.HorizontalOffset, popup.VerticalOffset, 0.0);
                    mat4.multiply(m, this.LocalProjection, this.LocalProjection); //local = local * m
                } else {
                    var pap = popupLu.AbsoluteProjection;
                    var renderXform = this.RenderXform;
                    renderXform[0] = pap[0];
                    renderXform[1] = pap[1];
                    renderXform[2] = pap[3];
                    renderXform[3] = pap[4];
                    renderXform[4] = pap[5];
                    renderXform[5] = pap[7];
                    mat3.translate(renderXform, popup.HorizontalOffset, popup.VerticalOffset);
                }
            }
        }
        UpdateProjection() {
            if (this.Node.IsAttached)
                this.Surface._AddDirtyElement(this, _Dirty.LocalProjection);
        }
        TransformPoint(p: Point) {
            var inverse: number[] = mat4.inverse(this.AbsoluteProjection, mat4.create());
            if (!inverse) {
                Warn("Could not get inverse of Absolute Projection for UIElement.");
                return;
            }
            var p4: number[] = vec4.createFrom(p.X, p.Y, 0.0, 1.0);
            var m20 = inverse[2];
            var m21 = inverse[6];
            var m22 = inverse[10];
            var m23 = inverse[14];
            p4[2] = -(m20 * p4[0] + m21 * p4[1] + m23) / m22;
            mat4.transformVec4(inverse, p4);
            p.X = p4[0] / p4[3];
            p.Y = p4[1] / p4[3];
        }
        TransformToVisual(toUin: UINode): Media.GeneralTransform {
            var result = mat4.create();
            if (toUin) {
                var inverse = mat4.create();
                mat4.inverse(toUin.LayoutUpdater.AbsoluteProjection, inverse);
                mat4.multiply(this.AbsoluteProjection, inverse, result); //result = inverse * abs
            } else {
                mat4.set(this.AbsoluteProjection, result); //result = absolute
            }
            var raw = mat4.toAffineMat3(result);
            if (raw) {
                var mt = new Media.MatrixTransform();
                mt._Store.SetValue(Media.MatrixTransform.MatrixProperty, new Media.Matrix(raw));
                return mt;
            }
            return new Media.InternalTransform(result);
        }
        GetTransformOrigin(uie: UIElement): IPoint {
            var userXformOrigin = uie.RenderTransformOrigin;
            if (!userXformOrigin)
                return { X: 0, Y: 0 };
            return { X: this.ActualWidth * userXformOrigin.X, Y: this.ActualHeight * userXformOrigin.Y };
        }
        GetTextBlockTransformOrigin(tb: Controls.TextBlock): IPoint {
            var userXformOrigin = tb.RenderTransformOrigin;
            if (!userXformOrigin)
                return { X: 0, Y: 0 };
            var xformSize = this.CoerceSize(this.RenderSize);
            return {
                X: xformSize.Width * userXformOrigin.X,
                Y: xformSize.Height * userXformOrigin.Y
            };
        }
        UpdateRenderVisibility(vpLu: Fayde.LayoutUpdater) {
            var uie = this.Node.XObject;
            if (vpLu) {
                var vp = vpLu.Node.XObject;
                this.TotalOpacity = vpLu.TotalOpacity * uie.Opacity;
                this.TotalIsRenderVisible = (vp.Visibility === 0) && (uie.Visibility === 0);
            } else {
                this.TotalOpacity = uie.Opacity;
                this.TotalIsRenderVisible = (uie.Visibility === 0);
            }
        }
        UpdateTotalRenderVisibility() {
            if (this.Node.IsAttached)
                this.Surface._AddDirtyElement(this, _Dirty.RenderVisibility);
        }
        UpdateHitTestVisibility(vpLu: Fayde.LayoutUpdater) {
            var uie = this.Node.XObject;
            if (vpLu) {
                this.TotalIsHitTestVisible = vpLu.TotalIsHitTestVisible && uie.IsHitTestVisible;
            } else {
                this.TotalIsHitTestVisible = uie.IsHitTestVisible;
            }
        }
        UpdateTotalHitTestVisibility() {
            if (this.Node.IsAttached)
                this.Surface._AddDirtyElement(this, _Dirty.HitTestVisibility);
        }
        UpdateBounds(forceRedraw?: bool) {
            if (this.Node.IsAttached)
                this.Surface._AddDirtyElement(this, _Dirty.Bounds);
            this._ForceInvalidateOfNewBounds = this._ForceInvalidateOfNewBounds || forceRedraw;
        }
        ComputeBounds() {
            var s = this.CoerceSize(size.fromRaw(this.ActualWidth, this.ActualHeight));
            rect.set(this.Extents, 0, 0, s.Width, s.Height);
            rect.copyTo(this.Extents, this.ExtentsWithChildren);
            var node = this.Node;
            var enumerator = node.GetVisualTreeEnumerator();
            while (enumerator.MoveNext()) {
                var item = <UINode>enumerator.Current;
                var itemlu = item.LayoutUpdater;
                if (itemlu.TotalIsRenderVisible)
                    rect.union(this.ExtentsWithChildren, itemlu.GlobalBoundsWithChildren);
            }
            this.IntersectBoundsWithClipPath(this.Bounds, this.AbsoluteXform);
            rect.copyGrowTransform(this.BoundsWithChildren, this.ExtentsWithChildren, this.EffectPadding, this.AbsoluteXform);
            this.ComputeGlobalBounds();
            this.ComputeSurfaceBounds();
        }
        ComputeGlobalBounds() {
            this.IntersectBoundsWithClipPath(this.GlobalBounds, this.LocalXform);
            rect.copyGrowTransform4(this.GlobalBoundsWithChildren, this.ExtentsWithChildren, this.EffectPadding, this.LocalProjection);
        }
        ComputeSurfaceBounds() {
            this.IntersectBoundsWithClipPath(this.SurfaceBounds, this.AbsoluteXform);
            rect.copyGrowTransform4(this.SurfaceBoundsWithChildren, this.ExtentsWithChildren, this.EffectPadding, this.AbsoluteProjection);
        }
        IntersectBoundsWithClipPath(dest: rect, xform: number[]) {
            var isClipEmpty = rect.isEmpty(this.ClipBounds);
            var isLayoutClipEmpty = rect.isEmpty(this.LayoutClipBounds);
            if ((!isClipEmpty || !isLayoutClipEmpty) && !this.TotalIsRenderVisible) {
                rect.clear(dest);
                return;
            }
            rect.copyGrowTransform(dest, this.Extents, this.EffectPadding, xform);
            if (!isClipEmpty)
                rect.intersection(dest, this.ClipBounds);
            if (!isLayoutClipEmpty)
                rect.intersection(dest, this.LayoutClipBounds);
        }
        SetLayoutClip(layoutClip: Media.Geometry) {
            this.LayoutClip = layoutClip;
            if (!layoutClip)
                rect.clear(this.LayoutClipBounds);
            else
                rect.copyTo(layoutClip.GetBounds(), this.LayoutClipBounds);
        }
        UpdateLayer(pass: Fayde.ILayoutPass, error: BError) {
            var elNode = this.Node;
            var parentNode: Fayde.UINode;
            while (parentNode = elNode.VisualParentNode)
                elNode = parentNode;
            var element = elNode.XObject;
            var layout = elNode.LayoutUpdater;
            var lu: Fayde.LayoutUpdater;
            while (pass.Count < maxPassCount) {
                while (lu = pass.ArrangeList.shift()) {
                    lu._PropagateFlagUp(UIElementFlags.DirtyArrangeHint);
                }
                while (lu = pass.SizeList.shift()) {
                    lu._PropagateFlagUp(UIElementFlags.DirtySizeHint);
                }
                pass.Count = pass.Count + 1;
                var flag = UIElementFlags.None;
                if (element.Visibility === Fayde.Visibility.Visible) {
                    if (layout._HasFlag(UIElementFlags.DirtyMeasureHint))
                        flag = UIElementFlags.DirtyMeasureHint;
                    else if (layout._HasFlag(UIElementFlags.DirtyArrangeHint))
                        flag = UIElementFlags.DirtyArrangeHint;
                    else if (layout._HasFlag(UIElementFlags.DirtySizeHint))
                        flag = UIElementFlags.DirtySizeHint;
                }
                if (flag !== UIElementFlags.None) {
                    var measureWalker = Fayde.DeepTreeWalker(elNode);
                    var childNode: Fayde.UINode;
                    while (childNode = measureWalker.Step()) {
                        lu = childNode.LayoutUpdater;
                        if (childNode.XObject.Visibility !== Fayde.Visibility.Visible || !lu._HasFlag(flag)) {
                            measureWalker.SkipBranch();
                            continue;
                        }
                        lu._ClearFlag(flag);
                        switch (flag) {
                            case UIElementFlags.DirtyMeasureHint:
                                if (lu.DirtyFlags & _Dirty.Measure)
                                    pass.MeasureList.push(lu);
                                break;
                            case UIElementFlags.DirtyArrangeHint:
                                if (lu.DirtyFlags & _Dirty.Arrange)
                                    pass.ArrangeList.push(lu);
                                break;
                            case UIElementFlags.DirtySizeHint:
                                if (lu.LastRenderSize !== undefined)
                                    pass.SizeList.push(lu);
                                break;
                            default:
                                break;
                        }
                    }
                }
                if (flag === UIElementFlags.DirtyMeasureHint) {
                    while (lu = pass.MeasureList.shift()) {
                        lu._DoMeasureWithError(error);
                        pass.Updated = true;
                    }
                } else if (flag === UIElementFlags.DirtyArrangeHint) {
                    while (lu = pass.ArrangeList.shift()) {
                        lu._DoArrangeWithError(error);
                        pass.Updated = true;
                        if (layout._HasFlag(UIElementFlags.DirtyMeasureHint))
                            break;
                    }
                } else if (flag === UIElementFlags.DirtySizeHint) {
                    while (lu = pass.SizeList.shift()) {
                        pass.Updated = true;
                        lu._UpdateActualSize();
                    }
                } else {
                    break;
                }
            }
        }
        private _UpdateActualSize() {
            var last = this.LastRenderSize;
            var fe = <FrameworkElement>this.Node.XObject;
            var s: size;
            if ((<IActualSizeComputable><any>fe).ComputeActualSize)
                s = (<IActualSizeComputable><any>fe).ComputeActualSize(this._ComputeActualSize, this);
            else
                s = this._ComputeActualSize();
            this.ActualWidth = s.Width;
            this.ActualHeight = s.Height;
            if (last && size.isEqual(last, s))
                return;
            this.LastRenderSize = s;
            fe.SizeChanged.Raise(fe, new SizeChangedEventArgs(last, s));
        }
        private _ComputeActualSize(): size {
            var node = this.Node;
            if (node.XObject.Visibility !== Fayde.Visibility.Visible)
                return new size();
            var parentNode = node.VisualParentNode;
            if ((parentNode && !(parentNode.XObject instanceof Controls.Canvas)) || this.IsLayoutContainer)
                return size.clone(this.RenderSize);
            return this.CoerceSize(new size());
        }
        private _GetBrushSize(): ISize {
            return {
                Width: this.ActualWidth,
                Height: this.ActualHeight
            };
        }
        private _GetShapeBrushSize(shape: Shapes.Shape): ISize {
            return size.fromRect(shape.XamlNode.GetStretchExtents(shape, this));
        }
        CoerceSize(s: size): size {
            var fe = <FrameworkElement>this.Node.XObject;
            var spw = fe.Width;
            var sph = fe.Height;
            var minw = fe.MinWidth;
            var minh = fe.MinHeight;
            var cw = minw;
            var ch = minh;
            cw = Math.max(cw, s.Width);
            ch = Math.max(ch, s.Height);
            if (!isNaN(spw))
                cw = spw;
            if (!isNaN(sph))
                ch = sph;
            cw = Math.max(Math.min(cw, fe.MaxWidth), minw);
            ch = Math.max(Math.min(ch, fe.MaxHeight), minh);
            if (fe.UseLayoutRounding) {
                cw = Math.round(cw);
                ch = Math.round(ch);
            }
            s.Width = cw;
            s.Height = ch;
            return s;
        }
        private _HasFlag(flag: Fayde.UIElementFlags): bool { return (this.Flags & flag) === flag; }
        private _ClearFlag(flag: Fayde.UIElementFlags) { this.Flags &= ~flag; }
        private _SetFlag(flag: Fayde.UIElementFlags) { this.Flags |= flag; }
        private _PropagateFlagUp(flag: Fayde.UIElementFlags) {
            this.Flags |= flag;
            var node = this.Node;
            var lu: Fayde.LayoutUpdater;
            while ((node = node.VisualParentNode) && (lu = node.LayoutUpdater) && !lu._HasFlag(flag)) {
                lu.Flags |= flag;
            }
        }
        private _DoMeasureWithError(error: BError) {
            var last = this.PreviousConstraint;
            var node = this.Node;
            var visualParentNode = node.VisualParentNode;
            if (!node.IsAttached && !last && !visualParentNode && this.IsLayoutContainer) {
                last = size.createInfinite();
            }
            if (last) {
                var previousDesired = size.clone(this.DesiredSize);
                this._Measure(last, error);
                if (size.isEqual(previousDesired, this.DesiredSize))
                    return;
            }
            if (visualParentNode)
                visualParentNode.LayoutUpdater.InvalidateMeasure();
            this.DirtyFlags &= ~_Dirty.Measure;
        }
        _Measure(availableSize: size, error: BError) {
            if (error.Message)
                return;
            var node = <FENode>this.Node;
            var fe = node.XObject;
            if (isNaN(availableSize.Width) || isNaN(availableSize.Height)) {
                error.Message = "Cannot call Measure using a size with NaN values";
                LayoutUpdater.LayoutExceptionUpdater = this;
                return;
            }
            var last = this.PreviousConstraint;
            var shouldMeasure = (this.DirtyFlags & _Dirty.Measure) > 0;
            shouldMeasure = shouldMeasure || (!last || last.Width !== availableSize.Width || last.Height !== availableSize.Height);
            if (fe.Visibility !== Fayde.Visibility.Visible) {
                this.PreviousConstraint = availableSize;
                size.clear(this.DesiredSize);
                return;
            }
            node._ApplyTemplateWithError(error);
            if (!shouldMeasure)
                return;
            this.PreviousConstraint = availableSize;
            this.InvalidateArrange();
            this.UpdateBounds();
            var s = size.clone(availableSize);
            var margin = fe.Margin;
            if (margin)
                size.shrinkByThickness(s, margin);
            this.CoerceSize(s);
            if ((<any>fe).MeasureOverride) {
                s = (<IMeasurable><any>fe).MeasureOverride(s);
            } else {
                s = (<IMeasurableHidden>fe)._MeasureOverride(s, error);
            }
            if (error.Message)
                return;
            this.DirtyFlags &= ~_Dirty.Measure;
            this.HiddenDesire = size.clone(s);
            var visualParentNode = node.VisualParentNode;
            if (!visualParentNode || visualParentNode instanceof Controls.CanvasNode) {
                if (node instanceof Controls.CanvasNode || !this.IsLayoutContainer) {
                    size.clear(this.DesiredSize);
                    return;
                }
            }
            this.CoerceSize(s);
            if (margin)
                size.growByThickness(s, margin);
            size.min(s, availableSize);
            if (fe.UseLayoutRounding) {
                s.Width = Math.round(s.Width);
                s.Height = Math.round(s.Height);
            }
            size.copyTo(s, this.DesiredSize);
        }
        private _DoArrangeWithError(error: BError) {
            var last = this.LayoutSlot;
            if (last === null)
                last = undefined;
            var n = <FENode>this.Node;
            var fe = n.XObject;
            var visualParentNode = n.VisualParentNode;
            if (!visualParentNode) {
                var surface = this.Surface;
                var desired: size;
                if (this.IsLayoutContainer) {
                    desired = size.clone(this.DesiredSize);
                    if (n.IsAttached && n.IsTopLevel && !n.ParentNode) {
                        var measure = this.PreviousConstraint;
                        if (measure)
                            size.max(desired, measure);
                        else
                            desired = size.clone(surface.Extents);
                    }
                } else {
                    desired.Width = fe.ActualWidth;
                    desired.Height = fe.ActualHeight;
                }
                var viewport = rect.fromSize(desired);
                viewport.X = Controls.Canvas.GetLeft(fe);
                viewport.Y = Controls.Canvas.GetTop(fe);
                last = viewport;
            }
            if (last) {
                this._Arrange(last, error);
            } else {
                if (visualParentNode)
                    visualParentNode.LayoutUpdater.InvalidateArrange();
            }
        }
        _Arrange(finalRect: rect, error: BError) {
            if (error.Message)
                return;
            var node = <FENode>this.Node;
            var fe = node.XObject;
            if (fe.UseLayoutRounding) {
                rect.round(finalRect);
            }
            if (finalRect.Width < 0 || finalRect.Height < 0
                    || !isFinite(finalRect.Width) || !isFinite(finalRect.Height)
                    || isNaN(finalRect.Width) || isNaN(finalRect.Height)) {
                var desired = this.DesiredSize;
                error.Number = BError.Argument;
                error.Message = "Invalid arguments to Arrange. Desired = " + desired.toString();
                return;
            }
            if (fe.Visibility !== Fayde.Visibility.Visible) {
                this.LayoutSlot = finalRect;
                return;
            }
            var slot = this.LayoutSlot;
            var shouldArrange = (this.DirtyFlags & _Dirty.Arrange) > 0 || !slot || !rect.isEqual(slot, finalRect);
            if (!shouldArrange)
                return;
            var measure = this.PreviousConstraint;
            if (this.IsContainer && !measure) {
                this._Measure(size.fromRect(finalRect), error);
            }
            measure = this.PreviousConstraint;
            this.SetLayoutClip(undefined);
            var childRect = rect.clone(finalRect);
            var margin = fe.Margin;
            if (margin)
                rect.shrinkByThickness(childRect, margin);
            this.UpdateTransform();
            this.UpdateProjection();
            this.UpdateBounds();
            var offer = size.clone(this.HiddenDesire);
            var stretched = this.CoerceSize(size.fromRect(childRect));
            var framework = this.CoerceSize(new size());
            var horiz = fe.HorizontalAlignment;
            var vert = fe.VerticalAlignment;
            if (horiz === HorizontalAlignment.Stretch)
                framework.Width = Math.max(framework.Width, stretched.Width);
            if (vert === VerticalAlignment.Stretch)
                framework.Height = Math.max(framework.Height, stretched.Height);
            size.max(offer, framework);
            this.LayoutSlot = finalRect;
            var response: size;
            if ((<any>fe).ArrangeOverride) {
                response = (<IArrangeable><any>fe).ArrangeOverride(offer);
            } else {
                response = (<IArrangeableHidden>fe)._ArrangeOverride(offer, error);
            }
            if (horiz === HorizontalAlignment.Stretch)
                response.Width = Math.max(response.Width, framework.Width);
            if (vert === VerticalAlignment.Stretch)
                response.Height = Math.max(response.Height, framework.Height);
            var flipHoriz = false;
            var flowDirection = fe.FlowDirection;
            var visualParentNode = <FENode>node.VisualParentNode;
            if (visualParentNode)
                flipHoriz = visualParentNode.XObject.FlowDirection !== flowDirection;
            else if (node.ParentNode instanceof Controls.Primitives.PopupNode)
                flipHoriz = (<Controls.Primitives.PopupNode>node.ParentNode).XObject.FlowDirection !== flowDirection;
            else
                flipHoriz = flowDirection === FlowDirection.RightToLeft;
            var layoutXform = mat3.identity(this.LayoutXform);
            mat3.translate(layoutXform, childRect.X, childRect.Y);
            if (flipHoriz) {
                mat3.translate(layoutXform, offer.Width, 0);
                mat3.scale(layoutXform, -1, 1);
            }
            if (error.Message)
                return;
            this.DirtyFlags &= ~_Dirty.Arrange;
            var visualOffset = this.VisualOffset;
            visualOffset.X = childRect.X;
            visualOffset.Y = childRect.Y;
            var oldSize = size.clone(this.RenderSize);
            if (fe.UseLayoutRounding) {
                response.Width = Math.round(response.Width);
                response.Height = Math.round(response.Height);
            }
            size.copyTo(response, this.RenderSize);
            var constrainedResponse = this.CoerceSize(size.clone(response));
            size.min(constrainedResponse, response);
            if (!visualParentNode || visualParentNode instanceof Controls.CanvasNode) {
                if (!this.IsLayoutContainer) {
                    size.clear(this.RenderSize);
                    return;
                }
            }
            var isTopLevel = node.IsAttached && node.IsTopLevel;
            if (!isTopLevel) {
                switch (horiz) {
                    case HorizontalAlignment.Left:
                        break;
                    case HorizontalAlignment.Right:
                        visualOffset.X += childRect.Width - constrainedResponse.Width;
                        break;
                    case HorizontalAlignment.Center:
                        visualOffset.X += (childRect.Width - constrainedResponse.Width) * 0.5;
                        break;
                    default:
                        visualOffset.X += Math.max((childRect.Width - constrainedResponse.Width) * 0.5, 0);
                        break;
                }
                switch (vert) {
                    case VerticalAlignment.Top:
                        break;
                    case VerticalAlignment.Bottom:
                        visualOffset.Y += childRect.Height - constrainedResponse.Height;
                        break;
                    case VerticalAlignment.Center:
                        visualOffset.Y += (childRect.Height - constrainedResponse.Height) * 0.5;
                        break;
                    default:
                        visualOffset.Y += Math.max((childRect.Height - constrainedResponse.Height) * 0.5, 0);
                        break;
                }
            }
            if (fe.UseLayoutRounding) {
                visualOffset.X = Math.round(visualOffset.X);
                visualOffset.Y = Math.round(visualOffset.Y);
            }
            layoutXform = mat3.identity(this.LayoutXform);
            mat3.translate(layoutXform, visualOffset.X, visualOffset.Y);
            if (flipHoriz) {
                mat3.translate(layoutXform, response.Width, 0);
                mat3.scale(layoutXform, -1, 1);
            }
            var element = new rect();
            element.Width = response.Width;
            element.Height = response.Height;
            var layoutClip = rect.clone(childRect);
            layoutClip.X = Math.max(childRect.X - visualOffset.X, 0);
            layoutClip.Y = Math.max(childRect.Y - visualOffset.Y, 0);
            if (fe.UseLayoutRounding) {
                layoutClip.X = Math.round(layoutClip.X);
                layoutClip.Y = Math.round(layoutClip.Y);
            }
            if (((!isTopLevel && rect.isRectContainedIn(element, layoutClip)) || !size.isEqual(constrainedResponse, response))
                && !(node instanceof Controls.CanvasNode) && ((visualParentNode && !(visualParentNode instanceof Controls.CanvasNode)) || this.IsContainer)) {
                var frameworkClip = this.CoerceSize(size.createInfinite());
                var frect = rect.fromSize(frameworkClip);
                rect.intersection(layoutClip, frect);
                var rectangle = new Media.RectangleGeometry();
                rectangle.Rect = layoutClip;
                this.SetLayoutClip(rectangle);
            }
            if (!size.isEqual(oldSize, response)) {
                if (!this.LastRenderSize) {
                    this.LastRenderSize = oldSize;
                    this._PropagateFlagUp(UIElementFlags.DirtySizeHint);
                }
            }
        }
        DoRender(ctx: Fayde.RenderContext, r: rect) {
            if (!this.TotalIsRenderVisible)
                return;
            if ((this.TotalOpacity * 255) < 0.5)
                return;
            var region = new rect();
            if (false) {
            } else {
                rect.copyTo(this.ExtentsWithChildren, region);
                rect.transform(region, this.RenderXform);
                rect.transform(region, ctx.CurrentTransform);
                rect.roundOut(region);
                rect.intersection(region, r);
            }
            if (rect.isEmpty(region))
                return;
            ctx.Save();
            ctx.TransformMatrix(this.RenderXform);
            ctx.CanvasContext.globalAlpha = this.TotalOpacity;
            var uie = this.Node.XObject;
            var canvasCtx = ctx.CanvasContext;
            var clip = uie.Clip;
            if (clip) {
                clip.Draw(ctx);
                canvasCtx.clip();
            }
            /*
            if (window.RenderDebug) {
                RenderDebug.Count++;
                RenderDebug(this.__DebugToString());
            }
            */
            var effect = uie.Effect;
            if (effect) {
                canvasCtx.save();
                effect.PreRender(ctx);
            }
            if ((<IRenderable><any>uie).Render)
                (<IRenderable><any>uie).Render(ctx, this, region);
            if (effect) {
                canvasCtx.restore();
            }
            var enumerator = this.Node.GetVisualTreeEnumerator(VisualTreeDirection.ZFoward);
            while (enumerator.MoveNext()) {
                (<UINode>enumerator.Current).LayoutUpdater.DoRender(ctx, region);
            }
            ctx.Restore();
        }
        _RenderLayoutClip(ctx: RenderContext) {
            var iX = 0;
            var iY = 0;
            var curNode = this.Node;
            while (curNode) {
                var lu = curNode.LayoutUpdater;
                var geom = lu.LayoutClip;
                if (geom)
                    ctx.ClipGeometry(geom);
                if (lu.BreaksLayoutClipRender) //Canvas or UserControl
                    break;
                var visualOffset = lu.VisualOffset;
                if (visualOffset) {
                    ctx.Translate(-visualOffset.X, -visualOffset.Y);
                    iX += visualOffset.X;
                    iY += visualOffset.Y;
                }
                curNode = curNode.VisualParentNode;
            }
            ctx.Translate(iX, iY);
        }
        _HasLayoutClip(): bool {
            var curNode = this.Node;
            var lu: LayoutUpdater;
            while (curNode) {
                lu = curNode.LayoutUpdater;
                if (lu.LayoutClip)
                    return true;
                if (lu.BreaksLayoutClipRender)
                    break;
                curNode = curNode.VisualParentNode;
            }
            return false;
        }
    }
    Nullstone.RegisterType(LayoutUpdater, "LayoutUpdater");
}

module Fayde {
    export class NameScope {
        IsRoot: bool = false;
        private XNodes = {};
        constructor(isRoot?: bool) {
            if (isRoot)
                this.IsRoot = isRoot;
        }
        FindName(name: string): XamlNode {
            return this.XNodes[name];
        }
        RegisterName(name: string, xnode: XamlNode) {
            var existing = this.XNodes[name];
            if (existing && existing !== xnode)
                throw new InvalidOperationException("Name is already registered.");
            this.XNodes[name] = xnode;
        }
        UnregisterName(name: string) {
            this.XNodes[name] = undefined;
        }
        Absorb(otherNs: NameScope) {
            var on = otherNs.XNodes;
            for (var name in on) {
                this.RegisterName(name, on[name]);
            }
        }
    }
    Nullstone.RegisterType(NameScope, "NameScope");
}

module Fayde {
    export class StaticResourceExpression extends Expression {
        Key: any;
        Target: XamlObject;
        Property: DependencyProperty;
        PropertyName: string;
        constructor(key, target: XamlObject, propd: DependencyProperty, propName: string, templateBindingSource: XamlObject) {
            super();
            this.Key = key;
            this.Target = target;
            this.Property = propd;
            this.PropertyName = propName;
        }
        GetValue(propd: DependencyProperty): any {
            return undefined;
        }
        private _GetValue(resChain: ResourceDictionary[]): any {
            var o: XamlObject;
            var key = this.Key;
            var len = resChain.length;
            for (var i = len - 1; i >= 0; i--) {
                o = resChain[i].Get(key);
                if (o)
                    return o;
            }
            var cur = this.Target;
            var rd: ResourceDictionary;
            var curNode = cur ? cur.XamlNode : null;
            while (curNode) {
                cur = curNode.XObject;
                if (cur instanceof FrameworkElement)
                    rd = (<FrameworkElement>cur).Resources;
                else if (cur instanceof ResourceDictionary)
                    rd = <ResourceDictionary>cur;
                if (rd && (o = rd.Get(key)))
                    return o;
                curNode = curNode.ParentNode;
            }
            return App.Instance.Resources.Get(key);
        }
        Resolve(parser: JsonParser, resChain: ResourceDictionary[]) {
            var isAttached = false;
            var ownerType;
            var propd = this.Property;
            if (propd) {
                isAttached = propd._IsAttached;
                ownerType = propd.OwnerType;
            }
            var value = this._GetValue(resChain);
            if (value instanceof ResourceTarget)
                value = value.CreateResource();
            if (!value)
                throw new XamlParseException("Could not resolve StaticResource: '" + this.Key.toString() + "'.");
            parser.TrySetPropertyValue(this.Target, propd, value, null, isAttached, ownerType, this.PropertyName);
        }
    }
    Nullstone.RegisterType(StaticResourceExpression, "StaticResourceExpression");
}

module Fayde {
    export class TemplateBindingExpression extends Expression {
        private _Target: DependencyObject;
        private _Listener: Providers.IPropertyChangedListener;
        SourceProperty: DependencyProperty;
        TargetProperty: DependencyProperty;
        TargetPropertyName: string;
        private _SetsParent: bool = false;
        constructor(sourcePropd: DependencyProperty, targetPropd: DependencyProperty, targetPropName: string) {
            super();
            this.SourceProperty = sourcePropd;
            this.TargetProperty = targetPropd;
            this.TargetPropertyName = targetPropName;
        }
        GetValue(propd: DependencyProperty) {
            var target = this._Target;
            var source = target.TemplateOwner;
            var value;
            if (source)
                value = source._Store.GetValue(this.SourceProperty);
            value = TypeConverter.ConvertObject(this.TargetProperty, value, (<any>target).constructor, true);
            return value;
        }
        OnAttached(dobj: DependencyObject) {
            super.OnAttached(dobj);
            this._Target = dobj;
            this._DetachListener();
            var cc: Controls.ContentControl;
            if (this._Target instanceof Controls.ContentControl)
                cc = <Controls.ContentControl>this._Target;
            if (cc && this.TargetProperty._ID === Controls.ContentControl.ContentProperty._ID) {
                this._SetsParent = cc._ContentSetsParent;
                cc._ContentSetsParent = false;
            }
            this._AttachListener();
        }
        OnDetached(dobj: DependencyObject) {
            super.OnDetached(dobj);
            var listener = this._Listener;
            if (!listener)
                return;
            var cc: Controls.ContentControl;
            if (this._Target instanceof Controls.ContentControl)
                cc = <Controls.ContentControl>this._Target;
            if (cc)
                cc._ContentSetsParent = this._SetsParent;
            this._DetachListener();
            this._Target = null;
        }
        OnSourcePropertyChanged(sender: DependencyObject, args: IDependencyPropertyChangedEventArgs) {
            if (this.SourceProperty._ID !== args.Property._ID)
                return;
            try {
                this.IsUpdating = true;
                var store = this._Target._Store;
                var targetProp = this.TargetProperty;
                try {
                    store.SetValue(targetProp, this.GetValue(null));
                } catch (err2) {
                    var val = targetProp.DefaultValue;
                    if (val === undefined)
                        val = targetProp._IsAutoCreated ? targetProp._AutoCreator.GetValue(targetProp, this._Target) : undefined;
                    store.SetValue(targetProp, val);
                }
            } catch (err) {
            } finally {
                this.IsUpdating = false;
            }
        }
        private _AttachListener() {
            var source = this._Target.TemplateOwner;
            if (!source)
                return;
            this._Listener = Fayde.ListenToPropertyChanged(source, this.SourceProperty, (sender, args) => this.OnSourcePropertyChanged(sender, args), this);
        }
        private _DetachListener() {
            var listener = this._Listener;
            if (listener) {
                this._Listener.Detach();
                this._Listener = null;
            }
        }
    }
    Nullstone.RegisterType(TemplateBindingExpression, "TemplateBindingExpression");
}

module Fayde {
    export enum VisualTreeDirection {
        Logical = 0,
        LogicalReverse = 1,
        ZFoward = 2,
        ZReverse = 3,
    }
    export interface IDataContextMonitor {
        Callback: (newDataContext: any) => void;
        Detach();
    }
    export interface IIsAttachedMonitor {
        Callback: (newIsAttached: bool) => void;
        Detach();
    }
    export class XamlNode {
        XObject: XamlObject;
        ParentNode: XamlNode = null;
        Name: string = "";
        NameScope: NameScope = null;
        private _OwnerNameScope: NameScope = null;
        private _LogicalChildren: XamlNode[] = [];
        private _DCMonitors: IDataContextMonitor[] = null;
        private _IAMonitors: IIsAttachedMonitor[] = null;
        constructor(xobj: XamlObject) {
            this.XObject = xobj;
        }
        private _DataContext: any = undefined;
        get DataContext(): any { return this._DataContext; }
        set DataContext(value: any) {
            var old = this._DataContext;
            if (old === value)
                return;
            this._DataContext = value;
            this.OnDataContextChanged(old, value);
        }
        OnDataContextChanged(oldDataContext: any, newDataContext: any) {
            var childNodes = this._LogicalChildren;
            var len = childNodes.length;
            var childNode: XamlNode = null;
            for (var i = 0; i < len; i++) {
                childNode = childNodes[i];
                childNode.DataContext = newDataContext;
            }
            var monitors = this._DCMonitors;
            if (!monitors) return;
            len = monitors.length;
            for (var i = 0; i < len; i++) {
                monitors[i].Callback(newDataContext);
            }
        }
        MonitorDataContext(func: (newDataContext: any) => void): IDataContextMonitor {
            var monitors = this._DCMonitors;
            if (!monitors) this._DCMonitors = monitors = [];
            var monitor: IDataContextMonitor = {
                Callback: func,
                Detach: null
            };
            monitor.Detach = function () {
                var index = monitors.indexOf(monitor);
                if (index > -1) monitors.splice(index, 1);
            };
            this._DCMonitors.push(monitor);
            return monitor;
        }
        FindName(name: string): XamlNode {
            var scope = this.FindNameScope();
            if (scope)
                return scope.FindName(name);
            if (this.ParentNode)
                this.ParentNode.FindName(name);
            return undefined;
        }
        SetName(name: string) {
            this.Name = name;
            var ns = this.FindNameScope();
            if (ns)
                ns.RegisterName(name, this);
        }
        FindNameScope(): NameScope {
            if (this._OwnerNameScope)
                return this._OwnerNameScope;
            var curNode = this;
            var ns;
            while (curNode) {
                ns = curNode.NameScope;
                if (ns) {
                    this._OwnerNameScope = ns;
                    return ns;
                }
                curNode = curNode.ParentNode;
            }
            return undefined;
        }
        IsAttached: bool = false;
        SetIsAttached(value: bool) {
            if (this.IsAttached === value)
                return;
            this.IsAttached = value;
            this.OnIsAttachedChanged(value);
        }
        OnIsAttachedChanged(newIsAttached: bool) {
            var childNodes = this._LogicalChildren;
            var len = childNodes.length;
            var childNode: XamlNode = null;
            for (var i = 0; i < len; i++) {
                childNode = childNodes[i];
                childNode.SetIsAttached(newIsAttached);
            }
            var monitors = this._IAMonitors;
            if (!monitors) return;
            len = monitors.length;
            for (var i = 0; i < len; i++) {
                monitors[i].Callback(newIsAttached);
            }
        }
        MonitorIsAttached(func: (newIsAttached: bool) => void ): IIsAttachedMonitor {
            var monitors = this._IAMonitors;
            if (!monitors) this._IAMonitors = monitors = [];
            var monitor: IIsAttachedMonitor = {
                Callback: func,
                Detach: null
            };
            monitor.Detach = function () {
                var index = monitors.indexOf(monitor);
                if (index > -1) monitors.splice(index, 1);
            };
            this._IAMonitors.push(monitor);
            return monitor;
        }
        AttachTo(parentNode: XamlNode, error: BError): bool {
            var curNode = parentNode;
            var data = {
                ParentNode: parentNode,
                ChildNode: this,
                Name: ""
            };
            while (curNode) {
                if (curNode === this) {
                    error.Message = "Cycle found.";
                    error.Data = data;
                    error.Number = BError.Attach;
                    return false;
                }
                curNode = curNode.ParentNode;
            }
            if (this.ParentNode) {
                if (this.ParentNode === parentNode)
                    return true;
                error.Message = "Element is already a child of another element.";
                error.Data = data;
                error.Number = BError.Attach;
                return false;
            }
            var parentScope = parentNode.FindNameScope();
            var thisScope = this.NameScope;
            if (thisScope) {
                if (!thisScope.IsRoot) {
                    parentScope.Absorb(thisScope);
                    this.NameScope = null;
                    this._OwnerNameScope = parentScope;
                }
            } else if (parentScope) {
                var name = this.Name;
                if (name) {
                    var existing = parentScope.FindName(name);
                    if (existing && existing !== this) {
                        error.Message = "Name is already registered in parent namescope.";
                        data.Name = name;
                        error.Data = data;
                        error.Number = BError.Attach;
                        return false;
                    }
                    parentScope.RegisterName(name, this);
                }
                this._OwnerNameScope = parentScope;
            }
            var old = this.ParentNode;
            this.ParentNode = parentNode;
            this.OnParentChanged(old, parentNode);
            parentNode._LogicalChildren.push(this);
            this.SetIsAttached(parentNode.IsAttached);
            return true;
        }
        Detach() {
            var name = this.Name;
            if (name && !this.NameScope) {
                var ns = this.FindNameScope();
                if (ns) ns.UnregisterName(this.Name);
            }
            this.SetIsAttached(false);
            this._OwnerNameScope = null;
            var old = this.ParentNode;
            var index = old._LogicalChildren.indexOf(this);
            if (index > -1) old._LogicalChildren.splice(index, 1);
            this.ParentNode = null;
            if (old != null)
                this.OnParentChanged(old, null);
        }
        OnParentChanged(oldParentNode: XamlNode, newParentNode: XamlNode) { }
        GetInheritedEnumerator(): IEnumerator { return undefined; }
        GetVisualTreeEnumerator(direction?: VisualTreeDirection): IEnumerator { return undefined; }
    }
    Nullstone.RegisterType(XamlNode, "XamlNode");
}

module Fayde {
    export class XamlObject {
        private static _LastID: number = 0;
        private _ID: number;
        XamlNode: Fayde.XamlNode;
        TemplateOwner: DependencyObject = null;
        constructor() {
            this._ID = XamlObject._LastID++;
            this.XamlNode = this.CreateNode();
        }
        CreateNode(): XamlNode {
            return new XamlNode(this);
        }
        get Name() { return this.XamlNode.Name; }
        Clone(): XamlObject {
            var xobj: XamlObject = new (<any>this).constructor();
            xobj.CloneCore(this);
            return xobj;
        }
        CloneCore(source: XamlObject) { }
    }
    Nullstone.RegisterType(XamlObject, "XamlObject");
}

module Fayde.Providers {
    export class DefaultValueProvider implements IPropertyProvider {
        GetPropertyValue(store: IProviderStore, propd: DependencyProperty): any {
            return propd.DefaultValue;
        }
    }
    Nullstone.RegisterType(DefaultValueProvider, "DefaultValueProvider");
    export class AutoCreateProvider implements IPropertyProvider {
        private _ht: any[] = [];
        GetPropertyValue(store: IProviderStore, propd: DependencyProperty): any {
            var value = this.ReadLocalValue(propd);
            if (value !== undefined)
                return value;
            value = propd._IsAutoCreated ? propd._AutoCreator.GetValue(propd, store._Object) : undefined;
            if (value === undefined)
                return undefined;
            this._ht[propd._ID] = value;
            var error = new BError();
            store._ProviderValueChanged(_PropertyPrecedence.AutoCreate, propd, undefined, value, false, error);
            return value;
        }
        ReadLocalValue(propd: DependencyProperty): any {
            return this._ht[propd._ID];
        }
        RecomputePropertyValueOnClear(propd: DependencyProperty) {
            this._ht[propd._ID] = undefined;
        }
        ClearValue(propd: DependencyProperty) {
            this._ht[propd._ID] = undefined;
        }
    }
    Nullstone.RegisterType(AutoCreateProvider, "AutoCreateProvider");
    export class LocalValueProvider implements IPropertyProvider {
        private _ht: any[] = [];
        GetPropertyValue(store: IProviderStore, propd: DependencyProperty): any {
            return this._ht[propd._ID];
        }
        SetValue(propd: DependencyProperty, value: any) {
            this._ht[propd._ID] = value;
        }
        ClearValue(propd: DependencyProperty) {
            this._ht[propd._ID] = undefined;
        }
    }
    Nullstone.RegisterType(LocalValueProvider, "LocalValueProvider");
    export interface IInheritedDataContextProvider extends IPropertyProvider {
        EmitChanged();
        SetDataSourceNode(sourceNode: XamlNode);
    }
    export class BasicProviderStore {
        _Object: DependencyObject;
        private _Providers: IPropertyProvider[] = [null, null, null, null, null, null, null, null, null];
        private _PropertyChangedListeners: IPropertyChangedListener[] = [];
        _ProviderBitmasks: number[] = [];
        private _AnimStorage: Media.Animation.AnimationStorage[][] = [];
        private _LocalValueProvider: LocalValueProvider;
        private _InheritedDataContextProvider: IInheritedDataContextProvider;
        private _DefaultValueProvider: DefaultValueProvider;
        private _AutoCreateProvider: AutoCreateProvider;
        constructor(dobj: DependencyObject) {
            this._Object = dobj;
        }
        SetProviders(providerArr: Providers.IPropertyProvider[]) {
            this._LocalValueProvider = this._Providers[1] = <LocalValueProvider>providerArr[1];
            this._InheritedDataContextProvider = this._Providers[6] = <IInheritedDataContextProvider>providerArr[6];
            this._DefaultValueProvider = this._Providers[7] = <DefaultValueProvider>providerArr[7];
            this._AutoCreateProvider = this._Providers[8] = <AutoCreateProvider>providerArr[8];
        }
        GetValue(propd: DependencyProperty):any {
            var startingPrecedence = _PropertyPrecedence.Highest;
            var endingPrecedence = _PropertyPrecedence.Lowest;
            var bitmask = this._ProviderBitmasks[propd._ID] | propd._BitmaskCache;
            for (var i = startingPrecedence; i <= endingPrecedence; i++) {
                if (!(bitmask & (1 << i)))
                    continue;
                var provider = this._Providers[i];
                if (!provider)
                    continue;
                var val = provider.GetPropertyValue(this, propd);
                if (val === undefined)
                    continue;
                return val;
            }
            return undefined;
        }
        GetValueSpec(propd: DependencyProperty, startingPrecedence?, endingPrecedence?): any {
            if (startingPrecedence === undefined)
                startingPrecedence = _PropertyPrecedence.Highest;
            if (endingPrecedence === undefined)
                endingPrecedence = _PropertyPrecedence.Lowest;
            var bitmask = this._ProviderBitmasks[propd._ID] | propd._BitmaskCache;
            for (var i = startingPrecedence; i <= endingPrecedence; i++) {
                if (!(bitmask & (1 << i)))
                    continue;
                var provider = this._Providers[i];
                if (!provider)
                    continue;
                var val = provider.GetPropertyValue(this, propd);
                if (val === undefined)
                    continue;
                return val;
            }
            return undefined;
        }
        SetValue(propd: DependencyProperty, value: any) {
            if (value instanceof Fayde.UnsetValue) {
                this.ClearValue(propd, true);
                return;
            }
            if (value && propd.GetTargetType() === String) {
                if (typeof value !== "string")
                    value = value.toString();
            }
            var isValidOut = { IsValid: false };
            value = propd.ValidateSetValue(this._Object, value, isValidOut);
            if (!isValidOut.IsValid)
                return;
            var currentValue;
            var equal = false;
            if ((currentValue = this._LocalValueProvider.GetPropertyValue(this, propd)) === undefined)
                if (propd._IsAutoCreated)
                    currentValue = this._AutoCreateProvider.ReadLocalValue(propd);
            if (currentValue !== undefined && value !== undefined)
                equal = !propd._AlwaysChange && Nullstone.Equals(currentValue, value);
            else
                equal = currentValue === undefined && value === undefined;
            if (!equal) {
                var newValue;
                this._LocalValueProvider.ClearValue(propd);
                if (propd._IsAutoCreated)
                    this._AutoCreateProvider.ClearValue(propd);
                newValue = value;
                if (newValue !== undefined) {
                    this._LocalValueProvider.SetValue(propd, newValue);
                }
                var error = new BError();
                this._ProviderValueChanged(_PropertyPrecedence.LocalValue, propd, currentValue, newValue, true, error);
                if (error.Message)
                    throw new Exception(error.Message);
            }
        }
        ClearValue(propd: DependencyProperty, notifyListeners?: bool) {
            if (notifyListeners === undefined)
                notifyListeners = true;
            if (this._GetAnimationStorageFor(propd))
                return;
            var oldLocalValue;
            if ((oldLocalValue = this._LocalValueProvider.GetPropertyValue(this, propd)) === undefined) {
                if (propd._IsAutoCreated)
                    oldLocalValue = this._AutoCreateProvider.ReadLocalValue(propd);
            }
            var error = new BError();
            if (oldLocalValue !== undefined) {
                this._DetachValue(oldLocalValue);
                this._LocalValueProvider.ClearValue(propd);
                if (propd._IsAutoCreated)
                    this._AutoCreateProvider.ClearValue(propd);
            }
            /*
            var count = _PropertyPrecedence.Count;
            for (var i = _PropertyPrecedence.LocalValue + 1; i < count; i++) {
                var provider = this._Providers[i];
                if (provider)
                    provider.RecomputePropertyValueOnClear(propd, error);
            }
            */
            if (oldLocalValue !== undefined) {
                this._ProviderValueChanged(_PropertyPrecedence.LocalValue, propd, oldLocalValue, undefined, notifyListeners, error);
                if (error.Message)
                    throw new Exception(error.Message);
            }
        }
        ReadLocalValue(propd: DependencyProperty): any {
            var val = this._LocalValueProvider.GetPropertyValue(this, propd);
            if (val === undefined)
                return new UnsetValue();
            return val;
        }
        _ProviderValueChanged(providerPrecedence: number, propd: DependencyProperty, oldProviderValue: any, newProviderValue: any, notifyListeners: bool, error: BError): bool {
            var bitmask = this._ProviderBitmasks[propd._ID] | 0;
            if (newProviderValue !== undefined)
                bitmask |= 1 << providerPrecedence;
            else
                bitmask &= ~(1 << providerPrecedence);
            this._ProviderBitmasks[propd._ID] = bitmask;
            var higher = (((1 << (providerPrecedence + 1)) - 2) & bitmask) | propd._BitmaskCache;
            var propPrecHighest = _PropertyPrecedence.Highest;
            for (var j = providerPrecedence - 1; j >= propPrecHighest; j--) {
                if (!(higher & (1 << j)))
                    continue;
                var provider = this._Providers[j];
                if (!provider)
                    continue;
                if (provider.GetPropertyValue(this, propd) !== undefined)
                    return false;
            }
            var oldValue;
            var newValue;
            if (oldProviderValue === undefined || newProviderValue === undefined) {
                var lowerPriorityValue = this.GetValueSpec(propd, providerPrecedence + 1);
                if (newProviderValue === undefined) {
                    oldValue = oldProviderValue;
                    newValue = lowerPriorityValue;
                } else if (oldProviderValue === undefined) {
                    oldValue = lowerPriorityValue;
                    newValue = newProviderValue;
                }
            } else {
                oldValue = oldProviderValue;
                newValue = newProviderValue;
            }
            if (oldValue === null && newValue === null)
                return false;
            if (oldValue === undefined && newValue === undefined)
                return false;
            if (!propd._AlwaysChange && Nullstone.Equals(oldValue, newValue))
                return false;
            this._PostProviderValueChanged(providerPrecedence, propd, oldValue, newValue, notifyListeners, error);
            return true;
        }
        _PostProviderValueChanged(providerPrecedence: number, propd: DependencyProperty, oldValue: any, newValue: any, notifyListeners: bool, error: BError) {
            if (!propd.IsCustom) {
                this._DetachValue(oldValue);
                this._AttachValue(newValue, error);
            }
            if (notifyListeners) {
                var args = {
                    Property: propd,
                    OldValue: oldValue,
                    NewValue: newValue
                };
                try { this._Object._OnPropertyChanged(args); }
                catch (err) { error.Message = err.Message; }
                this._RaisePropertyChanged(args);
                if (propd && propd._ChangedCallback)
                    propd._ChangedCallback(this._Object, args);
            }
        }
        private _GetAnimationStorageFor(propd: DependencyProperty): any {
            var list = this._AnimStorage[propd._ID];
            if (list && list.length > 0)
                return list[list.length - 1];
            return undefined;
        }
        private _CloneAnimationStorage(sourceStore: BasicProviderStore) {
            var srcRepo = sourceStore._AnimStorage;
            var thisRepo = this._AnimStorage;
            var list;
            for (var key in srcRepo) {
                thisRepo[key] = srcRepo[0].slice(0);
            }
        }
        _AttachAnimationStorage(propd: DependencyProperty, storage): Media.Animation.AnimationStorage {
            var list = this._AnimStorage[propd._ID];
            if (!list) {
                this._AnimStorage[propd._ID] = list = [storage];
                return undefined;
            }
            var attached = list[list.length - 1];
            if (attached)
                attached.Disable();
            list.push(storage);
            return attached;
        }
        _DetachAnimationStorage(propd: DependencyProperty, storage: Media.Animation.AnimationStorage) {
            var list = this._AnimStorage[propd._ID];
            if (!list)
                return;
            var len = list.length;
            if (len < 1)
                return;
            var i;
            var cur: Media.Animation.AnimationStorage;
            for (i = len - 1; i >= 0; i++) {
                cur = list[i];
                if (cur === storage)
                    break;
            }
            if (i === (len - 1)) {
                list.pop();
                if (len > 1)
                    list[len - 2].Enable();
            } else {
                list.splice(i, 1);
                if (i > 0)
                    list[i - 1].StopValue = storage.StopValue;
            }
        }
        _SubscribePropertyChanged(listener: Providers.IPropertyChangedListener) {
            var l = this._PropertyChangedListeners;
            if (l.indexOf(listener) < 0)
                l.push(listener);
        }
        _UnsubscribePropertyChanged(listener: Providers.IPropertyChangedListener) {
            var l = this._PropertyChangedListeners;
            var index = l.indexOf(listener);
            if (index > -1)
                l.splice(index, 1);
        }
        _RaisePropertyChanged(args: IDependencyPropertyChangedEventArgs) {
            var l = this._PropertyChangedListeners;
            var len = l.length;
            for (var i = 0; i < len; i++) {
                l[i].OnPropertyChanged(this._Object, args);
            }
        }
        _AttachValue(value: any, error: BError): bool {
            if (!value)
                return true;
            if (value instanceof XamlObject) {
                return (<XamlObject>value).XamlNode.AttachTo(this._Object.XamlNode, error);
            }
        }
        _DetachValue(value: any) {
            if (!value)
                return;
            if (value instanceof XamlObject) {
                (<XamlObject>value).XamlNode.Detach();
            }
        }
        CloneCore(sourceStore: BasicProviderStore) {
            var dpIds = DependencyProperty._IDs;
            var localStorage = (<any>this._LocalValueProvider)._ht;
            for (var id in localStorage) {
                this.SetValue(dpIds[id], localStorage[id]);
            }
            this._CloneAnimationStorage(sourceStore);
        }
        EmitDataContextChanged() { this._InheritedDataContextProvider.EmitChanged(); }
        SetDataContextSourceNode(sourceNode?: XamlNode) { this._InheritedDataContextProvider.SetDataSourceNode(sourceNode); }
        OnDataContextSourceValueChanged(oldDataContext: any, newDataContext: any): bool {
            var error = new BError();
            return this._ProviderValueChanged(_PropertyPrecedence.InheritedDataContext, DependencyObject.DataContextProperty, oldDataContext, newDataContext, true, error);
        }
    }
    Nullstone.RegisterType(BasicProviderStore, "BasicProviderStore");
}

module Fayde.Providers {
    export class FrameworkElementDynamicProvider implements IPropertyProvider {
        private _ActualHeight: number;
        private _ActualWidth: number;
        GetPropertyValue(store: IProviderStore, propd: DependencyProperty): any {
            var isWidth = propd._ID === FrameworkElement.ActualWidthProperty._ID;
            var isHeight = propd._ID === FrameworkElement.ActualHeightProperty._ID;
            if (isWidth) {
                var feNode = (<FrameworkElement>store._Object).XamlNode;
                return feNode.LayoutUpdater.ActualWidth;
            } else if (isHeight) {
                var feNode = (<FrameworkElement>store._Object).XamlNode;
                return feNode.LayoutUpdater.ActualHeight;
            }
        }
    }
    Nullstone.RegisterType(FrameworkElementDynamicProvider, "FrameworkElementDynamicProvider");
}

module Fayde.Providers {
    export class ImplicitStyleProvider implements IPropertyProvider, IImplicitStylesProvider {
        private _ht: any[] = [];
        private _Styles: any[] = [null, null, null];
        private _StyleMask: _StyleMask = _StyleMask.None;
        private _Store: IProviderStore;
        constructor(store: IProviderStore) {
            this._Store = store;
        }
        GetPropertyValue(store: IProviderStore, propd: DependencyProperty): any {
            return this._ht[propd._ID];
        }
        RecomputePropertyValueOnClear(propd: DependencyProperty, error: BError) {
            if (!this._Styles)
                return;
            var oldValue;
            var newValue;
            var prop;
            var walker = MultipleStylesWalker(this._Styles);
            var setter: Setter;
            while (setter = walker.Step()) {
                prop = setter.Property;
                if (prop._ID !== propd._ID)
                    continue;
                newValue = setter.ConvertedValue;
                oldValue = this._ht[propd._ID];
                this._ht[propd._ID] = newValue;
                this._Store._ProviderValueChanged(_PropertyPrecedence.ImplicitStyle, propd, oldValue, newValue, true, error);
                if (error.Message)
                    return;
            }
        }
        SetStyles(styleMask: _StyleMask, styles: Style[], error: BError) {
            if (!styles)
                return;
            var newStyles = [null, null, null];
            if (this._Styles) {
                newStyles[_StyleIndex.GenericXaml] = this._Styles[_StyleIndex.GenericXaml];
                newStyles[_StyleIndex.ApplicationResources] = this._Styles[_StyleIndex.ApplicationResources];
                newStyles[_StyleIndex.VisualTree] = this._Styles[_StyleIndex.VisualTree];
            }
            if (styleMask & _StyleMask.GenericXaml)
                newStyles[_StyleIndex.GenericXaml] = styles[_StyleIndex.GenericXaml];
            if (styleMask & _StyleMask.ApplicationResources)
                newStyles[_StyleIndex.ApplicationResources] = styles[_StyleIndex.ApplicationResources];
            if (styleMask & _StyleMask.VisualTree)
                newStyles[_StyleIndex.VisualTree] = styles[_StyleIndex.VisualTree];
            this._ApplyStyles(this._StyleMask | styleMask, newStyles, error);
        }
        ClearStyles(styleMask: _StyleMask, error: BError) {
            if (!this._Styles)
                return;
            var newStyles = this._Styles.slice(0);
            if (styleMask & _StyleMask.GenericXaml)
                newStyles[_StyleIndex.GenericXaml] = null;
            if (styleMask & _StyleMask.ApplicationResources)
                newStyles[_StyleIndex.ApplicationResources] = null;
            if (styleMask & _StyleMask.VisualTree)
                newStyles[_StyleIndex.VisualTree] = null;
            this._ApplyStyles(this._StyleMask & ~styleMask, newStyles, error);
        }
        private _ApplyStyles(styleMask: _StyleMask, styles: Style[], error: BError) {
            var isChanged = !this._Styles || styleMask !== this._StyleMask;
            if (!isChanged) {
                for (var i = 0; i < _StyleIndex.Count; i++) {
                    if (styles[i] !== this._Styles[i]) {
                        isChanged = true;
                        break;
                    }
                }
            }
            if (!isChanged)
                return;
            var oldValue;
            var newValue;
            var oldWalker = MultipleStylesWalker(this._Styles);
            var newWalker = MultipleStylesWalker(styles);
            var oldSetter = oldWalker.Step();
            var newSetter = newWalker.Step();
            var oldProp: DependencyProperty;
            var newProp: DependencyProperty;
            while (oldSetter || newSetter) {
                if (oldSetter)
                    oldProp = oldSetter.Property;
                if (newSetter)
                    newProp = newSetter.Property;
                if (oldProp && (oldProp < newProp || !newProp)) { //WTF: Less than?
                    oldValue = oldSetter.ConvertedValue;
                    newValue = undefined;
                    this._ht[oldProp._ID] = undefined;
                    this._Store._ProviderValueChanged(_PropertyPrecedence.ImplicitStyle, oldProp, oldValue, newValue, true, error);
                    oldSetter = oldWalker.Step();
                }
                else if (oldProp === newProp) {
                    oldValue = oldSetter.ConvertedValue;
                    newValue = newSetter.ConvertedValue;
                    this._ht[oldProp._ID] = newValue;
                    this._Store._ProviderValueChanged(_PropertyPrecedence.ImplicitStyle, oldProp, oldValue, newValue, true, error);
                    oldSetter = oldWalker.Step();
                    newSetter = newWalker.Step();
                } else {
                    oldValue = undefined;
                    newValue = newSetter.ConvertedValue;
                    this._ht[newProp._ID] = newValue;
                    this._Store._ProviderValueChanged(_PropertyPrecedence.ImplicitStyle, newProp, oldValue, newValue, true, error);
                    newSetter = newWalker.Step();
                }
            }
            this._Styles = styles;
            this._StyleMask = styleMask;
        }
    }
    Nullstone.RegisterType(ImplicitStyleProvider, "ImplicitStyleProvider");
}

module Fayde.Providers {
    export class InheritedDataContextProvider implements IPropertyProvider, IInheritedDataContextProvider {
        private _SourceNode: XamlNode;
        private _Store: IProviderStore;
        constructor(store: IProviderStore) {
            this._Store = store;
        }
        GetPropertyValue(store: IProviderStore, propd: DependencyProperty): any {
            var sourceNode = this._SourceNode;
            if (!sourceNode)
                return;
            if (propd !== DependencyObject.DataContextProperty)
                return;
            return sourceNode.DataContext;
        }
        SetDataSourceNode(sourceNode: XamlNode) {
            var oldSourceNode = this._SourceNode;
            if (oldSourceNode === sourceNode)
                return;
            var oldValue: any = undefined;
            var newValue: any = undefined;
            if (oldSourceNode) oldValue = oldSourceNode.DataContext;
            this._SourceNode = sourceNode;
            if (sourceNode) newValue = sourceNode.DataContext;
            if (!Nullstone.Equals(oldValue, newValue)) {
                var error = new BError();
                this._Store._ProviderValueChanged(_PropertyPrecedence.InheritedDataContext, DependencyObject.DataContextProperty, oldValue, newValue, false, error);
            }
        }
        private EmitChanged() {
            var sourceNode = this._SourceNode;
            if (!sourceNode)
                return;
            var error = new BError();
            this._Store._ProviderValueChanged(_PropertyPrecedence.InheritedDataContext, DependencyObject.DataContextProperty, undefined, sourceNode.DataContext, true, error);
        }
    }
    Nullstone.RegisterType(InheritedDataContextProvider, "InheritedDataContextProvider");
}

module Fayde.Providers {
    export class InheritedIsEnabledProvider implements IPropertyProvider, IInheritedIsEnabledProvider {
        private _Source: Fayde.Controls.Control;
        private _CurrentValue: bool = true;
        private _Store: IProviderStore;
        constructor(store: IProviderStore) {
            this._Store = store;
        }
        GetPropertyValue(store: IProviderStore, propd: DependencyProperty): any {
            if (propd._ID === Controls.Control.IsEnabledProperty._ID)
                return this._CurrentValue;
            return undefined;
        }
        SetDataSource(source: DependencyObject) {
            if (source) {
                var curNode = <XamlNode>source.XamlNode;
                while (curNode) {
                    if (curNode.XObject instanceof Controls.Control)
                        break;
                    else if (curNode.XObject instanceof FrameworkElement)
                        curNode = curNode.ParentNode;
                    else
                        curNode = null;
                }
                source = (curNode) ? (<DependencyObject>curNode.XObject) : null;
            }
            if (this._Source !== source) {
                this._DetachListener(<Controls.Control>this._Source);
                this._Source = <Controls.Control>source;
                this._AttachListener(<Controls.Control>source);
            }
            if (!source && (this._Store._Object.XamlNode.IsAttached))
                this.LocalValueChanged();
        }
        private _AttachListener(source: Controls.Control) {
            if (!source)
                return;
            var matchFunc = function (sender, args) {
                return this === args.Property; //Closure - Control.IsEnabledProperty
            };
            (<any>source).PropertyChanged.SubscribeSpecific(this._IsEnabledChanged, this, matchFunc, Fayde.Controls.Control.IsEnabledProperty);
        }
        private _DetachListener(source: Controls.Control) {
            if (!source)
                return;
            (<any>source).PropertyChanged.Unsubscribe(this._IsEnabledChanged, this, Fayde.Controls.Control.IsEnabledProperty);
        }
        private _IsEnabledChanged(sender: DependencyObject, args: IDependencyPropertyChangedEventArgs) {
            this.LocalValueChanged();
        }
        LocalValueChanged(propd?: DependencyProperty): bool {
            if (propd && propd._ID !== Controls.Control.IsEnabledProperty._ID)
                return false;
            var store = this._Store;
            var localEnabled = store.GetValueSpec(Controls.Control.IsEnabledProperty, _PropertyPrecedence.LocalValue);
            var parentEnabled = false;
            var source = this._Source;
            if (source && (<UINode>store._Object.XamlNode).VisualParentNode)
                parentEnabled = source.GetValue(Controls.Control.IsEnabledProperty) === true;
            var newValue = localEnabled === true && parentEnabled;
            if (newValue !== this._CurrentValue) {
                var oldValue = this._CurrentValue;
                this._CurrentValue = newValue;
                var error = new BError();
                store._ProviderValueChanged(_PropertyPrecedence.IsEnabled, Controls.Control.IsEnabledProperty, oldValue, newValue, true, error);
                return true;
            }
            return false;
        }
    }
    Nullstone.RegisterType(InheritedIsEnabledProvider, "InheritedIsEnabledProvider");
}

module Fayde.Providers {
    export class _InheritedContext {
        ForegroundSource: DependencyObject;
        FontFamilySource: DependencyObject;
        FontStretchSource: DependencyObject;
        FontStyleSource: DependencyObject;
        FontWeightSource: DependencyObject;
        FontSizeSource: DependencyObject;
        LanguageSource: DependencyObject;
        FlowDirectionSource: DependencyObject;
        UseLayoutRoundingSource: DependencyObject;
        TextDecorationsSource: DependencyObject;
        static FromSources(foregroundSource: DependencyObject, fontFamilySource: DependencyObject, fontStretchSource: DependencyObject, fontStyleSource: DependencyObject, fontWeightSource: DependencyObject, fontSizeSource: DependencyObject, languageSource: DependencyObject, flowDirectionSource: DependencyObject, useLayoutRoundingSource: DependencyObject, textDecorationsSource: DependencyObject) {
            var ic = new _InheritedContext();
            ic.ForegroundSource = foregroundSource;
            ic.FontFamilySource = fontFamilySource;
            ic.FontStretchSource = fontStretchSource;
            ic.FontStyleSource = fontStyleSource;
            ic.FontWeightSource = fontWeightSource;
            ic.FontSizeSource = fontSizeSource;
            ic.LanguageSource = languageSource;
            ic.FlowDirectionSource = flowDirectionSource;
            ic.UseLayoutRoundingSource = useLayoutRoundingSource;
            ic.TextDecorationsSource = textDecorationsSource;
            return ic;
        }
        static FromObject(dobj: DependencyObject, parentContext: _InheritedContext) {
            var ic = new _InheritedContext();
            ic.ForegroundSource = ic.GetLocalSource(dobj, _Inheritable.Foreground);
            if (!ic.ForegroundSource && parentContext) ic.ForegroundSource = parentContext.ForegroundSource;
            ic.FontFamilySource = ic.GetLocalSource(dobj, _Inheritable.FontFamily);
            if (!ic.FontFamilySource && parentContext) ic.FontFamilySource = parentContext.FontFamilySource;
            ic.FontStretchSource = ic.GetLocalSource(dobj, _Inheritable.FontStretch);
            if (!ic.FontStretchSource && parentContext) ic.FontStretchSource = parentContext.FontStretchSource;
            ic.FontStyleSource = ic.GetLocalSource(dobj, _Inheritable.FontStyle);
            if (!ic.FontStretchSource && parentContext) ic.FontStretchSource = parentContext.FontStretchSource;
            ic.FontWeightSource = ic.GetLocalSource(dobj, _Inheritable.FontWeight);
            if (!ic.FontWeightSource && parentContext) ic.FontWeightSource = parentContext.FontWeightSource;
            ic.FontSizeSource = ic.GetLocalSource(dobj, _Inheritable.FontSize);
            if (!ic.FontSizeSource && parentContext) ic.FontSizeSource = parentContext.FontSizeSource;
            ic.LanguageSource = ic.GetLocalSource(dobj, _Inheritable.Language);
            if (!ic.LanguageSource && parentContext) ic.LanguageSource = parentContext.LanguageSource;
            ic.FlowDirectionSource = ic.GetLocalSource(dobj, _Inheritable.FlowDirection);
            if (!ic.FlowDirectionSource && parentContext) ic.FlowDirectionSource = parentContext.FlowDirectionSource;
            ic.UseLayoutRoundingSource = ic.GetLocalSource(dobj, _Inheritable.UseLayoutRounding);
            if (!ic.UseLayoutRoundingSource && parentContext) ic.UseLayoutRoundingSource = parentContext.UseLayoutRoundingSource;
            ic.TextDecorationsSource = ic.GetLocalSource(dobj, _Inheritable.TextDecorations);
            if (!ic.TextDecorationsSource && parentContext) ic.TextDecorationsSource = parentContext.TextDecorationsSource;
            return ic;
        }
        Compare(withContext: _InheritedContext, props) {
            var rv = _Inheritable.None;
            if (props & _Inheritable.Foreground && withContext.ForegroundSource === this.ForegroundSource)
                rv |= _Inheritable.Foreground;
            if (props & _Inheritable.FontFamily && withContext.FontFamilySource === this.FontFamilySource)
                rv |= _Inheritable.FontFamily;
            if (props & _Inheritable.FontStretch && withContext.FontStretchSource === this.FontStretchSource)
                rv |= _Inheritable.FontStretch;
            if (props & _Inheritable.FontStyle && withContext.FontStyleSource === this.FontStyleSource)
                rv |= _Inheritable.FontStyle;
            if (props & _Inheritable.FontWeight && withContext.FontWeightSource === this.FontWeightSource)
                rv |= _Inheritable.FontWeight;
            if (props & _Inheritable.FontSize && withContext.FontSizeSource === this.FontSizeSource)
                rv |= _Inheritable.FontSize;
            if (props & _Inheritable.Language && withContext.LanguageSource === this.LanguageSource)
                rv |= _Inheritable.Language;
            if (props & _Inheritable.FlowDirection && withContext.FlowDirectionSource === this.FlowDirectionSource)
                rv |= _Inheritable.FlowDirection;
            if (props & _Inheritable.UseLayoutRounding && withContext.UseLayoutRoundingSource === this.UseLayoutRoundingSource)
                rv |= _Inheritable.UseLayoutRounding;
            if (props & _Inheritable.TextDecorations && withContext.TextDecorationsSource === this.TextDecorationsSource)
                rv |= _Inheritable.TextDecorations;
            return rv;
        }
        GetLocalSource(dobj: DependencyObject, prop) {
            var propd = getProperty(prop, dobj);
            if (!propd)
                return;
            if ((dobj._Store._ProviderBitmasks[propd._ID] & ((1 << _PropertyPrecedence.Inherited) - 1)) !== 0)
                return dobj;
        }
    }
    function getInheritable(dobj: DependencyObject, propd: DependencyProperty) {
        var inh = propd._Inheritable || 0;
        if (inh && propd.Name === "FlowDirection" && (dobj instanceof Fayde.Controls.Image || dobj instanceof Fayde.Controls.MediaElement))
            inh = 0;
        return inh;
    }
    function getProperty(inheritable: _Inheritable, ancestor: DependencyObject) {
        var list = DependencyProperty._Inherited[inheritable];
        if (!list)
            return;
        var len = list.length;
        if (len > 0 && list[0].Name === "FlowDirection") {
            if (ancestor instanceof Fayde.Controls.Image || ancestor instanceof Fayde.Controls.MediaElement)
                return;
        }
        for (var i = 0; i < len; i++) {
            var propd = list[i];
            if (ancestor instanceof propd.OwnerType)
                return propd;
        }
    }
    function propagateInheritedValue(inheritable: _Inheritable, source: DependencyObject, newValue: any) {
        var provider: InheritedProvider = this._InheritedProvider;
        if (!provider)
            return true;
        provider._SetPropertySource(inheritable, source);
        var propd = getProperty(inheritable, this._Object);
        if (!propd)
            return false;
        var error = new BError();
        this._ProviderValueChanged(_PropertyPrecedence.Inherited, propd, undefined, newValue, true, error);
    }
    function getInheritedValueSource(inheritable: _Inheritable): DependencyObject {
        var provider: InheritedProvider = this._InheritedProvider;
        if (provider)
            return provider._GetPropertySource(inheritable);
    }
    export class InheritedProvider implements IPropertyProvider, IInheritedProvider {
        private _ht: DependencyObject[] = [];
        GetPropertyValue(store: IProviderStore, propd: DependencyProperty): any {
            var inheritable = getInheritable(store._Object, propd);
            if (!inheritable)
                return undefined;
            var ancestor = this._GetPropertySource(inheritable);
            if (!ancestor)
                return undefined;
            var ancestorPropd = getProperty(inheritable, ancestor);
            if (!ancestorPropd)
                return undefined;
            return ancestor.GetValue(ancestorPropd);
        }
        WalkSubtree(rootParent: DependencyObject, elNode: XamlNode, context: _InheritedContext, props, adding) {
            var enumerator = elNode.GetInheritedEnumerator();
            if (!enumerator)
                return;
            while (enumerator.MoveNext()) {
                this.WalkTree(rootParent, <XamlNode>enumerator.Current, context, props, adding);
            }
        }
        WalkTree(rootParent: DependencyObject, elNode: XamlNode, context: _InheritedContext, props: _Inheritable, adding: bool) {
            if (props === _Inheritable.None)
                return;
            var element = <DependencyObject>elNode.XObject;
            if (adding) {
                this.MaybePropagateInheritedValue(context.ForegroundSource, _Inheritable.Foreground, props, element);
                this.MaybePropagateInheritedValue(context.FontFamilySource, _Inheritable.FontFamily, props, element);
                this.MaybePropagateInheritedValue(context.FontStretchSource, _Inheritable.FontStretch, props, element);
                this.MaybePropagateInheritedValue(context.FontStyleSource, _Inheritable.FontStyle, props, element);
                this.MaybePropagateInheritedValue(context.FontWeightSource, _Inheritable.FontWeight, props, element);
                this.MaybePropagateInheritedValue(context.FontSizeSource, _Inheritable.FontSize, props, element);
                this.MaybePropagateInheritedValue(context.LanguageSource, _Inheritable.Language, props, element);
                this.MaybePropagateInheritedValue(context.FlowDirectionSource, _Inheritable.FlowDirection, props, element);
                this.MaybePropagateInheritedValue(context.UseLayoutRoundingSource, _Inheritable.UseLayoutRounding, props, element);
                this.MaybePropagateInheritedValue(context.TextDecorationsSource, _Inheritable.TextDecorations, props, element);
                var eleContext = _InheritedContext.FromObject(element, context);
                props = eleContext.Compare(context, props);
                if (props === _Inheritable.None)
                    return;
                this.WalkSubtree(rootParent, elNode, eleContext, props, adding);
            } else {
                var eleContext2 = _InheritedContext.FromObject(element, context);
                this.MaybeRemoveInheritedValue(context.ForegroundSource, _Inheritable.Foreground, props, element);
                this.MaybeRemoveInheritedValue(context.FontFamilySource, _Inheritable.FontFamily, props, element);
                this.MaybeRemoveInheritedValue(context.FontStretchSource, _Inheritable.FontStretch, props, element);
                this.MaybeRemoveInheritedValue(context.FontStyleSource, _Inheritable.FontStyle, props, element);
                this.MaybeRemoveInheritedValue(context.FontWeightSource, _Inheritable.FontWeight, props, element);
                this.MaybeRemoveInheritedValue(context.FontSizeSource, _Inheritable.FontSize, props, element);
                this.MaybeRemoveInheritedValue(context.LanguageSource, _Inheritable.Language, props, element);
                this.MaybeRemoveInheritedValue(context.FlowDirectionSource, _Inheritable.FlowDirection, props, element);
                this.MaybeRemoveInheritedValue(context.UseLayoutRoundingSource, _Inheritable.UseLayoutRounding, props, element);
                this.MaybeRemoveInheritedValue(context.TextDecorationsSource, _Inheritable.TextDecorations, props, element);
                props = eleContext2.Compare(context, props);
                if (props === _Inheritable.None)
                    return;
                this.WalkSubtree(rootParent, elNode, context, props, adding);
            }
        }
        MaybePropagateInheritedValue(source: DependencyObject, prop, props, element: DependencyObject) {
            if (!source) return;
            if ((props & prop) == 0) return;
            var sourceProperty = getProperty(prop, source);
            var value = source.GetValue(sourceProperty);
            if (value !== undefined)
                propagateInheritedValue.call(element._Store, prop, source, value);
        }
        MaybeRemoveInheritedValue(source: DependencyObject, prop, props, element: DependencyObject) {
            if (!source) return;
            if ((props & prop) == 0) return;
            if (source === getInheritedValueSource.call(element, prop))
                propagateInheritedValue.call(element._Store, prop, undefined, undefined);
        }
        PropagateInheritedPropertiesOnAddingToTree(store: IProviderStore, subtreeNode: XamlNode) {
            var inhEnum = _Inheritable;
            var baseContext = _InheritedContext.FromSources(
                    this._GetPropertySource(inhEnum.Foreground),
                    this._GetPropertySource(inhEnum.FontFamily),
                    this._GetPropertySource(inhEnum.FontStretch),
                    this._GetPropertySource(inhEnum.FontStyle),
                    this._GetPropertySource(inhEnum.FontWeight),
                    this._GetPropertySource(inhEnum.FontSize),
                    this._GetPropertySource(inhEnum.Language),
                    this._GetPropertySource(inhEnum.FlowDirection),
                    this._GetPropertySource(inhEnum.UseLayoutRounding),
                    this._GetPropertySource(inhEnum.TextDecorations));
            var objContext = _InheritedContext.FromObject(store._Object, baseContext);
            this.WalkTree(store._Object, subtreeNode, objContext, inhEnum.All, true);
        }
        PropagateInheritedProperty(store: IProviderStore, propd: DependencyProperty, source: DependencyObject) {
            var inheritable = getInheritable(source, propd);
            if (inheritable === 0)
                return;
            var objContext = _InheritedContext.FromObject(store._Object, null);
            this.WalkSubtree(source, source.XamlNode, objContext, inheritable, true);
        }
        ClearInheritedPropertiesOnRemovingFromTree(store: IProviderStore, subtreeNode: XamlNode) {
            var baseContext = _InheritedContext.FromSources(
                    this._GetPropertySource(_Inheritable.Foreground),
                    this._GetPropertySource(_Inheritable.FontFamily),
                    this._GetPropertySource(_Inheritable.FontStretch),
                    this._GetPropertySource(_Inheritable.FontStyle),
                    this._GetPropertySource(_Inheritable.FontWeight),
                    this._GetPropertySource(_Inheritable.FontSize),
                    this._GetPropertySource(_Inheritable.Language),
                    this._GetPropertySource(_Inheritable.FlowDirection),
                    this._GetPropertySource(_Inheritable.UseLayoutRounding),
                    this._GetPropertySource(_Inheritable.TextDecorations));
            var objContext = _InheritedContext.FromObject(store._Object, baseContext);
            this.WalkTree(store._Object, subtreeNode, objContext, _Inheritable.All, false);
        }
        _GetPropertySource(inheritable: _Inheritable): DependencyObject {
            return this._ht[inheritable];
        }
        _SetPropertySource(inheritable: _Inheritable, source: DependencyObject) {
            if (source)
                this._ht[inheritable] = source;
            else
                this._ht[inheritable] = undefined;
        }
    }
    Nullstone.RegisterType(InheritedProvider, "InheritedProvider");
}

module Fayde.Providers {
    export interface IInheritedProvider extends IPropertyProvider {
        PropagateInheritedProperty(store: IProviderStore, propd: DependencyProperty, source: DependencyObject);
        PropagateInheritedPropertiesOnAddingToTree(store: IProviderStore, subtreeNode: XamlNode);
        ClearInheritedPropertiesOnRemovingFromTree(store: IProviderStore, subtreeNode: XamlNode);
    }
    export class InheritedProviderStore extends BasicProviderStore {
        constructor(dobj: DependencyObject) {
            super(dobj);
        }
        SetProviders(providerArr: Providers.IPropertyProvider[]) {
            this._LocalValueProvider = this._Providers[1] = <LocalValueProvider>providerArr[1];
            this._InheritedProvider = this._Providers[5] = <IInheritedProvider>providerArr[5];
            this._InheritedDataContextProvider = this._Providers[6] = <IInheritedDataContextProvider>providerArr[6];
            this._DefaultValueProvider = this._Providers[7] = <DefaultValueProvider>providerArr[7];
            this._AutoCreateProvider = this._Providers[8] = <AutoCreateProvider>providerArr[8];
        }
        private _Providers: IPropertyProvider[];
        private _LocalValueProvider: LocalValueProvider;
        private _InheritedProvider: IInheritedProvider;
        private _InheritedDataContextProvider: IInheritedDataContextProvider;
        private _DefaultValueProvider: DefaultValueProvider;
        private _AutoCreateProvider: AutoCreateProvider;
        _PostProviderValueChanged(providerPrecedence: number, propd: DependencyProperty, oldValue: any, newValue: any, notifyListeners: bool, error: BError) {
            super._PostProviderValueChanged(providerPrecedence, propd, oldValue, newValue, notifyListeners, error);
            if (!notifyListeners)
                return;
            if (propd._Inheritable > 0 && providerPrecedence !== _PropertyPrecedence.Inherited) {
                var inheritedProvider = this._InheritedProvider;
                if (inheritedProvider && ((this._ProviderBitmasks[propd._ID] & ((1 << _PropertyPrecedence.Inherited) - 1)) !== 0))
                    inheritedProvider.PropagateInheritedProperty(this, propd, this._Object);
            }
        }
        PropagateInheritedOnAdd(subtreeNode: XamlNode) {
            this._InheritedProvider.PropagateInheritedPropertiesOnAddingToTree(this, subtreeNode);
        }
        ClearInheritedOnRemove(subtreeNode: XamlNode) {
            this._InheritedProvider.ClearInheritedPropertiesOnRemovingFromTree(this, subtreeNode);
        }
    }
    Nullstone.RegisterType(InheritedProviderStore, "InheritedProviderStore");
}

module Fayde.Providers {
    export class LocalStyleProvider implements IPropertyProvider, ILocalStylesProvider {
        private _ht: any[] = [];
        private _Style: Style;
        private _Store: IProviderStore;
        constructor(store: IProviderStore) {
            this._Store = store;
        }
        GetPropertyValue(store: IProviderStore, propd: DependencyProperty): any {
            return this._ht[propd._ID];
        }
        RecomputePropertyValueOnClear(propd: DependencyProperty, error: BError) {
            var oldValue;
            var newValue;
            var walkPropd;
            var walker = SingleStyleWalker(this._Style);
            var setter: Setter;
            while (setter = walker.Step()) {
                walkPropd = setter.Property;
                if (walkPropd._ID !== propd._ID)
                    continue;
                newValue = setter.ConvertedValue;
                oldValue = this._ht[propd._ID];
                this._ht[propd._ID] = newValue;
                this._Store._ProviderValueChanged(_PropertyPrecedence.LocalStyle, propd, oldValue, newValue, true, error);
                if (error.Message)
                    return;
            }
        }
        UpdateStyle(style: Style, error: BError) {
            var store = this._Store;
            var oldValue = undefined;
            var newValue = undefined;
            var oldWalker = SingleStyleWalker(this._Style);
            var newWalker = SingleStyleWalker(style);
            style.Seal();
            var oldSetter = oldWalker.Step();
            var newSetter = newWalker.Step();
            var oldProp: DependencyProperty;
            var newProp: DependencyProperty;
            while (oldSetter || newSetter) {
                if (oldSetter)
                    oldProp = oldSetter.Property;
                if (newSetter)
                    newProp = newSetter.Property;
                if (oldProp && (oldProp < newProp || !newProp)) { //WTF: Less than?
                    oldValue = oldSetter.ConvertedValue;
                    newValue = undefined;
                    this._ht[oldProp._ID] = undefined;
                    store._ProviderValueChanged(_PropertyPrecedence.LocalStyle, oldProp, oldValue, newValue, true, error);
                    oldSetter = oldWalker.Step();
                } else if (oldProp === newProp) {
                    oldValue = oldSetter.ConvertedValue;
                    newValue = newSetter.ConvertedValue;
                    this._ht[oldProp._ID] = newValue;
                    store._ProviderValueChanged(_PropertyPrecedence.LocalStyle, oldProp, oldValue, newValue, true, error);
                    oldSetter = oldWalker.Step();
                    newSetter = newWalker.Step();
                } else {
                    oldValue = undefined;
                    newValue = newSetter.ConvertedValue;
                    this._ht[newProp._ID] = newValue;
                    store._ProviderValueChanged(_PropertyPrecedence.LocalStyle, newProp, oldValue, newValue, true, error);
                    newSetter = newWalker.Step();
                }
            }
            this._Style = style;
        }
    }
    Nullstone.RegisterType(LocalStyleProvider, "LocalStyleProvider");
}

module Fayde.Data {
    export class BindingBase {
        private _IsSealed: bool = false;
        private _StringFormat: string = undefined;
        private _FallbackValue: any = undefined;
        private _TargetNullValue: any = undefined;
        get StringFormat(): string { return this._StringFormat; }
        set StringFormat(value: string) {
            this.CheckSealed();
            this._StringFormat = value;
        }
        get FallbackValue(): any { return this._FallbackValue; }
        set FallbackValue(value: any) {
            this.CheckSealed();
            this._FallbackValue = value;
        }
        get TargetNullValue():any { return this._TargetNullValue; }
        set TargetNullValue(value: any) {
            this.CheckSealed();
            this._TargetNullValue = value;
        }
        CheckSealed() {
            if (this._IsSealed)
                throw new InvalidOperationException("The Binding cannot be changed after it has been used.");
        }
        Seal() { this._IsSealed = true; }
    }
    Nullstone.RegisterType(BindingBase, "BindingBase");
}

module Fayde.Data {
    declare var NotImplemented;
    export class BindingExpressionBase extends Fayde.Expression implements IPropertyPathWalkerListener {
        private _Binding: Data.Binding;
        Target: DependencyObject;
        Property: DependencyProperty;
        private PropertyPathWalker: PropertyPathWalker;
        private _DataContextSourceNode: XamlNode;
        private _PropertyListener: Providers.IPropertyChangedListener;
        private _DataContextPropertyMonitor: IDataContextMonitor;
        private _SourceAvailableMonitor: IIsAttachedMonitor;
        private _IsBoundToAnyDataContext: bool;
        private _TwoWayTextBox: Controls.TextBox = null;
        get Binding(): Data.Binding { return this._Binding; }
        get DataSource(): any { return this.PropertyPathWalker.Source; }
        private _Cached: bool = false;
        private _CachedValue: any = undefined;
        constructor(binding: Data.Binding, target: DependencyObject, propd: DependencyProperty) {
            super();
            this._Binding = binding;
            this.Target = target;
            this.Property = propd;
            if (this.Target instanceof Controls.TextBox && binding.Mode === BindingMode.TwoWay)
                this._TwoWayTextBox = <Controls.TextBox>this.Target;
            this._IsBoundToAnyDataContext = !this.Binding.ElementName && !this.Binding.Source;
            var isDcProp = propd === DependencyObject.DataContextProperty;
            var isContentProp = propd === Controls.ContentPresenter.ContentProperty;
            var bindsToView = isDcProp || propd.GetTargetType() === <any>IEnumerable_ || propd.GetTargetType() === <any>Data.ICollectionView_;
            var walker = this.PropertyPathWalker = new PropertyPathWalker(binding.Path.ParsePath, binding.BindsDirectlyToSource, bindsToView, this._IsBoundToAnyDataContext);
            if (binding.Mode !== BindingMode.OneTime)
                walker.Listen(this);
        }
        IsBrokenChanged() { this.Refresh(); }
        ValueChanged() { this.Refresh(); }
        GetValue(propd: DependencyProperty): any {
            if (this._Cached)
                return this._CachedValue;
            this._Cached = true;
            if (this.PropertyPathWalker.IsPathBroken) {
                this._CachedValue = null;
            } else {
                this._CachedValue = this.PropertyPathWalker.ValueInternal;
            }
            try {
                this._CachedValue = this._ConvertToType(propd, this._CachedValue);
            } catch (err) {
                this._CachedValue = propd.DefaultValue;
            }
            return this._CachedValue;
        }
        OnAttached(element: DependencyObject) {
            if (this.IsAttached)
                return;
            super.OnAttached(element);
            this._CalculateDataSource();
            if (this._TwoWayTextBox)
                this._TwoWayTextBox.LostFocus.Subscribe(this._TextBoxLostFocus, this);
            if (this.Binding.Mode === BindingMode.TwoWay && this.Property.IsCustom) {
                this._PropertyListener = Fayde.ListenToPropertyChanged(this.Target, this.Property, this._UpdateSourceCallback, this);
            }
        }
        private _UpdateSourceCallback(sender, args: IDependencyPropertyChangedEventArgs) {
            try {
                if (!this.IsUpdating)
                    this._TryUpdateSourceObject(this.Target.GetValue(this.Property));
            } catch (err) {
            }
        }
        OnDetached(element: DependencyObject) {
            if (!this.IsAttached)
                return;
            super.OnDetached(element);
            if (this._TwoWayTextBox)
                this._TwoWayTextBox.LostFocus.Unsubscribe(this._TextBoxLostFocus, this);
            if (this._IsBoundToAnyDataContext) {
                var listener = this._DataContextPropertyMonitor;
                if (listener) listener.Detach();
                this.SetDataContextSource(null);
            }
            /*
            if (this.Target && this.CurrentError != null) {
                this.CurrentError = null;
            }
            */
            if (this._PropertyListener) {
                this._PropertyListener.Detach();
                this._PropertyListener = null;
            }
            this.PropertyPathWalker.Update(null);
        }
        private _TextBoxLostFocus() {
            this._UpdateSourceObject();
        }
        _TryUpdateSourceObject(value: any) {
            if (!this.IsUpdating && this.Binding.UpdateSourceTrigger === UpdateSourceTrigger.Default) {
                this._UpdateSourceObject(value, false);
            }
        }
        _UpdateSourceObject(value?: any, force?: bool) {
            if (value === undefined)
                value = this.Target.GetValue(this.Property);
            force = force === true;
            var binding = this.Binding;
            if (binding.Mode !== BindingMode.TwoWay)
                return;
            var dataError;
            var exception: Exception;
            var oldUpdating = this.IsUpdating;
            var node = this.PropertyPathWalker.FinalNode;
            try {
                if (!force && this._TwoWayTextBox && App.Instance.MainSurface.FocusedNode === this.Target.XamlNode)
                    return;
                if (this.PropertyPathWalker.IsPathBroken)
                    return;
                if (binding.TargetNullValue) {
                    try {
                        if (binding.TargetNullValue === value)
                            value = null;
                    } catch (err) {
                    }
                }
                var converter = binding.Converter;
                if (converter) {
                    value = converter.ConvertBack(value, node.ValueType, binding.ConverterParameter, binding.ConverterCulture);
                }
                if (value instanceof String) {
                }
                try {
                    if (value)
                        value = this._ConvertFromTargetToSource(value);
                } catch (err) {
                    return;
                }
                if (!this._CachedValue && !value)
                    return;
                this.IsUpdating = true;
                node.SetValue(value);
                this._CachedValue = value;
            } catch (err) {
                if (binding.ValidatesOnExceptions) {
                    if (err instanceof TargetInvocationException)
                        exception = err.InnerException;
                    exception = err;
                }
            } finally {
                this.IsUpdating = oldUpdating;
            }
            this._MaybeEmitError(dataError, exception);
        }
        private _MaybeEmitError(message: string, exception: Exception) {
            /*
            var fe: FrameworkElement = this.TargetFE;
            if (!fe && !(fe = this.Target.GetMentor()))
                return;
            if (message === "")
                message = null;
            var oldError = this.CurrentError;
            if (message != null)
                this.CurrentError = new ValidationError(message, null);
            else if (exception)
                this.CurrentError = new ValidationError(null, exception);
            else
                this.CurrentError = null;
            if (oldError && this.CurrentError) {
                Validation.AddError(fe, this.CurrentError);
                Validation.RemoveError(fe, oldError);
                if (this.Binding.NotifyOnValidationError) {
                    fe.RaiseBindingValidationError(new ValidationErrorEventArgs(ValidationErrorEventAction.Removed, oldError));
                    fe.RaiseBindingValidationError(new ValidationErrorEventArgs(ValidationErrorEventAction.Added, this.CurrentError));
                }
            } else if (oldError) {
                Validation.RemoveError(fe, oldError);
                if (this.Binding.NotifyOnValidationError)
                    fe.RaiseBindingValidationError(new ValidationErrorEventArgs(ValidationErrorEventAction.Removed, oldError));
            } else if (this.CurrentError) {
                Validation.AddError(fe, this.CurrentError);
                if (this.Binding.NotifyOnValidationError)
                    fe.RaiseBindingValidationError(new ValidationErrorEventArgs(ValidationErrorEventAction.Added, this.CurrentError));
            }
            */
        }
        private _ConvertFromTargetToSource(value: any): any {
            NotImplemented("BindingExpressionBase._ConvertFromTargetToSource");
            return value;
        }
        private _ConvertFromSourceToTarget(value: any): any {
            NotImplemented("BindingExpressionBase._ConvertFromSourceToTarget");
            return value;
        }
        private _ConvertToType(propd: DependencyProperty, value: any): any {
            try {
                var binding = this.Binding;
                if (!this.PropertyPathWalker.IsPathBroken && binding.Converter) {
                    value = binding.Converter.Convert(value, this.Property.GetTargetType(), binding.ConverterParameter, binding.ConverterCulture);
                }
                if (value instanceof Fayde.UnsetValue || this.PropertyPathWalker.IsPathBroken) {
                    value = binding.FallbackValue;
                    if (value === undefined)
                        value = propd.DefaultValue;
                } else if (value == null) {
                    value = binding.TargetNullValue;
                    if (value == null && this._IsBoundToAnyDataContext && !binding.Path.Path)
                        value = propd.DefaultValue;
                } else {
                    var format = binding.StringFormat;
                    if (format) {
                        if (format.indexOf("{0") < 0)
                            format = "{0:" + format + "}";
                        value = StringEx.Format(format, value);
                    }
                }
            } catch (err) {
                return TypeConverter.ConvertObject(propd, binding.FallbackValue, (<any>this.Target).constructor, true);
            }
            return value;
        }
        private _AttachToNotifyError(element) {
            NotImplemented("BindingExpressionBase._AttachToNotifyError");
        }
        private _NotifyErrorsChanged(o, e) {
            NotImplemented("BindingExpressionBase._NotifyErrorsChanged");
        }
        private _CalculateDataSource() {
            var source: any;
            if (this.Binding.Source) {
                this.PropertyPathWalker.Update(this.Binding.Source);
            } else if (this.Binding.ElementName != null) {
                source = this._FindSourceByElementName();
                this._SourceAvailableMonitor = this.Target.XamlNode.MonitorIsAttached((newIsAttached) => this._OnSourceAvailable());
                this.PropertyPathWalker.Update(source);
            } else if (this.Binding.RelativeSource && this.Binding.RelativeSource.Mode === RelativeSourceMode.Self) {
                this.PropertyPathWalker.Update(this.Target);
            } else {
                if (this.Binding.RelativeSource && this.Binding.RelativeSource.Mode === RelativeSourceMode.TemplatedParent) {
                    this.PropertyPathWalker.Update(this.Target.TemplateOwner);
                } else {
                    this.SetDataContextSource(this.Target);
                }
            }
        }
        private _OnSourceAvailable() {
            this._SourceAvailableMonitor.Detach();
            var source = this._FindSourceByElementName();
            if (source) this.PropertyPathWalker.Update(source);
            this._Invalidate();
            this.Target.SetValue(this.Property, this);
        }
        private _FindSourceByElementName(): XamlObject {
            var xobj: XamlObject = this.Target;
            var sourceNode: XamlNode;
            var name = this.Binding.ElementName;
            var xnode: XamlNode = (xobj) ? xobj.XamlNode : null;
            var parentNode: XamlNode;
            while (xnode) {
                sourceNode = xnode.FindName(name);
                if (sourceNode)
                    return sourceNode.XObject;
                if (xnode.XObject.TemplateOwner)
                    xobj = xnode.XObject.TemplateOwner;
                else if ((parentNode = xnode.ParentNode) && Controls.ItemsControl.GetItemsOwner(<UIElement>parentNode.XObject))
                    xnode = parentNode;
                break;
            }
            return undefined;
        }
        SetDataContextSource(value: XamlObject) {
            if (this._DataContextPropertyMonitor) {
                this._DataContextPropertyMonitor.Detach();
                this._DataContextPropertyMonitor = null;
            }
            var dcs = this._DataContextSourceNode = value.XamlNode;
            if (dcs) {
                this._DataContextPropertyMonitor = value.XamlNode.MonitorDataContext((newDataContext) => this._DataContextChanged(newDataContext));
                this.PropertyPathWalker.Update(dcs ? dcs.DataContext : undefined);
            }
        }
        private _DataContextChanged(newDataContext: any) {
            try {
                this.PropertyPathWalker.Update(newDataContext);
                if (this.Binding.Mode === BindingMode.OneTime)
                    this.Refresh();
            } catch (err) {
                Warn(err.message);
            }
        }
        private _Invalidate() {
            this._Cached = false;
            this._CachedValue = undefined;
        }
        Refresh() {
            var dataError;
            var exception: Exception;
            if (!this.IsAttached)
                return;
            var oldUpdating = this.IsUpdating;
            try {
                this.IsUpdating = true;
                this._Invalidate();
                this.Target.SetValue(this.Property, this);
            } catch (err) {
                if (this.Binding.ValidatesOnExceptions) {
                    exception = err;
                    if (exception instanceof TargetInvocationException)
                        exception = (<TargetInvocationException>exception).InnerException;
                }
            } finally {
                this.IsUpdating = oldUpdating;
            }
            this._MaybeEmitError(dataError, exception);
        }
    }
    Nullstone.RegisterType(BindingExpressionBase, "BindingExpressionBase");
}

module Fayde.Data {
    export interface ICollectionView {
        CurrentChanged: MulticastEvent;
    }
    export var ICollectionView_ = Nullstone.RegisterInterface("ICollectionView");
}

module Fayde.Data {
    export class RelativeSource {
        Mode: RelativeSourceMode = RelativeSourceMode.TemplatedParent;
        constructor(mode?: RelativeSourceMode) {
            if (mode) this.Mode = mode;
        }
    }
    Nullstone.RegisterType(RelativeSource, "RelativeSource");
}

module Fayde {
    export function Run() { }
    export function Start(appType: Function, rjson: any, json: any, canvas: HTMLCanvasElement) {
        var instance = App.Instance = <App>new (<any>appType)();
        instance.LoadResources(rjson);
        instance.LoadInitial(canvas, json);
    }
}
class App {
    static Version: string = "0.9.4.0";
    static Instance: App;
    MainSurface: Surface;
    Resources: Fayde.ResourceDictionary;
    Loaded: MulticastEvent = new MulticastEvent();
    Address: Uri = null;
    NavService: Fayde.Navigation.NavService;
    private _IsRunning: bool = false;
    private _Storyboards: Fayde.IStoryboard[] = [];
    private _ClockTimer: Fayde.ClockTimer = new Fayde.ClockTimer();
    private static _GenericResourceDictionary: Fayde.ResourceDictionary = null;
    constructor() {
        this.MainSurface = new Surface(this);
        Object.defineProperty(this, "Resources", {
            value: new Fayde.ResourceDictionary(),
            writable: false
        });
        this.Resources.XamlNode.NameScope = new Fayde.NameScope(true);
    }
    get RootVisual(): Fayde.UIElement {
        return this.MainSurface._TopLevel;
    }
    LoadResources(json: any) {
        Fayde.JsonParser.ParseResourceDictionary(this.Resources, json);
    }
    LoadInitial(canvas: HTMLCanvasElement, json: any) {
        this.Address = new Uri(document.URL);
        this.MainSurface.Register(canvas);
        this.NavService = new Fayde.Navigation.NavService(this);
        var element = Fayde.JsonParser.Parse(json);
        if (element instanceof Fayde.UIElement)
            this.MainSurface.Attach(<Fayde.UIElement>element);
        this.StartEngine();
        this.EmitLoaded();
    }
    private EmitLoaded() {
        this.Loaded.RaiseAsync(this, EventArgs.Empty);
    }
    private StartEngine() {
        this._ClockTimer.RegisterTimer(this);
    }
    private Tick(lastTime: number, nowTime: number) {
        this.ProcessStoryboards(lastTime, nowTime);
        this.Update();
        this.Render();
    }
    private StopEngine() {
        this._ClockTimer.UnregisterTimer(this);
    }
    private ProcessStoryboards(lastTime: number, nowTime: number) {
        var sbs = this._Storyboards;
        var len = sbs.length;
        for (var i = 0; i < len; i++) {
            sbs[i].Update(nowTime);
        }
    }
    private Update() {
        if (this._IsRunning)
            return;
        this._IsRunning = true;
        var updated = this.MainSurface.ProcessDirtyElements();
        this._IsRunning = false;
    }
    private Render() {
        this.MainSurface.Render();
    }
    RegisterStoryboard(storyboard: Fayde.IStoryboard) {
        var sbs = this._Storyboards;
        var index = sbs.indexOf(storyboard);
        if (index === -1)
            sbs.push(storyboard);
    }
    UnregisterStoryboard(storyboard: Fayde.IStoryboard) {
        var sbs = this._Storyboards;
        var index = sbs.indexOf(storyboard);
        if (index !== -1)
            sbs.splice(index, 1);
    }
    static GetGenericResourceDictionary(): Fayde.ResourceDictionary {
        var rd = App._GenericResourceDictionary;
        if (!rd)
            App._GenericResourceDictionary = rd = App.GetGenericResourceDictionaryImpl();
        return rd;
    }
    private static GetGenericResourceDictionaryImpl(): Fayde.ResourceDictionary { return undefined; }
}
Nullstone.RegisterType(App, "App");

module Fayde {
    export interface ITimerListener {
        Tick(lastTime: number, nowTime: number);
    }
    var requestAnimFrame = (function () {
        return window.requestAnimationFrame ||
            (<any>window).webkitRequestAnimationFrame ||
            (<any>window).mozRequestAnimationFrame ||
            (<any>window).oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 200);
            };
    })();
    export class ClockTimer {
        private _Listeners: Fayde.ITimerListener[] = [];
        private _LastTime: number = 0;
        RegisterTimer(listener: Fayde.ITimerListener) {
            var ls = this._Listeners;
            var index = ls.indexOf(listener);
            if (index > -1)
                return;
            ls.push(listener);
            if (ls.length === 1)
                this._RequestAnimationTick();
        }
        UnregisterTimer(listener: Fayde.ITimerListener) {
            var ls = this._Listeners;
            var index = ls.indexOf(listener);
            if (index > -1)
                ls.splice(index, 1);
        }
        private _DoTick() {
            var nowTime = new Date().getTime();
            var lastTime = this._LastTime;
            this._LastTime = nowTime;
            var ls = this._Listeners;
            var len = ls.length;
            if (len === 0)
                return;
            for (var i = 0; i < len; i++) {
                ls[i].Tick(lastTime, nowTime);
            }
            this._RequestAnimationTick();
        }
        private _RequestAnimationTick() {
            requestAnimFrame(() => this._DoTick());
        }
    }
    Nullstone.RegisterType(ClockTimer, "ClockTimer");
}

class Exception {
    Message: string;
    constructor(message: string) {
        this.Message = message;
    }
    toString(): string {
        var typeName = (<any>this).constructor._TypeName;
        if (typeName)
            return typeName + ": " + this.Message;
        return this.Message;
    }
}
Nullstone.RegisterType(Exception, "Exception");
class ArgumentException extends Exception {
    constructor(message: string) {
        super(message);
    }
}
Nullstone.RegisterType(ArgumentException, "ArgumentException");
class InvalidOperationException extends Exception {
    constructor(message: string) {
        super(message);
    }
}
Nullstone.RegisterType(InvalidOperationException, "InvalidOperationException");
class XamlParseException extends Exception {
    constructor(message: string) {
        super(message);
    }
}
Nullstone.RegisterType(XamlParseException, "XamlParseException");
class NotSupportedException extends Exception {
    constructor(message: string) {
        super(message);
    }
}
Nullstone.RegisterType(NotSupportedException, "NotSupportedException");
class IndexOutOfRangeException extends Exception {
    constructor(index: number) {
        super(index.toString());
    }
}
Nullstone.RegisterType(IndexOutOfRangeException, "IndexOutOfRangeException");
class AttachException extends Exception {
    Data: any;
    constructor(message: string, data: any) {
        super(message);
        this.Data = data;
    }
}
Nullstone.RegisterType(AttachException, "AttachException");
class InvalidJsonException extends Exception {
    JsonText: string;
    InnerException: Error;
    constructor(jsonText: string, innerException: Error) {
        super("Invalid json.");
        this.JsonText = jsonText;
        this.InnerException = innerException;
    }
}
Nullstone.RegisterType(InvalidJsonException, "InvalidJsonException");
class TargetInvocationException extends Exception {
    InnerException: Exception;
    constructor(message: string, innerException: Exception) {
        super(message);
        this.InnerException = innerException;
    }
}
Nullstone.RegisterType(TargetInvocationException, "TargetInvocationException");

module Fayde {
    export class RenderContext implements IRenderContext {
        CanvasContext: CanvasRenderingContext2D;
        CurrentTransform: number[] = null;
        private _Transforms: number[][] = [];
        constructor(ctx: CanvasRenderingContext2D) {
            this.CanvasContext = ctx;
            if (!ctx.hasOwnProperty("currentTransform")) {
                Object.defineProperty(ctx, "currentTransform", {
                    get: () => this.CurrentTransform,
                    set: (value: number[]) => {
                        ctx.setTransform(value[0], value[1], value[3], value[4], value[2], value[5]);
                        this.CurrentTransform = value;
                    }
                });
            }
        }
        DoRender(layers: Fayde.UINode[], r: rect) {
            this.Clear(r);
            this.CanvasContext.save();
            this.ClipRect(r);
            if (layers) {
                var len = layers.length;
                for (var i = 0; i < len; i++) {
                    layers[i].LayoutUpdater.DoRender(this, r);
                }
            }
            this.CanvasContext.restore();
        }
        Save() {
            this.CanvasContext.save();
            var ct = this.CurrentTransform;
            this._Transforms.push(ct);
            this.CurrentTransform = ct == null ? mat3.identity() : mat3.create(ct);
        }
        Restore() {
            var curXform = this._Transforms.pop();
            this.CurrentTransform = curXform;
            this.CanvasContext.restore();
        }
        ClipRect(r: rect) {
            var cc = this.CanvasContext;
            cc.beginPath();
            cc.rect(r.X, r.Y, r.Width, r.Height);
            cc.clip();
        }
        ClipGeometry(g: Media.Geometry) {
            g.Draw(this);
            this.CanvasContext.clip();
        }
        ClipRawPath(p: any/* Change to Fayde.Shapes.RawPath */) {
            p.Draw(this);
            this.CanvasContext.clip();
        }
        IsPointInPath(p: Point): bool {
            return this.CanvasContext.isPointInPath(p.X, p.Y);
        }
        IsPointInClipPath(clip: Media.Geometry, p: Point): bool {
            clip.Draw(this);
            return this.CanvasContext.isPointInPath(p.X, p.Y);
        }
        Rect(r: rect) {
            var cc = this.CanvasContext;
            cc.beginPath();
            cc.rect(r.X, r.Y, r.Width, r.Height);
        }
        Fill(brush: Media.Brush, r: rect) {
            var cc = this.CanvasContext;
            brush.SetupBrush(cc, r);
            cc.fillStyle = brush.ToHtml5Object();
            cc.fill();
        }
        FillRect(brush: Media.Brush, r: rect) {
            var cc = this.CanvasContext;
            brush.SetupBrush(cc, r);
            cc.beginPath();
            cc.rect(r.X, r.Y, r.Width, r.Height);
            cc.fillStyle = brush.ToHtml5Object();
            cc.fill();
        }
        StrokeAndFillRect(strokeBrush: Media.Brush, thickness: number, strokeRect: rect, fillBrush: Media.Brush, fillRect: rect) {
            var cc = this.CanvasContext;
            strokeBrush.SetupBrush(cc, strokeRect);
            fillBrush.SetupBrush(cc, fillRect);
            cc.beginPath();
            cc.rect(fillRect.X, fillRect.Y, fillRect.Width, fillRect.Height);
            cc.fillStyle = fillBrush.ToHtml5Object();
            cc.fill();
            cc.lineWidth = thickness;
            cc.strokeStyle = strokeBrush.ToHtml5Object();
            cc.stroke();
        }
        Stroke(stroke: Media.Brush, thickness: number, region: rect) {
            var cc = this.CanvasContext;
            stroke.SetupBrush(cc, region);
            cc.lineWidth = thickness;
            cc.strokeStyle = stroke.ToHtml5Object();
            cc.stroke();
        }
        Clear(r: rect) {
            this.CanvasContext.clearRect(r.X, r.Y, r.Width, r.Height);
        }
        PreTransformMatrix(mat: number[]) {
            var ct = this.CurrentTransform;
            mat3.multiply(mat, ct, ct); //ct = ct * matrix
            this.CanvasContext.setTransform(ct[0], ct[1], ct[3], ct[4], ct[2], ct[5]);
            this.CurrentTransform = ct;
        }
        PreTransform(transform: Fayde.Media.Transform) {
            var v = transform.Value;
            var mat: number[];
            if (!v || !(mat = v._Raw))
                return;
            var ct = this.CurrentTransform;
            mat3.multiply(mat, ct, ct); //ct = ct * matrix
            this.CanvasContext.setTransform(ct[0], ct[1], ct[3], ct[4], ct[2], ct[5]);
            this.CurrentTransform = ct;
        }
        TransformMatrix(mat: number[]) {
            var ct = this.CurrentTransform;
            mat3.multiply(ct, mat, ct); //ct = matrix * ct
            var cc = this.CanvasContext;
            this.CanvasContext.setTransform(ct[0], ct[1], ct[3], ct[4], ct[2], ct[5]);
            this.CurrentTransform = ct;
        }
        Transform(transform: Fayde.Media.Transform) {
            var v = transform.Value;
            var mat: number[];
            if (!v || !(mat = v._Raw))
                return;
            var ct = this.CurrentTransform;
            mat3.multiply(ct, mat, ct); //ct = matrix * ct
            var cc = this.CanvasContext;
            this.CanvasContext.setTransform(ct[0], ct[1], ct[3], ct[4], ct[2], ct[5]);
            this.CurrentTransform = ct;
        }
        Translate(x: number, y: number) {
            var ct = this.CurrentTransform;
            mat3.translate(ct, x, y);
            this.CanvasContext.translate(x, y);
        }
    }
    Nullstone.RegisterType(RenderContext, "RenderContext");
}

declare var Warn;
var resizeTimeout: number;
interface IFocusChangedEvents {
    GotFocus: Fayde.UINode[];
    LostFocus: Fayde.UINode[];
}
enum InputType {
    NoOp = 0,
    MouseUp = 1,
    MouseDown = 2,
    MouseLeave = 3,
    MouseEnter = 4,
    MouseMove = 5,
    MouseWheel = 6,
}
class Surface {
    static TestCanvas: HTMLCanvasElement = <HTMLCanvasElement>document.createElement("canvas");
    TestRenderContext: Fayde.RenderContext = new Fayde.RenderContext(Surface.TestCanvas.getContext("2d"));
    private _App: App;
    _TopLevel: Fayde.UIElement;
    private _Layers: Fayde.UINode[] = [];
    private _UpDirty: Fayde.LayoutUpdater[] = [];
    private _DownDirty: Fayde.LayoutUpdater[] = [];
    private _Canvas: HTMLCanvasElement = null;
    private _Ctx: CanvasRenderingContext2D = null;
    private _PercentageWidth: number = 0;
    private _PercentageHeight: number = 0;
    private _CanvasOffset: any = null;
    private _Extents: size = null;
    private _KeyInterop: Fayde.Input.KeyInterop;
    private _InputList: Fayde.UINode[] = [];
    private _FocusedNode: Fayde.UINode = null;
    get FocusedNode(): Fayde.UINode { return this._FocusedNode; }
    private _FocusChangedEvents: IFocusChangedEvents[] = [];
    private _FirstUserInitiatedEvent: bool = false;
    private _UserInitiatedEvent: bool = false;
    private _Captured: Fayde.UINode = null;
    private _PendingCapture: Fayde.UINode = null;
    private _PendingReleaseCapture: bool = false;
    private _CurrentPos: Point = null;
    private _EmittingMouseEvent: bool = false;
    private _Cursor: string = Fayde.CursorType.Default;
    private _InvalidatedRect: rect;
    private _RenderContext: Fayde.RenderContext;
    constructor(app: App) {
        this._App = app;
        this._KeyInterop = Fayde.Input.KeyInterop.CreateInterop(this);
    }
    get Extents(): size {
        if (!this._Extents)
            this._Extents = size.fromRaw(this._Canvas.offsetWidth, this._Canvas.offsetHeight);
        return this._Extents;
    }
    Register(canvas: HTMLCanvasElement, width?: number, widthType?: string, height?: number, heightType?: string) {
        this._Canvas = canvas;
        this._Ctx = this._Canvas.getContext("2d");
        if (!width) {
            width = 100;
            widthType = "Percentage";
        } else if (!widthType) {
            widthType = "Percentage";
        }
        if (!height) {
            height = 100;
            heightType = "Percentage";
        } else if (!heightType) {
            heightType = "Percentage";
        }
        this._InitializeCanvas(canvas, width, widthType, height, heightType);
        this._CalculateOffset();
        this._RegisterEvents();
    }
    private _InitializeCanvas(canvas: HTMLCanvasElement, width, widthType, height, heightType) {
        var resizesWithWindow = false;
        if (widthType === "Percentage") {
            resizesWithWindow = true;
            this._PercentageWidth = width;
        } else {
            canvas.width = width;
        }
        if (heightType === "Percentage") {
            resizesWithWindow = true;
            this._PercentageHeight = height;
        } else {
            canvas.height = height;
        }
        if (resizesWithWindow) {
            this._ResizeCanvas();
            window.onresize = (e) => this._HandleResize(window.event ? <any>window.event : e);
        }
    }
    private _CalculateOffset() {
        var left = 0;
        var top = 0;
        var cur: HTMLElement = this._Canvas;
        if (cur.offsetParent) {
            do {
                left += cur.offsetLeft;
                top += cur.offsetTop;
            } while (cur = <HTMLElement>cur.offsetParent);
        }
        this._CanvasOffset = { left: left, top: top };
    }
    private _RegisterEvents() {
        var canvas = this._Canvas;
        canvas.addEventListener("mousedown", (e) => this._HandleButtonPress(window.event ? <any>window.event : e));
        canvas.addEventListener("mouseup", (e) => this._HandleButtonRelease(window.event ? <any>window.event : e));
        canvas.addEventListener("mouseout", (e) => this._HandleOut(window.event ? <any>window.event : e));
        canvas.addEventListener("mousemove", (e) => this._HandleMove(window.event ? <any>window.event : e));
        canvas.addEventListener("mousewheel", (e) => this._HandleWheel(window.event ? <any>window.event : e));
        canvas.addEventListener("DOMMouseScroll", (e) => this._HandleWheel(window.event ? <any>window.event : e));
        this._KeyInterop.RegisterEvents();
    }
    Attach(uie: Fayde.UIElement) {
        if (this._TopLevel)
            this._DetachLayer(this._TopLevel);
        if (!uie) {
            this._Invalidate();
            return;
        }
        if (!(uie instanceof Fayde.UIElement))
            throw new Exception("Unsupported top level element.");
        var un = uie.XamlNode;
        if (un.NameScope == null)
            un.NameScope = new Fayde.NameScope(true);
        else if (!un.NameScope.IsRoot)
            un.NameScope.IsRoot = true;
        this._TopLevel = uie;
        this._AttachLayer(uie);
    }
    private _AttachLayer(layer: Fayde.UIElement) {
        var node = layer.XamlNode;
        this._Layers.unshift(node);
        node.IsTopLevel = true;
        node.SetSurface(this);
        var lu = node.LayoutUpdater;
        lu.FullInvalidate(true);
        lu.InvalidateMeasure();
        node.SetIsAttached(true);
        node.SetIsLoaded(true);
    }
    private _DetachLayer(layer: Fayde.UIElement) {
        var node = layer.XamlNode;
        node.IsTopLevel = false;
        var il = this._InputList;
        if (il[il.length - 1] === node)
            this._InputList = [];
        var f = this._FocusedNode;
        if (f) {
            while (f) {
                if (f === node) {
                    this._FocusNode();
                    break;
                }
                f = f.VisualParentNode;
            }
        }
        var index = this._Layers.indexOf(layer.XamlNode);
        if (index > -1)
            this._Layers.splice(index, 1);
        node.SetIsLoaded(false);
        node.SetIsAttached(false);
        this._Invalidate(node.LayoutUpdater.SurfaceBoundsWithChildren);
    }
    ProcessDirtyElements(): bool {
        var error = new BError();
        var dirty = this._UpdateLayout(error);
        if (error.Message)
            error.ThrowException();
        if (!dirty)
            return false;
        return true;
    }
    private _UpdateLayout(error: BError): bool {
        var maxPassCount = 250;
        var layers = this._Layers;
        if (!layers)
            return false;
        var pass = {
            MeasureList: [],
            ArrangeList: [],
            SizeList: [],
            Count: 0,
            Updated: true
        };
        var dirty = false;
        var updatedLayout = false;
        while (pass.Count < maxPassCount && pass.Updated) {
            pass.Updated = false;
            for (var i = 0; i < layers.length; i++) {
                var node = layers[i];
                var lu = node.LayoutUpdater;
                if (!lu.HasMeasureArrangeHint())
                    continue;
                var last = lu.PreviousConstraint;
                var available = size.clone(this.Extents);
                if (lu.IsContainer && (!last || (!size.isEqual(last, available)))) {
                    lu.InvalidateMeasure();
                    lu.PreviousConstraint = available;
                }
                lu.UpdateLayer(pass, error);
            }
            dirty = dirty || this._DownDirty.length > 0 || this._UpDirty.length > 0;
            this._ProcessDownDirtyElements();
            this._ProcessUpDirtyElements();
            if (pass.Updated || dirty)
                updatedLayout = true;
        }
        if (pass.Count >= maxPassCount) {
            if (error)
                error.Message = "UpdateLayout has entered infinite loop and has been aborted.";
        }
        return updatedLayout;
    }
    private _ProcessDownDirtyElements() {
        var list = this._DownDirty;
        var lu: Fayde.LayoutUpdater;
        while ((lu = list[0])) {
            if (!lu.InDownDirty) {
                list.shift();
                continue;
            }
            var vp = lu.Node.VisualParentNode;
            if (vp && vp.LayoutUpdater.InDownDirty) {
                list.push(list.shift());
                continue;
            }
            if (lu.ProcessDown()) {
                lu.InDownDirty = false;
                list.shift();
            }
        }
        if (list.length > 0) {
            Warn("Finished DownDirty pass, not empty.");
        }
    }
    private _ProcessUpDirtyElements() {
        var list = this._UpDirty;
        var lu: Fayde.LayoutUpdater;
        while ((lu = list[0])) {
            if (!lu.InUpDirty) {
                list.shift();
                continue;
            }
            var childNodeIndex = this._GetChildNodeInUpListIndex(lu);
            if (childNodeIndex > -1) {
                list.splice(childNodeIndex + 1, 0, list.shift());
                continue;
            }
            if (lu.ProcessUp()) {
                lu.InUpDirty = false;
                list.shift();
            }
        }
        if (list.length > 0) {
            Warn("Finished UpDirty pass, not empty.");
        }
    }
    private _GetChildNodeInUpListIndex(lu: Fayde.LayoutUpdater): number {
        var list = this._UpDirty;
        var len = list.length;
        var node = lu.Node;
        for (var i = len - 1; i >= 0; i--) {
            var cur = list[i];
            if (cur.InUpDirty && cur.Node.VisualParentNode === node)
                return i;
        }
        return -1;
    }
    private _PropagateDirtyFlagToChildren(element, dirt) {
    }
    _AddDirtyElement(lu: Fayde.LayoutUpdater, dirt) {
        if (lu.Node.VisualParentNode == null && !lu.Node.IsTopLevel)
            return;
        lu.DirtyFlags |= dirt;
        if (dirt & _Dirty.DownDirtyState && !lu.InDownDirty) {
            this._DownDirty.push(lu);
            lu.InDownDirty = true;
        }
        if (dirt & _Dirty.UpDirtyState && !lu.InUpDirty) {
            this._UpDirty.push(lu);
            lu.InUpDirty = true;
        }
    }
    private _RemoveDirtyElement(lu: Fayde.LayoutUpdater) {
        lu.InUpDirty = false;
        lu.InDownDirty = false;
    }
    OnNodeDetached(lu: Fayde.LayoutUpdater) {
        this._RemoveDirtyElement(lu);
        this._RemoveFocusFrom(lu);
    }
    _Invalidate(r?: rect) {
        if (!r)
            r = rect.fromSize(this.Extents);
        if (!this._InvalidatedRect)
            this._InvalidatedRect = rect.clone(r);
        else
            rect.union(this._InvalidatedRect, r);
    }
    Render() {
        var r = this._InvalidatedRect;
        if (!r)
            return;
        this._InvalidatedRect = null;
        if (!(r.Width > 0 && r.Height > 0))
            return;
        if (!this._RenderContext)
            this._RenderContext = new Fayde.RenderContext(this._Ctx);
        this._RenderContext.DoRender(this._Layers, r);
    }
    private _HandleResize(evt) {
        if (resizeTimeout)
            clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => this._HandleResizeTimeout(evt), 20);
    }
    private _HandleResizeTimeout(evt) {
        this._ResizeCanvas();
        this._Extents = null;
        var layers = this._Layers;
        var len = layers.length;
        var node: Fayde.UINode;
        for (var i = 0; i < len; i++) {
            node = layers[i];
            node.LayoutUpdater.InvalidateMeasure();
        }
        resizeTimeout = null;
    }
    private _ResizeCanvas() {
        var width = this._PercentageWidth;
        var height = this._PercentageHeight;
        if (width != null)
            this._Canvas.width = window.innerWidth * width / 100.0;
        if (height != null)
            this._Canvas.height = window.innerHeight * height / 100.0;
    }
    private _UpdateCursorFromInputList() {
        var newCursor = Fayde.CursorType.Default;
        var list = this._InputList;
        var len = list.length;
        for (var i = 0; i < len; i++) {
            newCursor = list[i].XObject.Cursor;
            if (newCursor !== Fayde.CursorType.Default)
                break;
        }
        this._SetCursor(newCursor);
    }
    private _SetCursor(cursor: string) {
        this._Cursor = cursor;
        this._Canvas.style.cursor = cursor;
    }
    _HandleKeyDown(args): bool {
        this._SetUserInitiatedEvent(true);
        Fayde.Input.Keyboard.RefreshModifiers(args);
        var handled = false;
        if (this._FocusedNode) {
            var focusToRoot = Surface._ElementPathToRoot(this._FocusedNode);
            handled = this._EmitKeyDown(focusToRoot, args);
        }
        if (!handled && args.Key === Fayde.Input.Key.Tab) {
            if (this._FocusedNode)
                Fayde.TabNavigationWalker.Focus(this._FocusedNode, args.Shift);
            else
                this._EnsureElementFocused();
        }
        this._SetUserInitiatedEvent(false);
        return handled;
    }
    private _EmitKeyDown(list: Fayde.UINode[], args, endIndex?: number) {
        if (endIndex === 0)
            return;
        if (!endIndex || endIndex === -1)
            endIndex = list.length;
        var i = 0;
        var cur = list.shift();
        while (cur && i < endIndex) {
            cur._EmitKeyDown(args);
            cur = list.shift();
            i++;
        }
        return args.Handled;
    }
    private _HandleButtonPress(evt) {
        Fayde.Input.Keyboard.RefreshModifiers(evt);
        var button = evt.which ? evt.which : evt.button;
        var pos = this._GetMousePosition(evt);
        this._SetUserInitiatedEvent(true);
        this._HandleMouseEvent(InputType.MouseDown, button, pos);
        this._UpdateCursorFromInputList();
        this._SetUserInitiatedEvent(false);
    }
    private _HandleButtonRelease(evt) {
        Fayde.Input.Keyboard.RefreshModifiers(evt);
        var button = evt.which ? evt.which : evt.button;
        var pos = this._GetMousePosition(evt);
        this._SetUserInitiatedEvent(true);
        this._HandleMouseEvent(InputType.MouseUp, button, pos);
        this._UpdateCursorFromInputList();
        this._SetUserInitiatedEvent(false);
        if (this._Captured)
            this._PerformReleaseCapture();
    }
    private _HandleOut(evt) {
        Fayde.Input.Keyboard.RefreshModifiers(evt);
        var pos = this._GetMousePosition(evt);
        this._HandleMouseEvent(InputType.MouseLeave, null, pos);
    }
    private _HandleMove(evt) {
        Fayde.Input.Keyboard.RefreshModifiers(evt);
        var pos = this._GetMousePosition(evt);
        this._HandleMouseEvent(InputType.MouseMove, null, pos);
        this._UpdateCursorFromInputList();
    }
    private _HandleWheel(evt) {
        Fayde.Input.Keyboard.RefreshModifiers(evt);
        var delta = 0;
        if (evt.wheelDelta)
            delta = evt.wheelDelta / 120;
        else if (evt.detail)
            delta = -evt.detail / 3;
        if (evt.preventDefault)
            evt.preventDefault();
        evt.returnValue = false;
        this._HandleMouseEvent(InputType.MouseWheel, null, this._GetMousePosition(evt), delta);
        this._UpdateCursorFromInputList();
    }
    private _HandleMouseEvent(type: InputType, button: number, pos: Point, delta?: number, emitLeave?: bool, emitEnter?: bool) {
        this._CurrentPos = pos;
        if (this._EmittingMouseEvent)
            return false;
        if (this._TopLevel == null)
            return false;
        this._EmittingMouseEvent = true;
        if (this._Captured) {
            this._EmitMouseList(type, button, pos, delta, this._InputList);
        } else {
            this.ProcessDirtyElements();
            var ctx = this._RenderContext;
            var newInputList: Fayde.UINode[] = [];
            var layers = this._Layers;
            var layerCount = layers.length;
            for (var i = layerCount - 1; i >= 0 && newInputList.length === 0; i--) {
                var layer = layers[i];
                layer._HitTestPoint(ctx, pos, newInputList);
            }
            var indices = { Index1: -1, Index2: -1 };
            this._FindFirstCommonElement(this._InputList, newInputList, indices);
            if (emitLeave === undefined || emitLeave === true)
                this._EmitMouseList(InputType.MouseLeave, button, pos, delta, this._InputList, indices.Index1);
            if (emitEnter === undefined || emitEnter === true)
                this._EmitMouseList(InputType.MouseEnter, button, pos, delta, newInputList, indices.Index2);
            if (type !== InputType.NoOp)
                this._EmitMouseList(type, button, pos, delta, newInputList);
            this._InputList = newInputList;
        }
        if (this._PendingCapture)
            this._PerformCapture(this._PendingCapture);
        if (this._PendingReleaseCapture || (this._Captured && !this._Captured.CanCaptureMouse()))
            this._PerformReleaseCapture();
        this._EmittingMouseEvent = false;
    }
    private _GetMousePosition(evt): Point {
        return new Point(
            evt.clientX + window.pageXOffset + this._CanvasOffset.left,
            evt.clientY + window.pageYOffset + this._CanvasOffset.top);
    }
    private _FindFirstCommonElement(list1: Fayde.UINode[], list2: Fayde.UINode[], outObj) {
        var len1 = list1.length;
        var len2 = list2.length;
        outObj.Index1 = -1;
        outObj.Index2 = -1;
        var i = 0;
        var j = 0;
        for (i = 0; i < len1 && j < len2; i++, j++) {
            var n1 = list1[i];
            var n2 = list2[i];
            if (n1 !== n2)
                return;
            outObj.Index1 = i;
            outObj.Index2 = j;
        }
    }
    private _EmitMouseList(type: InputType, button: number, pos: Point, delta: number, list: Fayde.UINode[], endIndex?: number) {
        var handled = false;
        if (endIndex === 0)
            return handled;
        if (!endIndex || endIndex === -1)
            endIndex = list.length;
        var args = this._CreateEventArgs(type, pos, delta);
        var node = list[0];
        if (node && args instanceof Fayde.RoutedEventArgs)
            args.Source = node.XObject;
        var isL = Surface.IsLeftButton(button);
        var isR = Surface.IsRightButton(button);
        for (var i = 0; i < endIndex; i++) {
            node = list[i];
            if (type === InputType.MouseLeave)
                args.Source = node.XObject;
            if (node._EmitMouseEvent(type, isL, isR, args))
                handled = true;
            if (type === InputType.MouseLeave) //MouseLeave gets new event args on each emit
                args = this._CreateEventArgs(type, pos, delta);
        }
        return handled;
    }
    private _CreateEventArgs(type: InputType, pos: Point, delta: number): Fayde.Input.MouseEventArgs {
        switch (type) {
            case InputType.MouseUp:
                return new Fayde.Input.MouseButtonEventArgs(pos);
            case InputType.MouseDown:
                return new Fayde.Input.MouseButtonEventArgs(pos);
            case InputType.MouseLeave:
                return new Fayde.Input.MouseEventArgs(pos);
            case InputType.MouseEnter:
                return new Fayde.Input.MouseEventArgs(pos);
            case InputType.MouseMove:
                return new Fayde.Input.MouseEventArgs(pos);
            case InputType.MouseWheel:
                return new Fayde.Input.MouseWheelEventArgs(pos, delta);
        }
    }
    SetMouseCapture(uin: Fayde.UINode) {
        if (this._Captured || this._PendingCapture)
            return uin === this._Captured || uin === this._PendingCapture;
        if (!this._EmittingMouseEvent)
            return false;
        this._PendingCapture = uin;
        return true;
    }
    ReleaseMouseCapture(uin: Fayde.UINode) {
        if (uin !== this._Captured && uin !== this._PendingCapture)
            return;
        if (this._EmittingMouseEvent)
            this._PendingReleaseCapture = true;
        else
            this._PerformReleaseCapture();
    }
    private _PerformCapture(uin: Fayde.UINode) {
        this._Captured = uin;
        var newInputList = [];
        while (uin != null) {
            newInputList.push(uin);
            uin = uin.VisualParentNode;
        }
        this._InputList = newInputList;
        this._PendingCapture = null;
    }
    private _PerformReleaseCapture() {
        var oldCaptured = this._Captured;
        this._Captured = null;
        this._PendingReleaseCapture = false;
        oldCaptured._EmitLostMouseCapture(this._CurrentPos);
        this._HandleMouseEvent(InputType.NoOp, null, this._CurrentPos, undefined, false, true);
    }
    private _SetUserInitiatedEvent(val: bool) {
        this._EmitFocusChangeEvents();
        this._FirstUserInitiatedEvent = this._FirstUserInitiatedEvent || val;
        this._UserInitiatedEvent = val;
    }
    Focus(ctrlNode: Fayde.Controls.ControlNode, recurse?: bool): bool {
        recurse = recurse === undefined || recurse === true;
        if (!ctrlNode.IsAttached)
            return false;
        var walker = Fayde.DeepTreeWalker(ctrlNode);
        var uin: Fayde.UINode;
        while (uin = walker.Step()) {
            if (uin.XObject.Visibility !== Fayde.Visibility.Visible) {
                walker.SkipBranch();
                continue;
            }
            if (!(uin instanceof Fayde.Controls.ControlNode))
                continue;
            var cn = <Fayde.Controls.ControlNode>uin;
            var c = cn.XObject;
            if (!c.IsEnabled) {
                if (!recurse)
                    return false;
                walker.SkipBranch();
                continue;
            }
            var loaded = ctrlNode.IsLoaded;
            var check: Fayde.UINode = ctrlNode;
            while (!loaded && (check = check.VisualParentNode)) {
                loaded = loaded || check.IsLoaded;
            }
            if (loaded && cn.LayoutUpdater.TotalIsRenderVisible && c.IsTabStop)
                return this._FocusNode(cn);
            if (!recurse)
                return false;
        }
        return false;
    }
    private _FocusNode(uin?: Fayde.UINode) {
        if (uin === this._FocusedNode)
            return true;
        var fn = this._FocusedNode;
        if (fn) {
            this._FocusChangedEvents.push({
                LostFocus: Surface._ElementPathToRoot(fn),
                GotFocus: null
            });
        }
        this._FocusedNode = uin;
        if (uin) {
            this._FocusChangedEvents.push({
                LostFocus: null,
                GotFocus: Surface._ElementPathToRoot(uin)
            });
        }
        if (this._FirstUserInitiatedEvent)
            this._EmitFocusChangeEventsAsync();
        return true;
    }
    private _EnsureElementFocused() {
        var layers = this._Layers;
        if (!this._FocusedNode) {
            var last = layers.length - 1;
            for (var i = last; i >= 0; i--) {
                if (Fayde.TabNavigationWalker.Focus(layers[i]))
                    break;
            }
            if (!this._FocusedNode && last !== -1)
                this._FocusNode(layers[last]);
        }
        if (this._FirstUserInitiatedEvent)
            this._EmitFocusChangeEventsAsync();
    }
    _RemoveFocusFrom(lu: Fayde.LayoutUpdater) {
        if (this._FocusedNode === lu.Node)
            this._FocusNode(null);
    }
    private _EmitFocusChangeEventsAsync() {
        setTimeout(() => this._EmitFocusChangeEvents(), 1);
    }
    private _EmitFocusChangeEvents() {
        var evts = this._FocusChangedEvents;
        var cur = evts.shift();
        while (cur) {
            this._EmitFocusList("lost", cur.LostFocus);
            this._EmitFocusList("got", cur.GotFocus);
            cur = evts.shift();
        }
    }
    private _EmitFocusList(type: string, list: Fayde.UINode[]) {
        if (!list)
            return;
        var cur = list.shift();
        while (cur) {
            cur._EmitFocusChange(type);
            cur = list.shift();
        }
    }
    private static _ElementPathToRoot(source: Fayde.UINode): Fayde.UINode[] {
        var list: Fayde.UINode[] = [];
        while (source) {
            list.push(source);
            source = source.VisualParentNode;
        }
        return list;
    }
    private static IsLeftButton(button: number): bool {
        return button === 1;
    }
    private static IsRightButton(button: number): bool {
        return button === 2;
    }
    static MeasureWidth(text: string, font: Font): number {
        var ctx = Surface.TestCanvas.getContext("2d");
        ctx.font = font.ToHtml5Object();
        return ctx.measureText(text).width;
    }
}
Nullstone.RegisterType(Surface, "Surface");

module Fayde.Input {
    export interface ICommand {
        Execute(parameter: any);
        CanExecute(parameter: any): bool;
        CanExecuteChanged: MulticastEvent;
    }
    export var ICommand_ = Nullstone.RegisterInterface("ICommand");
}

module Fayde.Input {
    export enum KeyboardNavigationMode {
        Continue = 0,
        Once = 1,
        Cycle = 2,
        None = 3,
        Contained = 4,
        Local = 5,
    }
    export enum ModifierKeys {
        None = 0,
        Alt = 1,
        Control = 2,
        Shift = 4,
        Windows = 8,
        Apple = 16,
    }
    export interface IModifiersOn {
        Shift: bool;
        Ctrl: bool;
        Alt: bool;
    }
    export class Keyboard {
        static Modifiers: ModifierKeys = ModifierKeys.None;
        static RefreshModifiers(e: Fayde.Input.IModifiersOn) {
            if (e.Shift)
                Keyboard.Modifiers |= ModifierKeys.Shift;
            else
                Keyboard.Modifiers &= ~ModifierKeys.Shift;
            if (e.Ctrl)
                Keyboard.Modifiers |= ModifierKeys.Control;
            else
                Keyboard.Modifiers &= ~ModifierKeys.Control;
            if (e.Alt)
                Keyboard.Modifiers |= ModifierKeys.Alt;
            else
                Keyboard.Modifiers &= ~ModifierKeys.Alt;
        }
        static HasControl() {
            return (Keyboard.Modifiers & ModifierKeys.Control) === ModifierKeys.Control;
        }
        static HasAlt() {
            return (Keyboard.Modifiers & ModifierKeys.Alt) === ModifierKeys.Alt;
        }
        static HasShift() {
            return (Keyboard.Modifiers & ModifierKeys.Shift) === ModifierKeys.Shift;
        }
    }
    Nullstone.RegisterType(Keyboard, "Keyboard");
}

module Fayde {
    export interface IAttachedDefinition {
        Owner: Function;
        Prop: string;
        Value: any;
    }
    export class JsonParser {
        private _ResChain: Fayde.ResourceDictionary[] = [];
        private _RootXamlObject: XamlObject = null;
        private _TemplateBindingSource: DependencyObject = null;
        private _SRExpressions: StaticResourceExpression[] = [];
        static Parse(json: any, templateBindingSource?: DependencyObject, namescope?: NameScope, resChain?: Fayde.ResourceDictionary[], rootXamlObject?: XamlObject): XamlObject {
            var parser = new JsonParser();
            if (resChain)
                parser._ResChain = resChain;
            parser._TemplateBindingSource = templateBindingSource;
            parser._RootXamlObject = rootXamlObject;
            if (!namescope)
                namescope = new Fayde.NameScope();
            var xobj = parser.CreateObject(json, namescope);
            return xobj;
        }
        static ParseUserControl(uc: Controls.UserControl, json: any): UIElement {
            var parser = new JsonParser();
            parser._RootXamlObject = uc;
            return <UIElement>parser.SetObject(json, uc, new Fayde.NameScope(true));
        }
        static ParseResourceDictionary(rd: Fayde.ResourceDictionary, json: any) {
            var parser = new JsonParser();
            parser._RootXamlObject = rd;
            parser._ResChain.push(rd);
            parser.SetObject(json, rd, rd.XamlNode.NameScope);
        }
        CreateObject(json: any, namescope: NameScope, ignoreResolve?: bool): XamlObject {
            var type = json.ParseType;
            if (!type)
                return json;
            if (type === Number || type === String || type === Boolean)
                return json.Value;
            if (type === Controls.ControlTemplate) {
                var targetType = json.Props == null ? null : json.Props.TargetType;
                return new Controls.ControlTemplate(targetType, json.Content, this._ResChain);
            }
            if (type === DataTemplate)
                return new DataTemplate(json.Content, this._ResChain);
            var xobj = new type();
            if (!this._RootXamlObject)
                this._RootXamlObject = xobj;
            this.SetObject(json, xobj, namescope, ignoreResolve);
            return xobj;
        }
        SetObject(json: any, xobj: XamlObject, namescope: NameScope, ignoreResolve?: bool): any {
            var xnode: XamlNode;
            if (xobj)
                xnode = xobj.XamlNode;
            if (xnode) {
                if (namescope)
                    xnode.NameScope = namescope;
                var name = json.Name;
                if (name)
                    xnode.SetName(name);
            }
            xobj.TemplateOwner = this._TemplateBindingSource;
            var dobj: DependencyObject;
            if (xobj instanceof DependencyObject)
                dobj = <DependencyObject>xobj;
            var type = json.ParseType;
            var propd: DependencyProperty;
            var propValue;
            if (json.Props) {
                for (var propName in json.Props) {
                    propValue = json.Props[propName];
                    if (propValue === undefined)
                        continue;
                    var ctor = (<any>xobj).constructor;
                    if (dobj)
                        propd = DependencyProperty.GetDependencyProperty(ctor, propName);
                    this.TrySetPropertyValue(xobj, propd, propValue, namescope, false, ctor, propName);
                }
            }
            var attachedProps: IAttachedDefinition[] = json.AttachedProps;
            if (attachedProps) {
                if (!isArray(attachedProps))
                    throw new Exception("json.AttachedProps is not an array");
                for (var i in attachedProps) {
                    var attachedDef: IAttachedDefinition = attachedProps[i];
                    propd = DependencyProperty.GetDependencyProperty(attachedDef.Owner, attachedDef.Prop);
                    propValue = attachedDef.Value;
                    this.TrySetPropertyValue(xobj, propd, propValue, namescope, true, attachedDef.Owner, attachedDef.Prop);
                }
            }
            if (json.Events) {
                for (var i in json.Events) {
                    var targetEvent = xobj[i];
                    if (!targetEvent || !(targetEvent instanceof MulticastEvent))
                        throw new ArgumentException("Could not locate event '" + i + "' on object '" + type._TypeName + "'.");
                    var root = this._RootXamlObject;
                    var callbackName = json.Events[i];
                    var targetCallback = root[callbackName];
                    if (!targetCallback || typeof targetCallback !== "function")
                        throw new ArgumentException("Could not locate event callback '" + callbackName + "' on object '" + (<any>root).constructor._TypeName + "'.");
                    targetEvent.Subscribe(targetCallback, root);
                }
            }
            var content: any;
            var contentProp = this.GetAnnotationMember(type, "ContentProperty");
            var pd: DependencyProperty;
            var pn: string;
            if (contentProp) {
                if (contentProp instanceof DependencyProperty) {
                    pd = contentProp;
                    pn = pd.Name;
                } else if (typeof contentProp === "string") {
                    pn = contentProp;
                }
                content = json.Content;
                if (content) {
                    if (content instanceof Markup)
                        content = content.Transmute(xobj, contentProp, "Content", this._TemplateBindingSource);
                    else
                        content = this.CreateObject(content, namescope, true);
                    this.SetValue(xobj, pd, pn, content);
                }
            }
            if (json.Children) {
                this.TrySetCollectionProperty(<any[]>json.Children, xobj, pd, pn, namescope);
            }
            if (!ignoreResolve) {
                this.ResolveStaticResourceExpressions();
            }
            return content;
        }
        TrySetPropertyValue(xobj: XamlObject, propd: DependencyProperty, propValue: any, namescope: NameScope, isAttached: bool, ownerType: Function, propName: string) {
            if (propValue.ParseType) {
                propValue = this.CreateObject(propValue, namescope, true);
            }
            if (propValue instanceof Markup)
                propValue = propValue.Transmute(xobj, propd, propName, this._TemplateBindingSource);
            if (propValue instanceof StaticResourceExpression) {
                this.SetValue(xobj, propd, propName, propValue);
                return;
            }
            if (propd) {
                if (this.TrySetCollectionProperty(propValue, xobj, propd, undefined, namescope))
                    return;
                if (!(propValue instanceof Fayde.Expression)) {
                    var targetType = propd.GetTargetType();
                    if (targetType instanceof Enum) {
                    } else if (!(propValue instanceof targetType)) {
                        var propDesc = Nullstone.GetPropertyDescriptor(xobj, propName);
                        if (propDesc) {
                            var setFunc = propDesc.set;
                            var converter: (val: any) => any;
                            if (setFunc && (converter = (<any>setFunc).Converter) && converter instanceof Function)
                                propValue = converter(propValue);
                        }
                    }
                }
                this.SetValue(xobj, propd, propName, propValue);
            } else if (!isAttached) {
                if (Nullstone.HasProperty(xobj, propName)) {
                    xobj[propName] = propValue;
                } else {
                    var func = xobj["Set" + propName];
                    if (func && func instanceof Function)
                        func.call(xobj, propValue);
                }
            } else {
                Warn("Could not find attached property: " + (<any>ownerType)._TypeName + "." + propName);
            }
        }
        TrySetCollectionProperty(subJson: any[], xobj: XamlObject, propd: DependencyProperty, propertyName: string, namescope: NameScope) {
            if (!subJson)
                return false;
            if (!((Array.isArray && Array.isArray(subJson)) || (<any>subJson).constructor === Array))
                return false;
            var coll: XamlObjectCollection;
            if (propd) {
                var targetType = propd.GetTargetType();
                if (!Nullstone.DoesInheritFrom(targetType, XamlObjectCollection))
                    return false;
                if (propd._IsAutoCreated) {
                    coll = (<DependencyObject>xobj).GetValue(propd);
                } else {
                    coll = <XamlObjectCollection>(new <any>targetType());
                    (<DependencyObject>xobj).SetValue(propd, coll);
                }
            } else if (typeof propertyName === "string") {
                coll = xobj[propertyName];
            } else if (xobj instanceof XamlObjectCollection) {
                coll = <XamlObjectCollection>xobj;
            }
            if (!(coll instanceof XamlObjectCollection))
                return false;
            if (coll instanceof ResourceDictionary) {
                this.SetResourceDictionary(<ResourceDictionary>coll, subJson, namescope);
            } else {
                for (var i = 0; i < subJson.length; i++) {
                    coll.Add(this.CreateObject(subJson[i], namescope, true));
                }
            }
            return true;
        }
        SetResourceDictionary(rd: ResourceDictionary, subJson: any[], namescope: NameScope) {
            var oldChain = this._ResChain;
            this._ResChain = this._ResChain.slice(0);
            this._ResChain.push(rd);
            var fobj: XamlObject;
            var cur: any;
            var key: any;
            var val: any;
            for (var i = 0; i < subJson.length; i++) {
                cur = subJson[i];
                key = cur.Key;
                val = cur.Value;
                if (val.ParseType === Style) {
                    fobj = this.CreateObject(val, namescope, true);
                    if (!key)
                        key = (<Style>fobj).TargetType;
                } else {
                    fobj = new ResourceTarget(val, namescope, this._TemplateBindingSource, this._ResChain);
                }
                if (key)
                    rd.Set(key, fobj);
            }
            this._ResChain = oldChain;
        }
        ResolveStaticResourceExpressions() {
            var srs = this._SRExpressions;
            if (!srs || srs.length === 0)
                return;
            var cur: StaticResourceExpression;
            while (cur = srs.shift()) {
                cur.Resolve(this, this._ResChain);
            }
        }
        SetValue(xobj:XamlObject, propd: DependencyProperty, propName: string, value: any) {
            if (propd) {
                if (value instanceof StaticResourceExpression) {
                    this._SRExpressions.push(value);
                    (<DependencyObject>xobj).SetValueInternal(propd, new DeferredValueExpression());
                } else if (value instanceof Expression) {
                    (<DependencyObject>xobj).SetValueInternal(propd, value);
                } else {
                    (<DependencyObject>xobj)._Store.SetValue(propd, value);
                }
            } else if (propName) {
                xobj[propName] = value;
            }
        }
        private GetAnnotationMember(type: Function, member: string) {
            if (!type)
                return;
            var t = <any>type;
            var anns = t.Annotations;
            var annotation;
            if (anns && (annotation = anns[member]))
                return annotation;
            return this.GetAnnotationMember(t._BaseClass, member);
        }
    }
    Nullstone.RegisterType(JsonParser, "JsonParser");
    function isArray(o) {
        if (Array.isArray)
            return Array.isArray(o);
        return o && o.constructor === Array;
    }
}

module Fayde {
    export class Markup {
        Transmute(target: XamlObject, propd: DependencyProperty, propName: string, templateBindingSource: DependencyObject) {
        }
    }
    Nullstone.RegisterType(Markup, "Markup");
}

module Fayde {
    export class StaticResourceMarkup extends Markup {
        Key: any;
        constructor(key: any) {
            super();
            this.Key = key;
        }
        Transmute(target: XamlObject, propd: DependencyProperty, propName: string, templateBindingSource: DependencyObject) {
            return new StaticResourceExpression(this.Key, target, propd, propName, templateBindingSource);
        }
    }
    Nullstone.RegisterType(StaticResourceMarkup, "StaticResourceMarkup");
}

module Fayde {
    export class TemplateBindingMarkup extends Markup {
        Path: string;
        constructor(path: string) {
            super();
            this.Path = path;
        }
        Transmute(target: XamlObject, propd: DependencyProperty, propName: string, templateBindingSource: DependencyObject) {
            var sourcePropd = DependencyProperty.GetDependencyProperty((<any>templateBindingSource).constructor, this.Path);
            return new TemplateBindingExpression(sourcePropd, propd, propName);
        }
    }
    Nullstone.RegisterType(TemplateBindingMarkup, "TemplateBindingMarkup");
}

module Fayde.Media {
    export interface IMatrixChangedListener {
        MatrixChanged(newMatrix: Matrix);
    }
    export class Matrix {
        _Raw: number[];
        private _Inverse: Matrix = null;
        private _Listener: IMatrixChangedListener;
        constructor(raw?: number[]) {
            this._Raw = raw;
        }
        get M11() { return this._Raw[0]; }
        set M11(val: number) { this._Raw[0] = val; this._OnChanged(); }
        get M12() { return this._Raw[1]; }
        set M12(val: number) { this._Raw[1] = val; this._OnChanged(); }
        get M21() { return this._Raw[3]; }
        set M21(val: number) { this._Raw[3] = val; this._OnChanged(); }
        get M22() { return this._Raw[4]; }
        set M22(val: number) { this._Raw[4] = val; this._OnChanged(); }
        get OffsetX() { return this._Raw[2]; }
        set OffsetX(val: number) { this._Raw[2] = val; this._OnChanged(); }
        get OffsetY() { return this._Raw[5]; }
        set OffsetY(val: number) { this._Raw[5] = val; this._OnChanged(); }
        get Inverse(): Matrix {
            var inverse = this._Inverse;
            if (!inverse) {
                var i = mat3.identity();
                mat3.inverse(this._Raw, i);
                if (!i)
                    return;
                inverse = new Matrix();
                inverse._Raw = i;
                this._Inverse = inverse;
            }
            return inverse;
        }
        Listen(listener: IMatrixChangedListener) {
            this._Listener = listener;
        }
        Unlisten(listener: IMatrixChangedListener) {
            this._Listener = null;
        }
        private _OnChanged() {
            this._Inverse = null;
            var listener = this._Listener;
            if (listener)
                listener.MatrixChanged(this);
        }
        toString(): string { return mat3.str(this._Raw); }
    }
    Nullstone.RegisterType(Matrix, "Matrix");
}

module Fayde.Media.Animation {
    export class AnimationStorage {
        private _Animation: AnimationBase;
        private _TargetObj: DependencyObject;
        private _TargetProp: DependencyProperty;
        private _Disabled: bool = false;
        private _BaseValue: any;
        private _CurrentValue: any = undefined;
        StopValue: any;
        constructor(animation: AnimationBase, targetObj: DependencyObject, targetProp: DependencyProperty) {
            this._Animation = animation;
            this._TargetObj = targetObj;
            this._TargetProp = targetProp;
            var store = targetObj._Store;
            var prevStorage = store._AttachAnimationStorage(targetProp, this);
            this._BaseValue = store.GetValue(targetProp);
            if (this._BaseValue === undefined) {
                var targetType = targetProp.GetTargetType();
                if (targetType === Number)
                    this._BaseValue = 0;
                else if (targetType === String)
                    this._BaseValue = "";
                else
                    this._BaseValue = new (<any>targetType)();
            }
            if (prevStorage)
                this.StopValue = prevStorage.StopValue;
            else
                this.StopValue = store.ReadLocalValue(targetProp);
        }
        SwitchTarget(target: DependencyObject) {
            var wasDisabled = this._Disabled;
            if (!this._Disabled)
                this.Disable();
            this._TargetObj = target;
            this._Disabled = wasDisabled;
        }
        Enable() {
            this._Disabled = false;
            this.ApplyCurrentValue();
        }
        Disable() { this._Disabled = true; }
        Stop() {
            this.DetachFromObject();
            this.ResetPropertyValue();
        }
        DetachFromObject() {
            var to = this._TargetObj;
            if (!to)
                return;
            var tp = this._TargetProp;
            if (!tp)
                return;
            to._Store._DetachAnimationStorage(tp, this);
        }
        ResetPropertyValue() {
            var to = this._TargetObj;
            if (!to)
                return;
            var tp = this._TargetProp;
            if (!tp)
                return;
            to._Store.SetValue(tp, this.StopValue);
        }
        UpdateCurrentValueAndApply(clockData: IClockData) {
            if (this._Disabled)
                return;
            if (!this._TargetObj)
                return;
            var oldValue = this._CurrentValue;
            this._CurrentValue = this._Animation.GetCurrentValue(this._BaseValue, this.StopValue !== undefined ? this.StopValue : this._BaseValue, clockData);
            if (Nullstone.Equals(oldValue, this._CurrentValue))
                return;
            this.ApplyCurrentValue();
        }
        ApplyCurrentValue() {
            if (this._CurrentValue == null)
                return;
            this._TargetObj._Store.SetValue(this._TargetProp, this._CurrentValue);
        }
    }
    Nullstone.RegisterType(AnimationStorage, "AnimationStorage");
}

module Fayde.Media.Animation {
    export class RepeatBehavior {
        private _Duration: Duration = null;
        private _Count: number = null;
        IsForever: bool = false;
        static FromRepeatDuration(duration: Duration): RepeatBehavior {
            var rb = new RepeatBehavior();
            rb._Duration = duration;
            return rb;
        }
        static FromIterationCount(count: number): RepeatBehavior {
            var rb = new RepeatBehavior();
            rb._Count = count;
            return rb;
        }
        static FromForever(): RepeatBehavior {
            var rb = new RepeatBehavior();
            rb.IsForever = true;
            return rb;
        }
        get HasCount(): bool { return this._Count != null; }
        get Count(): number { return this._Count; }
        get HasDuration(): bool { return this._Duration != null; }
        get Duration(): Duration { return this._Duration; }
        Clone(): RepeatBehavior {
            var rb = new RepeatBehavior();
            rb._Duration = this._Duration;
            rb._Count = this._Count;
            rb.IsForever = this.IsForever;
            return rb;
        }
    }
    Nullstone.RegisterType(RepeatBehavior, "RepeatBehavior");
}

module Fayde.Navigation {
    export class NavService {
        App: App;
        Href: string;
        Hash: string;
        LocationChanged: MulticastEvent = new MulticastEvent();
        constructor(app: App) {
            this.App = app;
            this.Href = window.location.href;
            this.Hash = window.location.hash;
            if (this.Hash) {
                this.Hash = this.Hash.substr(1);
                this.Href = this.Href.substring(0, this.Href.indexOf('#'));
            }
            window.onhashchange = () => this._HandleFragmentChange();
        }
        private _HandleFragmentChange() {
            this.App.Address = new Uri(document.URL);
            this.Hash = window.location.hash;
            if (this.Hash) {
                this.Hash = this.Hash.substr(1);
            }
            this.LocationChanged.Raise(this, EventArgs.Empty);
        }
    }
    Nullstone.RegisterType(NavService, "NavService");
}

class Clip {
    X: number;
    Y: number;
    Width: number;
    Height: number;
    constructor(r: rect) {
        var rounded = rect.roundOut(rect.clone(r));
        this.X = rounded.X;
        this.Y = rounded.Y;
        this.Width = rounded.Width;
        this.Height = rounded.Height;
    }
}
Nullstone.RegisterType(Clip, "Clip");

class Color implements ICloneable {
    private static __NoAlphaRegex = /#([0-9a-fA-F][0-9a-fA-F]){1}([0-9a-fA-F][0-9a-fA-F]){1}([0-9a-fA-F][0-9a-fA-F]){1}/;
    private static __AlphaRegex = /#([0-9a-fA-F][0-9a-fA-F]){1}([0-9a-fA-F][0-9a-fA-F]){1}([0-9a-fA-F][0-9a-fA-F]){1}([0-9a-fA-F][0-9a-fA-F]){1}/;
    R: number = 0;
    G: number = 0;
    B: number = 0;
    A: number = 1.0;
    Add(color2: Color) {
        var c = new Color();
        c.R = this.R + color2.R;
        c.G = this.G + color2.G;
        c.B = this.B + color2.B;
        c.A = this.A + color2.A;
        return c;
    }
    Subtract(color2: Color) {
        var c = new Color();
        c.R = this.R - color2.R;
        c.G = this.G - color2.G;
        c.B = this.B - color2.B;
        c.A = this.A - color2.A;
        return c;
    }
    Multiply(factor: number) {
        var c = new Color();
        c.R = this.R * factor;
        c.G = this.G * factor;
        c.B = this.B * factor;
        c.A = this.A * factor;
        return c;
    }
    Equals(other: Color) {
        return this.R === other.R
            && this.G === other.G
            && this.B === other.B
            && this.A === other.A;
    }
    toString() {
        return "rgba(" + this.R.toString() + "," + this.G.toString() + "," + this.B.toString() + "," + this.A.toString() + ")";
    }
    ToHexStringNoAlpha(): string {
        return "#" + this.R.toString(16) + this.G.toString(16) + this.B.toString(16);
    }
    Clone(): Color {
        return Color.FromRgba(this.R, this.G, this.B, this.A);
    }
    static LERP(start: Color, end: Color, p: number): Color {
        var c = new Color();
        c.R = start.R + (end.R - start.R) * p;
        c.G = start.G + (end.G - start.G) * p;
        c.B = start.B + (end.B - start.B) * p;
        c.A = start.A + (end.A - start.A) * p;
        return c;
    }
    static FromRgba(r: number, g: number, b: number, a: number): Color {
        var c = new Color();
        c.R = r;
        c.G = g;
        c.B = b;
        c.A = a;
        return c;
    }
    static FromHex(hex: string): Color {
        var match;
        var c = new Color();
        if ((match = Color.__AlphaRegex.exec(hex)) != null) {
            c.A = parseInt(match[1], 16) / 255.0;
            c.R = parseInt(match[2], 16);
            c.G = parseInt(match[3], 16);
            c.B = parseInt(match[4], 16);
        } else if ((match = Color.__NoAlphaRegex.exec(hex)) != null) {
            c.A = 1.0;
            c.R = parseInt(match[1], 16);
            c.G = parseInt(match[2], 16);
            c.B = parseInt(match[3], 16);
        }
        return c;
    }
    static KnownColors = {
        AliceBlue: Color.FromHex("#FFF0F8FF"),
        AntiqueWhite: Color.FromHex("#FFFAEBD7"),
        Aqua: Color.FromHex("#FF00FFFF"),
        Aquamarine: Color.FromHex("#FF7FFFD4"),
        Azure: Color.FromHex("#FFF0FFFF"),
        Beige: Color.FromHex("#FFF5F5DC"),
        Bisque: Color.FromHex("#FFFFE4C4"),
        Black: Color.FromHex("#FF000000"),
        BlanchedAlmond: Color.FromHex("#FFFFEBCD"),
        Blue: Color.FromHex("#FF0000FF"),
        BlueViolet: Color.FromHex("#FF8A2BE2"),
        Brown: Color.FromHex("#FFA52A2A"),
        BurlyWood: Color.FromHex("#FFDEB887"),
        CadetBlue: Color.FromHex("#FF5F9EA0"),
        Chartreuse: Color.FromHex("#FF7FFF00"),
        Chocolate: Color.FromHex("#FFD2691E"),
        Coral: Color.FromHex("#FFFF7F50"),
        CornflowerBlue: Color.FromHex("#FF6495ED"),
        Cornsilk: Color.FromHex("#FFFFF8DC"),
        Crimson: Color.FromHex("#FFDC143C"),
        Cyan: Color.FromHex("#FF00FFFF"),
        DarkBlue: Color.FromHex("#FF00008B"),
        DarkCyan: Color.FromHex("#FF008B8B"),
        DarkGoldenrod: Color.FromHex("#FFB8860B"),
        DarkGray: Color.FromHex("#FFA9A9A9"),
        DarkGreen: Color.FromHex("#FF006400"),
        DarkKhaki: Color.FromHex("#FFBDB76B"),
        DarkMagenta: Color.FromHex("#FF8B008B"),
        DarkOliveGreen: Color.FromHex("#FF556B2F"),
        DarkOrange: Color.FromHex("#FFFF8C00"),
        DarkOrchid: Color.FromHex("#FF9932CC"),
        DarkRed: Color.FromHex("#FF8B0000"),
        DarkSalmon: Color.FromHex("#FFE9967A"),
        DarkSeaGreen: Color.FromHex("#FF8FBC8F"),
        DarkSlateBlue: Color.FromHex("#FF483D8B"),
        DarkSlateGray: Color.FromHex("#FF2F4F4F"),
        DarkTurquoise: Color.FromHex("#FF00CED1"),
        DarkViolet: Color.FromHex("#FF9400D3"),
        DeepPink: Color.FromHex("#FFFF1493"),
        DeepSkyBlue: Color.FromHex("#FF00BFFF"),
        DimGray: Color.FromHex("#FF696969"),
        DodgerBlue: Color.FromHex("#FF1E90FF"),
        Firebrick: Color.FromHex("#FFB22222"),
        FloralWhite: Color.FromHex("#FFFFFAF0"),
        ForestGreen: Color.FromHex("#FF228B22"),
        Fuchsia: Color.FromHex("#FFFF00FF"),
        Gainsboro: Color.FromHex("#FFDCDCDC"),
        GhostWhite: Color.FromHex("#FFF8F8FF"),
        Gold: Color.FromHex("#FFFFD700"),
        Goldenrod: Color.FromHex("#FFDAA520"),
        Gray: Color.FromHex("#FF808080"),
        Green: Color.FromHex("#FF008000"),
        GreenYellow: Color.FromHex("#FFADFF2F"),
        Honeydew: Color.FromHex("#FFF0FFF0"),
        HotPink: Color.FromHex("#FFFF69B4"),
        IndianRed: Color.FromHex("#FFCD5C5C"),
        Indigo: Color.FromHex("#FF4B0082"),
        Ivory: Color.FromHex("#FFFFFFF0"),
        Khaki: Color.FromHex("#FFF0E68C"),
        Lavender: Color.FromHex("#FFE6E6FA"),
        LavenderBlush: Color.FromHex("#FFFFF0F5"),
        LawnGreen: Color.FromHex("#FF7CFC00"),
        LemonChiffon: Color.FromHex("#FFFFFACD"),
        LightBlue: Color.FromHex("#FFADD8E6"),
        LightCoral: Color.FromHex("#FFF08080"),
        LightCyan: Color.FromHex("#FFE0FFFF"),
        LightGoldenrodYellow: Color.FromHex("#FFFAFAD2"),
        LightGray: Color.FromHex("#FFD3D3D3"),
        LightGreen: Color.FromHex("#FF90EE90"),
        LightPink: Color.FromHex("#FFFFB6C1"),
        LightSalmon: Color.FromHex("#FFFFA07A"),
        LightSeaGreen: Color.FromHex("#FF20B2AA"),
        LightSkyBlue: Color.FromHex("#FF87CEFA"),
        LightSlateGray: Color.FromHex("#FF778899"),
        LightSteelBlue: Color.FromHex("#FFB0C4DE"),
        LightYellow: Color.FromHex("#FFFFFFE0"),
        Lime: Color.FromHex("#FF00FF00"),
        LimeGreen: Color.FromHex("#FF32CD32"),
        Linen: Color.FromHex("#FFFAF0E6"),
        Magenta: Color.FromHex("#FFFF00FF"),
        Maroon: Color.FromHex("#FF800000"),
        MediumAquamarine: Color.FromHex("#FF66CDAA"),
        MediumBlue: Color.FromHex("#FF0000CD"),
        MediumOrchid: Color.FromHex("#FFBA55D3"),
        MediumPurple: Color.FromHex("#FF9370DB"),
        MediumSeaGreen: Color.FromHex("#FF3CB371"),
        MediumSlateBlue: Color.FromHex("#FF7B68EE"),
        MediumSpringGreen: Color.FromHex("#FF00FA9A"),
        MediumTurquoise: Color.FromHex("#FF48D1CC"),
        MediumVioletRed: Color.FromHex("#FFC71585"),
        MidnightBlue: Color.FromHex("#FF191970"),
        MintCream: Color.FromHex("#FFF5FFFA"),
        MistyRose: Color.FromHex("#FFFFE4E1"),
        Moccasin: Color.FromHex("#FFFFE4B5"),
        NavajoWhite: Color.FromHex("#FFFFDEAD"),
        Navy: Color.FromHex("#FF000080"),
        OldLace: Color.FromHex("#FFFDF5E6"),
        Olive: Color.FromHex("#FF808000"),
        OliveDrab: Color.FromHex("#FF6B8E23"),
        Orange: Color.FromHex("#FFFFA500"),
        OrangeRed: Color.FromHex("#FFFF4500"),
        Orchid: Color.FromHex("#FFDA70D6"),
        PaleGoldenrod: Color.FromHex("#FFEEE8AA"),
        PaleGreen: Color.FromHex("#FF98FB98"),
        PaleTurquoise: Color.FromHex("#FFAFEEEE"),
        PaleVioletRed: Color.FromHex("#FFDB7093"),
        PapayaWhip: Color.FromHex("#FFFFEFD5"),
        PeachPuff: Color.FromHex("#FFFFDAB9"),
        Peru: Color.FromHex("#FFCD853F"),
        Pink: Color.FromHex("#FFFFC0CB"),
        Plum: Color.FromHex("#FFDDA0DD"),
        PowderBlue: Color.FromHex("#FFB0E0E6"),
        Purple: Color.FromHex("#FF800080"),
        Red: Color.FromHex("#FFFF0000"),
        RosyBrown: Color.FromHex("#FFBC8F8F"),
        RoyalBlue: Color.FromHex("#FF4169E1"),
        SaddleBrown: Color.FromHex("#FF8B4513"),
        Salmon: Color.FromHex("#FFFA8072"),
        SandyBrown: Color.FromHex("#FFF4A460"),
        SeaGreen: Color.FromHex("#FF2E8B57"),
        SeaShell: Color.FromHex("#FFFFF5EE"),
        Sienna: Color.FromHex("#FFA0522D"),
        Silver: Color.FromHex("#FFC0C0C0"),
        SkyBlue: Color.FromHex("#FF87CEEB"),
        SlateBlue: Color.FromHex("#FF6A5ACD"),
        SlateGray: Color.FromHex("#FF708090"),
        Snow: Color.FromHex("#FFFFFAFA"),
        SpringGreen: Color.FromHex("#FF00FF7F"),
        SteelBlue: Color.FromHex("#FF4682B4"),
        Tan: Color.FromHex("#FFD2B48C"),
        Teal: Color.FromHex("#FF008080"),
        Thistle: Color.FromHex("#FFD8BFD8"),
        Tomato: Color.FromHex("#FFFF6347"),
        Transparent: Color.FromHex("#00FFFFFF"),
        Turquoise: Color.FromHex("#FF40E0D0"),
        Violet: Color.FromHex("#FFEE82EE"),
        Wheat: Color.FromHex("#FFF5DEB3"),
        White: Color.FromHex("#FFFFFFFF"),
        WhiteSmoke: Color.FromHex("#FFF5F5F5"),
        Yellow: Color.FromHex("#FFFFFF00"),
        YellowGreen: Color.FromHex("#FF9ACD32")
    }
}
Nullstone.RegisterType(Color, "Color");

class CornerRadius implements ICloneable {
    TopLeft: number;
    TopRight: number;
    BottomRight: number;
    BottomLeft: number;
    constructor(topLeft?: number, topRight?: number, bottomRight?: number, bottomLeft?: number) {
        this.TopLeft = topLeft == null ? 0 : topLeft;
        this.TopRight = topRight == null ? 0 : topRight;
        this.BottomRight = bottomRight == null ? 0 : bottomRight;
        this.BottomLeft = bottomLeft == null ? 0 : bottomLeft;
    }
    IsZero(): bool {
        return this.TopLeft === 0
            && this.TopRight === 0
            && this.BottomRight === 0
            && this.BottomLeft === 0;
    }
    Equals(other: CornerRadius): bool {
        return this.TopLeft === other.TopLeft
            && this.TopRight === other.TopRight
            && this.BottomRight === other.BottomRight
            && this.BottomLeft === other.BottomLeft;
    }
    toString(): string {
        return "(" + this.TopLeft + ", " + this.TopRight + ", " + this.BottomRight + ", " + this.BottomLeft + ")";
    }
    Clone(): CornerRadius {
        return new CornerRadius(this.TopLeft, this.TopRight, this.BottomRight, this.BottomLeft);
    }
}
Nullstone.RegisterType(CornerRadius, "CornerRadius");

enum DurationType {
    Automatic = 0,
    Forever = 1,
    TimeSpan = 2,
}
class Duration implements ICloneable {
    private _Type: DurationType;
    private _TimeSpan: TimeSpan;
    static CreateAutomatic(): Duration {
        var d = new Duration();
        d._Type = DurationType.Automatic;
        return d;
    }
    static CreateForever(): Duration {
        var d = new Duration();
        d._Type = DurationType.Forever;
        return d;
    }
    static CreateTimeSpan(ts: TimeSpan): Duration {
        var d = new Duration();
        d._Type = DurationType.TimeSpan;
        d._TimeSpan = ts;
        return d;
    }
    Clone(): Duration {
        var dur = new Duration();
        dur._Type = this._Type;
        dur._TimeSpan = this._TimeSpan;
        return dur;
    }
    get Type(): DurationType { return this._Type; }
    get TimeSpan(): TimeSpan {
        if (this._Type === DurationType.TimeSpan)
            return this._TimeSpan;
        throw new InvalidOperationException("");
    }
    get HasTimeSpan(): bool { return this._Type === DurationType.TimeSpan }
    get IsForever(): bool { return this._Type === DurationType.Forever; }
    get IsAutomatic(): bool { return this._Type === DurationType.Automatic; }
}
Nullstone.RegisterType(Duration, "Duration");

var FontStyle = {
    Normal: "normal",
    Italic: "italic",
    Oblique: "oblique"
};
var FontStretch = {
    UltraCondensed: "ultra-condensed",
    ExtraCondensed: "extra-condensed",
    Condensed: "condensed",
    SemiCondensed: "semi-condensed",
    Normal: "normal",
    SemiExpanded: "semi-expanded",
    Expanded: "expanded",
    ExtraExpanded: "extra-expanded",
    UltraExpanded: "ultra-expanded"
};
var FontWeight = {
    Thin: 100,
    ExtraLight: 200,
    Light: 300,
    Normal: 400,
    Medium: 500,
    SemiBold: 600,
    Bold: 700,
    ExtraBold: 800,
    Black: 900,
    ExtraBlack: 950
};
class Font {
    static DEFAULT_FAMILY = "Segoe UI, Lucida Sans Unicode, Verdana";
    static DEFAULT_STRETCH = FontStretch.Normal;
    static DEFAULT_STYLE = FontStyle.Normal;
    static DEFAULT_WEIGHT = FontWeight.Normal;
    static DEFAULT_SIZE = 14;
    private _Family = Font.DEFAULT_FAMILY;
    private _Stretch = Font.DEFAULT_STRETCH;
    private _Style = Font.DEFAULT_STYLE;
    private _Weight = Font.DEFAULT_WEIGHT;
    private _Size = Font.DEFAULT_SIZE;
    private _CachedTranslation: string;
    private _CachedHeight: number;
    get Family() { return this._Family; }
    set Family(value) {
        if (this._Family == value)
            return;
        this._Family = value;
        this._PurgeCache();
    }
    get Stretch() { return this._Stretch; }
    set Stretch(value) {
        if (this._Stretch == value)
            return;
        this._Stretch = value;
        this._PurgeCache();
    }
    get Style() { return this._Style; }
    set Style(value) {
        if (this._Style == value)
            return;
        this._Style = value;
        this._PurgeCache();
    }
    get Weight() { return this._Weight; }
    set Weight(value) {
        if (this._Weight == value)
            return;
        this._Weight = value;
        this._PurgeCache();
    }
    get Size() { return this._Size; }
    set Size(value) {
        if (this._Size == value)
            return;
        this._Size = value;
        this._PurgeCache();
    }
    get IsChanged() { return this._CachedTranslation == null; }
    GetActualHeight() { return Font._MeasureHeight(this); }
    _Descender() { return 0.0; } //most likely removable
    _Ascender() { return 0.0; } //most likely removable
    private _PurgeCache() {
        this._CachedHeight = undefined;
        this._CachedTranslation = undefined;
    }
    ToHtml5Object(): string {
        if (!this._CachedTranslation)
            this._CachedTranslation = this._BuildTranslation();
        return this._CachedTranslation;
    }
    private _BuildTranslation(): string {
        var s = "";
        s += this.Style.toString() + " ";
        s += "normal ";
        s += this.Weight.toString() + " ";
        s += this.Size + "px ";
        s += this.Family.toString();
        return s;
    }
    private static _MeasureHeight(font: Font) {
        if (font._CachedHeight)
            return font._CachedHeight;
        var body = document.getElementsByTagName("body")[0];
        var dummy = document.createElement("div");
        var dummyText = document.createTextNode("M");
        dummy.appendChild(dummyText);
        dummy.setAttribute("style", "font: " + font.ToHtml5Object() + ";");
        body.appendChild(dummy);
        var result = dummy.offsetHeight;
        body.removeChild(dummy);
        font._CachedHeight = result;
        return result;
    }
}
Nullstone.RegisterType(Font, "Font");

class FontFamily implements ICloneable {
    constructor(public FamilyNames: string) { }
    toString(): string {
        return this.FamilyNames;
    }
    Clone(): FontFamily {
        return new FontFamily(this.FamilyNames);
    }
}
Nullstone.RegisterType(FontFamily, "FontFamily");

class KeyTime implements ICloneable {
    private _IsPaced: bool = false;
    private _IsUniform: bool = false;
    private _TimeSpan: TimeSpan = null;
    private _Percent: number = 0;
    IsValid: bool = true;
    static CreateUniform(): KeyTime {
        var kt = new KeyTime();
        kt._IsUniform = true;
        return kt;
    }
    static CreateTimeSpan(ts: TimeSpan): KeyTime {
        var kt = new KeyTime();
        kt._TimeSpan = ts;
        return kt;
    }
    Clone(): KeyTime {
        var kt = new KeyTime();
        kt._TimeSpan = this._TimeSpan;
        kt._IsPaced = this._IsPaced;
        kt._IsUniform = this._IsUniform;
        kt._Percent = this._Percent;
        return kt;
    }
    get IsPaced(): bool { return this._IsPaced; }
    get IsUniform(): bool { return this._IsUniform; }
    get HasTimeSpan(): bool { return this._TimeSpan != null; }
    get TimeSpan(): TimeSpan { return this._TimeSpan; }
    get HasPercent(): bool { return this._Percent != null; }
    get Percent(): number { return this._Percent; }
}
Nullstone.RegisterType(KeyTime, "KeyTime");

interface IPoint {
    X: number;
    Y: number;
}
class Point implements ICloneable, IPoint {
    X: number;
    Y: number;
    constructor(x?: number, y?: number) {
        this.X = x == null ? 0 : x;
        this.Y = y == null ? 0 : y;
    }
    toString(): string {
        return "X=" + this.X.toString() + ";Y=" + this.Y.toString();
    };
    Equals(other: Point): bool {
        return this.X === other.X && this.Y === other.Y;
    }
    Clone(): Point {
        return new Point(this.X, this.Y);
    }
    static Equals(p1: Point, p2: Point) {
        if (p1 == null)
            return p2 == null;
        if (p2 == null)
            return false;
        return p1.X === p2.X && p1.Y === p2.Y;
    }
    static LERP(start: Point, end: Point, p: number) {
        var x = start.X + (end.X - start.X) * p;
        var y = start.Y + (end.Y - start.Y) * p;
        return new Point(x, y);
    }
}
Nullstone.RegisterType(Point, "Point");

var RectOverlap = {
    Out: 0,
    In: 1,
    Part: 2
};
class rect implements ICloneable {
    X: number = 0;
    Y: number = 0;
    Width: number = 0;
    Height: number = 0;
    toString(): string {
        return "{" + this.X + "," + this.Y + "," + this.Width + "," + this.Height + "}";
    }
    Clone(): rect {
        var r = new rect();
        r.X = this.X;
        r.Y = this.Y;
        r.Width = this.Width;
        r.Height = this.Height;
        return r;
    }
    static fromSize(size: size): rect {
        var r = new rect();
        r.Width = size.Width;
        r.Height = size.Height;
        return r;
    }
    static clear(dest: rect) {
        dest.X = 0;
        dest.Y = 0;
        dest.Width = 0;
        dest.Height = 0;
    }
    static set (dest: rect, x: number, y: number, width: number, height: number) {
        dest.X = x;
        dest.Y = y;
        dest.Width = width;
        dest.Height = height;
    }
    static isEmpty(rect1: rect) {
        return rect1.Width <= 0
            || rect1.Height <= 0;
    }
    static isEmptyLogical(rect1: rect) {
        return rect1.Width <= 0
            && rect1.Height <= 0;
    }
    static copyTo(src: rect, dest: rect) {
        dest.X = src.X;
        dest.Y = src.Y;
        dest.Width = src.Width;
        dest.Height = src.Height;
    }
    static clone(src: rect): rect {
        var r = new rect();
        r.X = src.X;
        r.Y = src.Y;
        r.Width = src.Width;
        r.Height = src.Height;
        return r;
    }
    static isEqual(rect1: rect, rect2: rect): bool {
        return rect1.X === rect2.X
            && rect1.Y === rect2.Y
            && rect1.Width === rect2.Width
            && rect1.Height === rect2.Height;
    }
    static intersection(rect1: rect, rect2: rect) {
        var x = Math.max(rect1.X, rect2.X);
        var y = Math.max(rect1.Y, rect2.Y);
        rect1.Width = Math.max(0, Math.min(rect1.X + rect1.Width, rect2.X + rect2.Width) - x);
        rect1.Height = Math.max(0, Math.min(rect1.Y + rect1.Height, rect2.Y + rect2.Height) - y);
        rect1.X = x;
        rect1.Y = y;
    }
    static union(rect1: rect, rect2: rect) {
        if (rect.isEmpty(rect2))
            return;
        if (rect.isEmpty(rect1)) {
            rect.copyTo(rect2, rect1);
            return;
        }
        var x = Math.min(rect1.X, rect2.X);
        var y = Math.min(rect1.Y, rect2.Y);
        rect1.Width = Math.max(rect1.X + rect1.Width, rect2.X + rect2.Width) - x;
        rect1.Height = Math.max(rect1.Y + rect1.Height, rect2.Y + rect2.Height) - y;
        rect1.X = x;
        rect1.Y = y;
    }
    static unionLogical(rect1: rect, rect2: rect) {
        if (rect.isEmptyLogical(rect2))
            return;
        if (rect.isEmptyLogical(rect1)) {
            rect.copyTo(rect2, rect1);
            return;
        }
        var x = Math.min(rect1.X, rect2.X);
        var y = Math.min(rect1.Y, rect2.Y);
        rect1.Width = Math.max(rect1.X + rect1.Width, rect2.X + rect2.Width) - x;
        rect1.Height = Math.max(rect1.Y + rect1.Height, rect2.Y + rect2.Height) - y;
        rect1.X = x;
        rect1.Y = y;
    }
    static growBy(dest: rect, left: number, top: number, right: number, bottom: number) {
        dest.X -= left;
        dest.Y -= top;
        dest.Width += left + right;
        dest.Height += top + bottom;
        if (dest.Width < 0)
            dest.Width = 0;
        if (dest.Height < 0)
            dest.Height = 0;
    }
    static growByThickness(dest: rect, thickness) {
        dest.X -= thickness.Left;
        dest.Y -= thickness.Top;
        dest.Width += thickness.Left + thickness.Right;
        dest.Height += thickness.Top + thickness.Bottom;
        if (dest.Width < 0)
            dest.Width = 0;
        if (dest.Height < 0)
            dest.Height = 0;
    }
    static shrinkBy(dest: rect, left: number, top: number, right: number, bottom: number) {
        dest.X += left;
        dest.Y += top;
        dest.Width -= left + right;
        dest.Height -= top + bottom;
        if (dest.Width < 0)
            dest.Width = 0;
        if (dest.Height < 0)
            dest.Height = 0;
    }
    static shrinkByThickness(dest: rect, thickness) {
        dest.X += thickness.Left;
        dest.Y += thickness.Top;
        dest.Width -= thickness.Left + thickness.Right;
        dest.Height -= thickness.Top + thickness.Bottom;
        if (dest.Width < 0)
            dest.Width = 0;
        if (dest.Height < 0)
            dest.Height = 0;
    }
    static extendTo(rect1: rect, x: number, y: number) {
        var rx = rect1.X;
        var ry = rect1.Y;
        var rw = rect1.Width;
        var rh = rect1.Height;
        if (x < rx || x > (rx + rw))
            rw = Math.max(Math.abs(x - rx), Math.abs(x - rx - rw));
        if (y < ry || y > (ry + rh))
            rh = Math.max(Math.abs(y - ry), Math.abs(y - ry - rh));
        rect1.X = Math.min(rx, x);
        rect1.Y = Math.min(ry, y);
        rect1.Width = rw;
        rect1.Height = rh;
    }
    static transform(dest: rect, xform: number[]): rect {
        if (!xform)
            return dest;
        var x = dest.X;
        var y = dest.Y;
        var width = dest.Width;
        var height = dest.Height;
        var p1 = vec2.createFrom(x, y);
        var p2 = vec2.createFrom(x + width, y);
        var p3 = vec2.createFrom(x + width, y + height);
        var p4 = vec2.createFrom(x, y + height);
        mat3.transformVec2(xform, p1);
        mat3.transformVec2(xform, p2);
        mat3.transformVec2(xform, p3);
        mat3.transformVec2(xform, p4);
        var l = Math.min(p1[0], p2[0], p3[0], p4[0]);
        var t = Math.min(p1[1], p2[1], p3[1], p4[1]);
        var r = Math.max(p1[0], p2[0], p3[0], p4[0]);
        var b = Math.max(p1[1], p2[1], p3[1], p4[1]);
        dest.X = l;
        dest.Y = t;
        dest.Width = r - l;
        dest.Height = b - t;
        return dest;
    }
    private static clipmask(clip) {
        var mask = 0;
        if (-clip[0] + clip[3] < 0) mask |= (1 << 0);
        if (clip[0] + clip[3] < 0) mask |= (1 << 1);
        if (-clip[1] + clip[3] < 0) mask |= (1 << 2);
        if (clip[1] + clip[3] < 0) mask |= (1 << 3);
        if (clip[2] + clip[3] < 0) mask |= (1 << 4);
        if (-clip[2] + clip[3] < 0) mask |= (1 << 5);
        return mask;
    };
    static transform4(dest: rect, projection: number[]): rect {
        if (!projection)
            return dest;
        var x = dest.X;
        var y = dest.Y;
        var width = dest.Width;
        var height = dest.Height;
        var p1 = vec4.createFrom(x, y, 0.0, 1.0);
        var p2 = vec4.createFrom(x + width, y, 0.0, 1.0);
        var p3 = vec4.createFrom(x + width, y + height, 0.0, 1.0);
        var p4 = vec4.createFrom(x, y + height, 0.0, 1.0);
        mat4.transformVec4(projection, p1);
        mat4.transformVec4(projection, p2);
        mat4.transformVec4(projection, p3);
        mat4.transformVec4(projection, p4);
        var vs = 65536.0;
        var vsr = 1.0 / vs;
        p1[0] *= vsr;
        p1[1] *= vsr;
        p2[0] *= vsr;
        p2[1] *= vsr;
        p3[0] *= vsr;
        p3[1] *= vsr;
        p4[0] *= vsr;
        p4[1] *= vsr;
        var cm1 = clipmask(p1);
        var cm2 = clipmask(p2);
        var cm3 = clipmask(p3);
        var cm4 = clipmask(p4);
        if ((cm1 | cm2 | cm3 | cm4) !== 0) {
            if ((cm1 & cm2 & cm3 & cm4) === 0) {
                rect.clear(dest);
            }
        } else {
            var p1w = 1.0 / p1[3];
            var p2w = 1.0 / p2[3];
            var p3w = 1.0 / p3[3];
            var p4w = 1.0 / p4[3];
            p1[0] *= p1w * vs;
            p1[1] *= p1w * vs;
            p2[0] *= p2w * vs;
            p2[1] *= p2w * vs;
            p3[0] *= p3w * vs;
            p3[1] *= p3w * vs;
            p4[0] *= p4w * vs;
            p4[1] *= p4w * vs;
            dest.X = p1[0];
            dest.Y = p1[1];
            dest.Width = 0;
            dest.Height = 0;
            rect.extendTo(dest, p2[0], p2[1]);
            rect.extendTo(dest, p3[0], p3[1]);
            rect.extendTo(dest, p4[0], p4[1]);
        }
        return dest;
    }
    static round(dest: rect): rect {
        dest.X = Math.round(dest.X);
        dest.Y = Math.round(dest.Y);
        dest.Width = Math.round(dest.Width);
        dest.Height = Math.round(dest.Height);
        return dest;
    }
    static roundOut(dest: rect): rect {
        var x = Math.floor(dest.X);
        var y = Math.floor(dest.Y);
        dest.Width = Math.ceil(dest.X + dest.Width) - Math.floor(dest.X);
        dest.Height = Math.ceil(dest.Y + dest.Height) - Math.floor(dest.Y);
        dest.X = x;
        dest.Y = y;
        return dest;
    }
    static roundIn(dest: rect): rect {
        var x = Math.ceil(dest.X);
        var y = Math.ceil(dest.Y);
        dest.Width = Math.floor(dest.X + dest.Width) - Math.ceil(dest.X);
        dest.Height = Math.floor(dest.Y + dest.Height) - Math.ceil(dest.Y);
        dest.X = x;
        dest.Y = y;
        return dest;
    }
    static copyGrowTransform(dest: rect, src: rect, thickness, xform) {
        rect.copyTo(src, dest);
        rect.growByThickness(dest, thickness);
        rect.transform(dest, xform);
    }
    static copyGrowTransform4(dest: rect, src: rect, thickness, projection) {
        rect.copyTo(src, dest);
        rect.growByThickness(dest, thickness);
        rect.transform4(dest, projection);
    }
    static containsPoint(rect1: rect, p): bool {
        return rect1.X <= p.X
            && rect1.Y <= p.Y
            && (rect1.X + rect1.Width) >= p.X
            && (rect1.Y + rect1.Height) >= p.Y;
    }
    static containsPointXY(rect1: rect, x: number, y: number): bool {
        return rect1.X <= x
            && rect1.Y <= y
            && (rect1.X + rect1.Width) >= x
            && (rect1.Y + rect1.Height) >= y;
    }
    static rectIn(rect1: rect, rect2: rect) {
        var copy = rect.clone(rect1);
        rect.intersection(copy, rect2);
        if (rect.isEmpty(copy))
            return RectOverlap.Out;
        if (rect.isEqual(copy, rect2))
            return RectOverlap.In;
        return RectOverlap.Part;
    }
    static isRectContainedIn(src: rect, test: rect) {
        var copy = rect.clone(src);
        rect.intersection(copy, test);
        return !rect.isEqual(src, copy);
    }
}
Nullstone.RegisterType(rect, "rect");

interface ISize {
    Width: number;
    Height: number;
}
class size implements ICloneable, ISize {
    Width: number = 0;
    Height: number = 0;
    toString(): string {
        return "{" + this.Width + "," + this.Height + "}";
    }
    Clone(): size {
        var s = new size();
        s.Width = this.Width;
        s.Height = this.Height;
        return s;
    }
    static fromRaw(width: number, height: number): size {
        var s = new size();
        s.Width = width;
        s.Height = height;
        return s;
    }
    static fromRect(src: rect): size {
        var s = new size();
        s.Width = src.Width;
        s.Height = src.Height;
        return s;
    }
    static createInfinite(): size {
        var s = new size();
        s.Width = Number.POSITIVE_INFINITY;
        s.Height = Number.POSITIVE_INFINITY;
        return s;
    }
    static createNegativeInfinite(): size {
        var s = new size();
        s.Width = Number.NEGATIVE_INFINITY;
        s.Height = Number.NEGATIVE_INFINITY;
        return s;
    }
    static copyTo(src: size, dest: size) {
        dest.Width = src.Width;
        dest.Height = src.Height;
    }
    static clone(src: size): size {
        var s = new size();
        s.Width = src.Width;
        s.Height = src.Height;
        return s;
    }
    static clear(dest: size) {
        dest.Width = 0;
        dest.Height = 0;
    }
    static isEqual(size1: size, size2: size): bool {
        return size1.Width === size2.Width
            && size1.Height === size2.Height;
    }
    static growBy(dest: size, width: number, height: number) {
        var h = dest.Height;
        var w = dest.Width;
        if (h != Number.POSITIVE_INFINITY)
            h += height;
        if (w != Number.POSITIVE_INFINITY)
            w += width;
        dest.Width = w > 0 ? w : 0;
        dest.Height = h > 0 ? h : 0;
        return dest;
    }
    static growByThickness(dest: size, thickness) {
        var w = dest.Width;
        var h = dest.Height;
        if (w != Number.POSITIVE_INFINITY)
            w += thickness.Left + thickness.Right;
        if (h != Number.POSITIVE_INFINITY)
            h += thickness.Top + thickness.Bottom;
        dest.Width = w > 0 ? w : 0;
        dest.Height = h > 0 ? h : 0;
        return dest;
    }
    static shrinkBy(dest: size, width: number, height: number) {
        var h = dest.Height;
        var w = dest.Width;
        if (h != Number.POSITIVE_INFINITY)
            h -= height;
        if (w != Number.POSITIVE_INFINITY)
            w -= width;
        dest.Width = w > 0 ? w : 0;
        dest.Height = h > 0 ? h : 0;
        return dest;
    }
    static shrinkByThickness(dest: size, thickness) {
        var w = dest.Width;
        var h = dest.Height;
        if (w != Number.POSITIVE_INFINITY)
            w -= thickness.Left + thickness.Right;
        if (h != Number.POSITIVE_INFINITY)
            h -= thickness.Top + thickness.Bottom;
        dest.Width = w > 0 ? w : 0;
        dest.Height = h > 0 ? h : 0;
        return dest;
    }
    static min(dest: size, other: size) {
        dest.Width = Math.min(dest.Width, other.Width);
        dest.Height = Math.min(dest.Height, other.Height);
        return dest;
    }
    static max(dest: size, other: size) {
        dest.Width = Math.max(dest.Width, other.Width);
        dest.Height = Math.max(dest.Height, other.Height);
        return dest;
    }
}
Nullstone.RegisterType(size, "size");

class Thickness implements ICloneable {
    Left: number;
    Top: number;
    Right: number;
    Bottom: number;
    constructor(left?: number, top?: number, right?: number, bottom?: number) {
        this.Left = left == null ? 0 : left;
        this.Top = top == null ? 0 : top;
        this.Right = right == null ? 0 : right;
        this.Bottom = bottom == null ? 0 : bottom;
    }
    Plus(thickness2: Thickness) {
        var t = new Thickness();
        t.Left = this.Left + thickness2.Left;
        t.Right = this.Right + thickness2.Right;
        t.Top = this.Top + thickness2.Top;
        t.Bottom = this.Bottom + thickness2.Bottom;
        return t;
    }
    IsEmpty(): bool {
        return this.Left == 0 && this.Top == 0 && this.Right == 0 && this.Bottom == 0;
    }
    IsBalanced(): bool {
        return this.Left === this.Top
            && this.Left === this.Right
            && this.Left === this.Bottom;
    }
    toString(): string {
        return "(" + this.Left + ", " + this.Top + ", " + this.Right + ", " + this.Bottom + ")";
    }
    Clone(): Thickness {
        return new Thickness(this.Left, this.Top, this.Right, this.Bottom);
    }
    static Equals(thickness1: Thickness, thickness2: Thickness) {
        if (thickness1 == null && thickness2 == null)
            return true;
        if (thickness1 == null || thickness2 == null)
            return false;
        return thickness1.Left === thickness2.Left
            && thickness1.Top === thickness2.Top
            && thickness1.Right === thickness2.Right
            && thickness1.Bottom === thickness2.Bottom;
    }
}
Nullstone.RegisterType(Thickness, "Thickness");

class TimeSpan {
    private static _TicksPerMillisecond = 1;
    private static _TicksPerSecond = 1000;
    private static _TicksPerMinute = TimeSpan._TicksPerSecond * 60;
    private static _TicksPerHour = TimeSpan._TicksPerMinute * 60;
    private static _TicksPerDay = TimeSpan._TicksPerHour * 24;
    private _Ticks: number = 0;
    static FromTicks(ticks: number): TimeSpan {
        var ts = new TimeSpan();
        ts._Ticks = ticks;
        return ts;
    }
    static FromArgs(days: number, hours: number, minutes: number, seconds: number, milliseconds?: number): TimeSpan {
        var ts = new TimeSpan();
        ts._Ticks = (days * TimeSpan._TicksPerDay) + (hours * TimeSpan._TicksPerHour) + (minutes * TimeSpan._TicksPerMinute)
            + (seconds * TimeSpan._TicksPerSecond) + (milliseconds * TimeSpan._TicksPerMillisecond);
        return ts;
    }
    get Days(): number { return Math.floor(this._Ticks / TimeSpan._TicksPerDay); }
    get Hours(): number {
        var remTicks = this._Ticks % TimeSpan._TicksPerDay;
        return Math.floor(remTicks / TimeSpan._TicksPerHour);
    }
    get Minutes(): number {
        var remTicks = this._Ticks % TimeSpan._TicksPerDay;
        remTicks = remTicks % TimeSpan._TicksPerHour;
        return Math.floor(remTicks / TimeSpan._TicksPerMinute);
    }
    get Seconds(): number {
        var remTicks = this._Ticks % TimeSpan._TicksPerDay;
        remTicks = remTicks % TimeSpan._TicksPerHour;
        remTicks = remTicks % TimeSpan._TicksPerMinute;
        return Math.floor(remTicks / TimeSpan._TicksPerSecond);
    }
    get Milliseconds(): number {
        var remTicks = this._Ticks % TimeSpan._TicksPerDay;
        remTicks = remTicks % TimeSpan._TicksPerHour;
        remTicks = remTicks % TimeSpan._TicksPerMinute;
        remTicks = remTicks % TimeSpan._TicksPerSecond;
        return Math.floor(remTicks / TimeSpan._TicksPerMillisecond);
    }
    get Ticks(): number { return this._Ticks; }
    get TotalDays(): number { return this._Ticks / TimeSpan._TicksPerDay; }
    get TotalHours(): number { return this._Ticks / TimeSpan._TicksPerHour; }
    get TotalMinutes(): number { return this._Ticks / TimeSpan._TicksPerMinute; }
    get TotalSeconds(): number { return this._Ticks / TimeSpan._TicksPerSecond; }
    get TotalMilliseconds(): number { return this._Ticks / TimeSpan._TicksPerMillisecond; }
    AddTicks(ticks: number) {
        if (ticks == null)
            return;
        if (isNaN(ticks))
            return;
        this._Ticks += ticks;
    }
    AddMilliseconds(milliseconds: number) {
        this.AddTicks(milliseconds * TimeSpan._TicksPerMillisecond);
    }
    Add(ts2: TimeSpan): TimeSpan {
        var ts = new TimeSpan();
        ts._Ticks = this._Ticks + ts2._Ticks;
        return ts;
    }
    Subtract(ts2: TimeSpan): TimeSpan {
        var ts = new TimeSpan();
        ts._Ticks = this._Ticks - ts2._Ticks;
        return ts;
    }
    Multiply(v: number): TimeSpan {
        var ts = new TimeSpan();
        ts._Ticks = Math.round(this._Ticks * v);
        return ts;
    }
    Divide(ts2: TimeSpan): TimeSpan {
        var ts = new TimeSpan();
        ts._Ticks = this._Ticks / ts2._Ticks;
        return ts;
    }
    CompareTo(ts2: TimeSpan): number {
        if (this._Ticks === ts2._Ticks)
            return 0;
        return (this._Ticks > ts2._Ticks) ? 1 : -1;
    }
    IsZero(): bool {
        return this._Ticks === 0;
    }
    GetJsDelay(): number {
        return this._Ticks * TimeSpan._TicksPerMillisecond;
    }
}
Nullstone.RegisterType(TimeSpan, "TimeSpan");

class Uri implements ICloneable {
    private _OriginalString: string;
    constructor(originalString: string) {
        this._OriginalString = originalString;
    }
    GetFragment(): string {
        return "";
    }
    toString(): string {
        return this._OriginalString;
    }
    Clone():Uri {
        return new Uri(this._OriginalString);
    }
    static IsNullOrEmpty(uri: Uri): bool {
        if (uri == null)
            return true;
        if (uri._OriginalString)
            return false;
        return true;
    }
}
Nullstone.RegisterType(Uri, "Uri");

class BError {
    static Argument: number = 2;
    static InvalidOperation: number = 3;
    static XamlParse: number = 5;
    static Attach: number = 6;
    Message: string;
    Number: number;
    Data: any;
    ThrowException() {
        var ex: Exception;
        switch (this.Number) {
            case BError.Attach:
                ex = new AttachException(this.Message, this.Data);
                break;
            case BError.Argument:
                ex = new ArgumentException(this.Message);
                break;
            case BError.InvalidOperation:
                ex = new InvalidOperationException(this.Message);
                break;
            case BError.XamlParse:
                ex = new XamlParseException(this.Message);
                break;
            default:
                ex = new Exception(this.Message);
                break;
        }
        throw ex;
    }
}
Nullstone.RegisterType(BError, "BError");

class Enum {
    constructor(public Object: any) {
    }
}
Nullstone.RegisterType(Enum, "Enum");

module Fayde {
    export interface IEnumerable {
        GetEnumerator(reverse?: bool): IEnumerator;
    }
    export var IEnumerable_ = Nullstone.RegisterInterface("IEnumerable");
    export interface IEnumerator {
        Current: any;
        MoveNext(): bool;
    }
    export var IEnumerator_ = Nullstone.RegisterInterface("IEnumerator");
    export class ArrayEx {
        static EmptyEnumerator = {
            MoveNext: function () { return false; },
            Current: undefined
        };
        static GetEnumerator(arr: any[], isReverse?: bool): IEnumerator {
            var len = arr.length;
            var e = { MoveNext: undefined, Current: undefined };
            var index;
            if (isReverse) {
                index = len;
                e.MoveNext = function () {
                    index--;
                    if (index < 0) {
                        e.Current = undefined;
                        return false;
                    }
                    e.Current = arr[index];
                    return true;
                };
            } else {
                index = -1;
                e.MoveNext = function () {
                    index++;
                    if (index >= len) {
                        e.Current = undefined;
                        return false;
                    }
                    e.Current = arr[index];
                    return true;
                };
            }
            return e;
        }
    }
}

class EventArgs {
    static Empty: EventArgs = new EventArgs();
}
Nullstone.RegisterType(EventArgs, "EventArgs");

interface IEventListener {
    Closure: any;
    Callback: (sender: any, e: EventArgs) => void;
}
class MulticastEvent {
    private _Listeners: IEventListener[] = [];
    Subscribe(callback: (sender: any, e: EventArgs) => void , closure: any) {
        this._Listeners.push({ Closure: closure, Callback: callback });
    }
    Unsubscribe(callback: (sender: any, e: EventArgs) => void , closure: any) {
        var listeners = this._Listeners;
        var len = listeners.length;
        var listener: IEventListener = null;
        var i = 0;
        while (i < len) {
            listener = listeners[i];
            if (listener.Closure === closure && listener.Callback === callback)
                listeners.splice(i, 1);
            else
                i++;
        }
    }
    Raise(sender: any, args: EventArgs) {
        var listeners = this._Listeners;
        var len = listeners.length;
        var listener: IEventListener = null;
        for (var i = 0; i < len; i++) {
            listener = listeners[i];
            listener.Callback.call(listener.Closure, sender, args);
        }
    }
    RaiseAsync(sender: any, args: EventArgs) {
        window.setTimeout(() => this.Raise(sender, args), 1);
    }
}
Nullstone.RegisterType(MulticastEvent, "MulticastEvent");

module Fayde {
    export class DeferredValueExpression extends Expression {
        GetValue(propd: DependencyProperty): any {
            return undefined;
        }
    }
    Nullstone.RegisterType(DeferredValueExpression, "DeferredValueExpression");
}

module Fayde {
    export class UnsetValue { }
    export class DONode extends XamlNode {
        XObject: DependencyObject;
        Store: Providers.BasicProviderStore;
        constructor(xobj: DependencyObject) {
            super(xobj);
        }
        OnParentChanged(oldParentNode: XamlNode, newParentNode: XamlNode) {
            this.Store.SetDataContextSourceNode(newParentNode);
        }
        get DataContext(): any { return this.XObject.DataContext; }
        set DataContext(value: any) {
            var old = this.XObject.DataContext;
            if (!this.Store.OnDataContextSourceValueChanged(old, value))
                return;
            this.OnDataContextChanged(old, value);
        }
    }
    Nullstone.RegisterType(DONode, "DONode");
    export class DependencyObject extends XamlObject implements ICloneable {
        private _Expressions: Expression[] = [];
        _Store: Providers.BasicProviderStore;
        static DataContextProperty: DependencyProperty = DependencyProperty.RegisterCore("DataContext", () => Object, DependencyObject, undefined);
        DataContext: any;
        constructor() {
            super();
            this.XamlNode.Store = this._Store = this.CreateStore();
        }
        XamlNode: DONode;
        CreateNode(): DONode { return new DONode(this); }
        CreateStore(): Providers.BasicProviderStore {
            var s = new Providers.BasicProviderStore(this);
            s.SetProviders([null, 
                new Providers.LocalValueProvider(), 
                null,
                null,
                null,
                null,
                new Providers.InheritedDataContextProvider(s),
                new Providers.DefaultValueProvider(),
                new Providers.AutoCreateProvider()]
            );
            return s;
        }
        GetValue(propd: DependencyProperty): any {
            if (!propd)
                throw new ArgumentException("No property specified.");
            return this._Store.GetValue(propd);
        }
        SetValue(propd: DependencyProperty, value: any) {
            if (!propd)
                throw new ArgumentException("No property specified.");
            if (propd.IsReadOnly)
                throw new InvalidOperationException("DependencyProperty '" + (<any>propd.OwnerType)._TypeName + "." + propd.Name + "' is read only.");
            this.SetValueInternal(propd, value);
        }
        SetValueInternal(propd: DependencyProperty, value: any) {
            var expression: Expression;
            if (value instanceof Expression)
                expression = value;
            if (expression instanceof Data.BindingExpressionBase) {
                var binding = (<Data.BindingExpressionBase>expression).Binding;
                var path = binding.Path.Path;
                if ((!path || path === ".") && binding.Mode === Data.BindingMode.TwoWay)
                    throw new ArgumentException("TwoWay bindings require a non-empty Path.");
                binding.Seal();
            }
            var existing = this._Expressions[propd._ID];
            var updateTwoWay = false;
            var addingExpression = false;
            if (expression) {
                if (expression !== existing) {
                    if (expression.IsAttached)
                        throw new ArgumentException("Cannot attach the same Expression to multiple FrameworkElements");
                    if (existing)
                        this._RemoveExpression(propd);
                    this._AddExpression(propd, expression);
                }
                addingExpression = true;
                value = expression.GetValue(propd);
            } else if (existing) {
                if (existing instanceof Data.BindingExpressionBase) {
                    var binding = (<Data.BindingExpressionBase>existing).Binding;
                    if (binding.Mode === Data.BindingMode.TwoWay) {
                        updateTwoWay = !existing.IsUpdating && !propd.IsCustom;
                    } else if (!existing.IsUpdating || binding.Mode === Data.BindingMode.OneTime) {
                        this._RemoveExpression(propd);
                    }
                } else if (!existing.IsUpdating) {
                    this._RemoveExpression(propd);
                }
            }
            try {
                this._Store.SetValue(propd, value);
                if (updateTwoWay)
                    (<Data.BindingExpressionBase>existing)._TryUpdateSourceObject(value);
            } catch (err) {
                if (!addingExpression)
                    throw err;
                this._Store.SetValue(propd, propd.DefaultValue);
                if (updateTwoWay)
                    (<Data.BindingExpressionBase>existing)._TryUpdateSourceObject(value);
            }
        }
        ClearValue(propd: DependencyProperty) {
            if (!propd)
                throw new ArgumentException("No dependency property.");
            if (propd.IsReadOnly && !propd.IsCustom)
                throw new ArgumentException("This property is readonly.");
            this._RemoveExpression(propd);
            this._Store.ClearValue(propd, true);
        }
        ReadLocalValue(propd: DependencyProperty): any {
            if (!propd)
                throw new ArgumentException("No property specified.");
            var expr = this._Expressions[propd._ID]
            if (expr)
                return expr;
            return this._Store.ReadLocalValue(propd);
        }
        _OnPropertyChanged(args: IDependencyPropertyChangedEventArgs) { }
        private _AddExpression(propd: DependencyProperty, expr: Expression) {
            this._Expressions[propd._ID] = expr;
            expr.OnAttached(this);
        }
        private _RemoveExpression(propd: DependencyProperty) {
            var expr = this._Expressions[propd._ID];
            if (expr) {
                this._Expressions[propd._ID] = undefined;
                expr.OnDetached(this);
            }
        }
        GetBindingExpression(propd: DependencyProperty): Data.BindingExpressionBase {
            var expr = this._Expressions[propd._ID];
            if (expr instanceof Data.BindingExpressionBase)
                return <Data.BindingExpressionBase>expr;
        }
        SetBinding(propd: DependencyProperty, binding: Data.Binding): Data.BindingExpressionBase {
            if (!propd)
                throw new ArgumentException("propd");
            if (!binding)
                throw new ArgumentException("binding");
            var e = new Data.BindingExpression(binding, this, propd);
            this.SetValueInternal(propd, e);
            return e;
        }
        CloneCore(source: DependencyObject) {
            this._Store.CloneCore(source._Store);
        }
    }
    Nullstone.RegisterType(DependencyObject, "DependencyObject");
}

module Fayde {
    export class FrameworkTemplate extends XamlObject {
        GetVisualTree(bindingSource: DependencyObject): XamlObject {
            var error = new BError();
            var vt = this._GetVisualTreeWithError(bindingSource, error);
            if (error.Message)
                error.ThrowException();
            return vt;
        }
        _GetVisualTreeWithError(templateBindingSource: DependencyObject, error: BError): XamlObject {
            error.Message = "Abstract Method";
            return undefined;
        }
    }
    Nullstone.RegisterType(FrameworkTemplate, "FrameworkTemplate");
}

module Fayde {
    export class ResourceTarget extends XamlObject {
        private _Json: any;
        private _Namescope: NameScope;
        private _TemplateBindingSource: DependencyObject;
        private _ResChain: ResourceDictionary[];
        constructor(json: any, namescope: NameScope, templateBindingSource: DependencyObject, resChain: ResourceDictionary[]) {
            super();
            this._Json = json;
            this._Namescope = namescope;
            this._TemplateBindingSource = templateBindingSource;
            this._ResChain = resChain;
        }
        CreateResource(): XamlObject {
            return JsonParser.Parse(this._Json, this._TemplateBindingSource, this._Namescope, this._ResChain);
        }
    }
    Nullstone.RegisterType(ResourceTarget, "ResourceTarget");
}

module Fayde {
    export class RoutedEvent extends MulticastEvent {
    }
    Nullstone.RegisterType(RoutedEvent, "RoutedEvent");
}

module Fayde {
    export class RoutedEventArgs extends EventArgs {
        Handled: bool = false;
        Source: any = null;
    }
    Nullstone.RegisterType(RoutedEventArgs, "RoutedEventArgs");
}

module Fayde {
    export class SizeChangedEventArgs extends RoutedEventArgs {
        PreviousSize: size;
        NewSize: size;
        constructor(previousSize: size, newSize: size) {
            super();
            Object.defineProperty(this, "PreviousSize", {
                get: function () { return size.clone(previousSize); }
            });
            Object.defineProperty(this, "NewSize", {
                get: function () { return size.clone(newSize); }
            });
        }
    }
    Nullstone.RegisterType(SizeChangedEventArgs, "SizeChangedEventArgs");
}

module Fayde {
    export class Style extends DependencyObject {
        private _IsSealed: bool = false;
        static BasedOnProperty: DependencyProperty = DependencyProperty.Register("BasedOn", () => Function, Style);
        static TargetTypeProperty: DependencyProperty = DependencyProperty.Register("TargetType", () => Function, Style);
        Setters: SetterCollection;
        BasedOn: Style;
        TargetType: Function;
        constructor() {
            super();
            var coll = new SetterCollection();
            coll.XamlNode.AttachTo(this.XamlNode, undefined);
            Object.defineProperty(this, "Setters", {
                value: coll,
                writable: false
            });
        }
        Seal() {
            if (this._IsSealed)
                return;
            this.Setters._Seal(this.TargetType);
            this._IsSealed = true;
            var base = this.BasedOn;
            if (base)
                base.Seal();
        }
        Validate(instance: DependencyObject, error: BError): bool {
            var parentType = <Function>(<any>instance).constructor;
            if (this._IsSealed) {
                if (!(instance instanceof this.TargetType)) {
                    error.Number = BError.XamlParse;
                    error.Message = "Style.TargetType (" + (<any>this.TargetType)._TypeName + ") is not a subclass of (" + (<any>parentType)._TypeName + ")";
                    return false;
                }
                return true;
            }
            var cycles = [];
            var root = this;
            while (root) {
                if (cycles.indexOf(root) > -1) {
                    error.Number = BError.InvalidOperation;
                    error.Message = "Circular reference in Style.BasedOn";
                    return false;
                }
                cycles.push(root);
                root = root.BasedOn;
            }
            cycles = null;
            root = this;
            var targetType: Function;
            while (root) {
                targetType = root.TargetType;
                if (root === this) {
                    if (!targetType) {
                        error.Number = BError.InvalidOperation;
                        error.Message = "TargetType cannot be null";
                        return false;
                    } else if (!Nullstone.DoesInheritFrom(parentType, targetType)) {
                        error.Number = BError.XamlParse; 
                        error.Message = "Style.TargetType (" + (<any>targetType)._TypeName + ") is not a subclass of (" + (<any>parentType)._TypeName + ")";
                        return false;
                    }
                } else if (!targetType || !Nullstone.DoesInheritFrom(parentType, targetType)) {
                    error.Number = BError.InvalidOperation;
                    error.Message = "Style.TargetType (" + (targetType ? (<any>targetType)._TypeName : "<Not Specified>") + ") is not a subclass of (" + (<any>parentType)._TypeName + ")";
                    return false;
                }
                parentType = targetType;
                root = root.BasedOn;
            }
            this.Seal();
            return true;
        }
    }
    Nullstone.RegisterType(Style, "Style");
}

module Fayde {
    export class XamlObjectCollection extends XamlObject implements IEnumerable {
        private _ht: XamlObject[] = [];
        get Count() { return this._ht.length; }
        GetValueAt(index: number): XamlObject {
            return this._ht[index];
        }
        SetValueAt(index: number, value: XamlObject): bool {
            if (!this.CanAdd(value))
                return false;
            if (index < 0 || index >= this._ht.length)
                return false;
            var removed = this._ht[index];
            var added = value;
            var error = new BError();
            if (this.AddedToCollection(added, error)) {
                this._ht[index] = added;
                this.RemovedFromCollection(removed, true);
                this._RaiseItemReplaced(removed, added, index);
                return true;
            }
            return false;
        }
        Add(value: XamlObject): number {
            var rv = this.Insert(this._ht.length, value);
            return rv ? this._ht.length - 1 : -1;
        }
        Insert(index: number, value: XamlObject): bool {
            if (!this.CanAdd(value))
                return false;
            if (index < 0)
                return false;
            var count = this._ht.length;
            if (index > count)
                index = count;
            var error = new BError();
            if (this.AddedToCollection(value, error)) {
                this._ht.splice(index, 0, value);
                this._RaiseItemAdded(value, index);
                return true;
            }
            if (error.Message)
                throw new Exception(error.Message);
            return false;
        }
        Remove(value: XamlObject): bool {
            var index = this.IndexOf(value);
            if (index === -1)
                return false;
            return this.RemoveAt(index);
        }
        RemoveAt(index: number): bool {
            if (index < 0 || index >= this._ht.length)
                return false;
            var value = this._ht[index];
            this._ht.splice(index, 1);
            this.RemovedFromCollection(value, true);
            this._RaiseItemRemoved(value, index);
            return true;
        }
        Clear(): bool {
            var old = this._ht;
            this._ht = [];
            var len = old.length;
            for (var i = 0; i < len; i++) {
                this.RemovedFromCollection(old[i], true);
            }
            this._RaiseCleared();
            return true;
        }
        IndexOf(value: XamlObject): number {
            var count = this._ht.length;
            for (var i = 0; i < count; i++) {
                if (Nullstone.Equals(value, this._ht[i]))
                    return i;
            }
            return -1;
        }
        Contains(value: XamlObject): bool { return this.IndexOf(value) > -1; }
        CanAdd (value: XamlObject): bool { return true; }
        AddedToCollection(value: XamlObject, error: BError): bool {
            return value.XamlNode.AttachTo(this.XamlNode, error);
        }
        RemovedFromCollection(value: XamlObject, isValueSafe: bool) {
            value.XamlNode.Detach();
        }
        GetEnumerator(reverse?: bool): IEnumerator {
            return ArrayEx.GetEnumerator(this._ht, reverse);
        }
        _RaiseItemAdded(value: XamlObject, index: number) { }
        _RaiseItemRemoved(value: XamlObject, index: number) { }
        _RaiseItemReplaced(removed: XamlObject, added: XamlObject, index: number) { }
        _RaiseCleared() { }
        CloneCore(source: XamlObjectCollection) {
            var enumerator = ArrayEx.GetEnumerator(this._ht);
            while (enumerator.MoveNext()) {
                this.Add(Fayde.Clone(enumerator.Current));
            }
        }
    }
    Nullstone.RegisterType(XamlObjectCollection, "XamlObjectCollection");
}

module Fayde.Providers {
    export interface ILocalStylesProvider extends IPropertyProvider {
        UpdateStyle(style: Style, error: BError);
    }
    export interface IImplicitStylesProvider extends IPropertyProvider {
        SetStyles(styleMask: _StyleMask, styles: Style[], error: BError);
        ClearStyles(styleMask: _StyleMask, error: BError);
    }
    export class FrameworkProviderStore extends InheritedProviderStore {
        constructor(dobj: DependencyObject) {
            super(dobj);
        }
        SetProviders(providerArr: Providers.IPropertyProvider[]) {
            this._LocalValueProvider = this._Providers[1] = <LocalValueProvider>providerArr[1];
            this._DynamicValueProvider = this._Providers[2] = providerArr[2];
            this._LocalStyleProvider = this._Providers[3] = <ILocalStylesProvider>providerArr[3];
            this._ImplicitStyleProvider = this._Providers[4] = <IImplicitStylesProvider>providerArr[4];
            this._InheritedProvider = this._Providers[5] = <IInheritedProvider>providerArr[5];
            this._InheritedDataContextProvider = this._Providers[6] = <IInheritedDataContextProvider>providerArr[6];
            this._DefaultValueProvider = this._Providers[7] = <DefaultValueProvider>providerArr[7];
            this._AutoCreateProvider = this._Providers[8] = <AutoCreateProvider>providerArr[8];
        }
        private _Providers: IPropertyProvider[];
        private _LocalValueProvider: LocalValueProvider;
        private _DynamicValueProvider: IPropertyProvider;
        private _LocalStyleProvider: ILocalStylesProvider;
        private _ImplicitStyleProvider: IImplicitStylesProvider;
        private _InheritedProvider: IInheritedProvider;
        private _InheritedDataContextProvider: IInheritedDataContextProvider;
        private _DefaultValueProvider: DefaultValueProvider;
        private _AutoCreateProvider: AutoCreateProvider;
        SetImplicitStyles(styleMask: _StyleMask, styles?: Style[]) {
            if (!styles)
                styles = this._GetImplicitStyles(styleMask);
            if (styles) {
                var error = new BError();
                var len = Providers._StyleIndex.Count;
                for (var i = 0; i < len; i++) {
                    var style = styles[i];
                    if (!style)
                        continue;
                    if (!style.Validate(this._Object, error)) {
                        error.ThrowException();
                        return;
                    }
                }
            }
            this._ImplicitStyleProvider.SetStyles(styleMask, styles, error);
        }
        private _GetImplicitStyles(styleMask: _StyleMask): Style[] {
            var fe = <FrameworkElement>this._Object;
            var feType = (<any>fe).constructor;
            var feTypeName = (<any>fe)._TypeName;
            var genericXamlStyle: Style = undefined;
            if ((styleMask & _StyleMask.GenericXaml) != 0) {
                if (fe instanceof Controls.Control) {
                    genericXamlStyle = (<Controls.Control>fe).GetDefaultStyle();
                    if (!genericXamlStyle) {
                        var styleKey = fe.DefaultStyleKey;
                        if (styleKey)
                            genericXamlStyle = this._GetGenericXamlStyleFor(styleKey);
                    }
                }
            }
            var appResourcesStyle: Style = undefined;
            var rd = App.Instance.Resources;
            if ((styleMask & _StyleMask.ApplicationResources) != 0) {
                appResourcesStyle = <Style>rd.Get(feType);
                if (!appResourcesStyle)
                    appResourcesStyle = <Style>rd.Get(feTypeName);
            }
            var visualTreeStyle: Style = undefined;
            if ((styleMask & _StyleMask.VisualTree) != 0) {
                var cur = fe;
                var curNode = fe.XamlNode;
                var isControl = curNode instanceof Controls.ControlNode;
                while (curNode) {
                    cur = curNode.XObject;
                    if (cur.TemplateOwner && !fe.TemplateOwner) {
                        cur = <FrameworkElement>cur.TemplateOwner;
                        curNode = cur.XamlNode;
                        continue;
                    }
                    if (!isControl && cur === fe.TemplateOwner)
                        break;
                    rd = cur.Resources;
                    if (rd) {
                        visualTreeStyle = <Style>rd.Get(feType);
                        if (!visualTreeStyle)
                            visualTreeStyle = <Style>rd.Get(feTypeName);
                        if (visualTreeStyle)
                            break;
                    }
                    curNode = <FENode>curNode.VisualParentNode;
                }
            }
            var styles = [];
            styles[_StyleIndex.GenericXaml] = genericXamlStyle;
            styles[_StyleIndex.ApplicationResources] = appResourcesStyle;
            styles[_StyleIndex.VisualTree] = visualTreeStyle;
            return styles;
        }
        private _GetGenericXamlStyleFor(type: any): Style {
            var rd = App.GetGenericResourceDictionary();
            if (rd)
                return <Style>rd.Get(type);
        }
        ClearImplicitStyles(styleMask: _StyleMask) {
            var error = new BError();
            this._ImplicitStyleProvider.ClearStyles(styleMask, error);
        }
        SetLocalStyle(style: Style, error: BError) {
            this._LocalStyleProvider.UpdateStyle(style, error);
        }
    }
    Nullstone.RegisterType(FrameworkProviderStore, "FrameworkProviderStore");
}

module Fayde.Data {
    export interface IValueConverter {
        Convert(value: any, targetType: Function, parameter: any, culture: any): any;
        ConvertBack(value: any, targetType: Function, parameter: any, culture: any): any;
    }
    export class Binding extends BindingBase {
        private _BindsDirectlyToSource: bool = false;
        private _Converter: IValueConverter;
        private _ConverterParameter: any;
        private _ConverterCulture: any;
        private _ElementName: string;
        private _Mode: BindingMode = BindingMode.OneWay;
        private _NotifyOnValidationError: bool = false;
        private _RelativeSource: RelativeSource;
        private _Path: Data.PropertyPath;
        private _Source: any;
        private _UpdateSourceTrigger: UpdateSourceTrigger = UpdateSourceTrigger.Default;
        private _ValidatesOnExceptions: bool = false;
        private _ValidatesOnDataErrors: bool = false;
        private _ValidatesOnNotifyDataErrors: bool = true;
        constructor(path: string) {
            super();
            if (!path) path = "";
            this._Path = new PropertyPath(path);
        }
        get BindsDirectlyToSource(): bool { return this._BindsDirectlyToSource; }
        set BindsDirectlyToSource(value: bool) {
            this.CheckSealed();
            this._BindsDirectlyToSource = value;
        }
        get Converter(): IValueConverter { return this._Converter; }
        set Converter(value: IValueConverter) {
            this.CheckSealed();
            this._Converter = value;
        }
        get ConverterParameter(): any { return this._ConverterParameter; }
        set ConverterParameter(value: any) {
            this.CheckSealed();
            this._ConverterParameter = value;
        }
        get ConverterCulture(): any { return this._ConverterCulture; }
        set ConverterCulture(value: any) {
            this.CheckSealed();
            this._ConverterCulture = value;
        }
        get ElementName(): string { return this._ElementName; }
        set ElementName(value: string) {
            this.CheckSealed();
            this._ElementName = value;
        }
        get Mode(): BindingMode { return this._Mode; }
        set Mode(value: BindingMode) {
            this.CheckSealed();
            this._Mode = value;
        }
        get NotifyOnValidationError(): bool { return this._NotifyOnValidationError; }
        set NotifyOnValidationError(value: bool) {
            this.CheckSealed();
            this._NotifyOnValidationError = value;
        }
        get RelativeSource(): RelativeSource { return this._RelativeSource; }
        set RelativeSource(value: RelativeSource) {
            this.CheckSealed();
            this._RelativeSource = value;
        }
        get Path(): PropertyPath { return this._Path; }
        set Path(value: PropertyPath) {
            this.CheckSealed();
            this._Path = value;
        }
        get Source(): any { return this._Source; }
        set Source(value: any) {
            this.CheckSealed();
            this._Source = value;
        }
        get UpdateSourceTrigger(): UpdateSourceTrigger { return this._UpdateSourceTrigger; }
        set UpdateSourceTrigger(value: UpdateSourceTrigger) {
            this.CheckSealed();
            this._UpdateSourceTrigger = value;
        }
        get ValidatesOnExceptions(): bool { return this._ValidatesOnExceptions; }
        set ValidatesOnExceptions(value: bool) {
            this.CheckSealed();
            this._ValidatesOnExceptions = value;
        }
        get ValidatesOnDataErrors(): bool { return this._ValidatesOnDataErrors; }
        set ValidatesOnDataErrors(value: bool) {
            this.CheckSealed();
            this._ValidatesOnDataErrors = value;
        }
        get ValidatesOnNotifyDataErrors(): bool { return this._ValidatesOnNotifyDataErrors; }
        set ValidatesOnNotifyDataErrors(value: bool) {
            this.CheckSealed();
            this._ValidatesOnNotifyDataErrors = value;
        }
    }
    Nullstone.RegisterType(Binding, "Binding");
}

module Fayde.Data {
    export class BindingExpression extends BindingExpressionBase {
        constructor(binding: Data.Binding, target: DependencyObject, propd: DependencyProperty) {
            super(binding, target, propd);
        }
        get ParentBinding(): Binding { return this.Binding; }
        get DataItem(): any { return this.DataSource; }
        UpdateSource() {
            return this._UpdateSourceObject(undefined, true);
        }
    }
    Nullstone.RegisterType(BindingExpression, "BindingExpression");
}

module Fayde.Data {
    export class CollectionViewSource extends DependencyObject {
        static SourceProperty: DependencyProperty = DependencyProperty.Register("Source", () => Object, CollectionViewSource);
        static ViewProperty: DependencyProperty = DependencyProperty.Register("View", () => ICollectionView_, CollectionViewSource);
        Source: any;
        View: ICollectionView;
    }
}

module Fayde.Documents {
    export class TextElementNode extends DONode {
        XObject: TextElement;
        constructor(xobj: TextElement, inheritedWalkProperty: DependencyProperty) {
            super(xobj);
            this.InheritedWalkProperty = inheritedWalkProperty;
        }
        InheritedWalkProperty: DependencyProperty;
        GetInheritedEnumerator(): IEnumerator {
            if (!this.InheritedWalkProperty)
                return ArrayEx.EmptyEnumerator;
            var coll = this.XObject.GetValue(this.InheritedWalkProperty);
            if (coll)
                return (<XamlObjectCollection>coll).GetEnumerator();
        }
    }
    Nullstone.RegisterType(TextElementNode, "TextElementNode");
    export class TextElement extends DependencyObject implements Text.ITextAttributesSource {
        _Store: Providers.InheritedProviderStore;
        CreateStore(): Providers.BasicProviderStore {
            var s = new Providers.InheritedProviderStore(this);
            s.SetProviders([null,
                new Providers.LocalValueProvider(),
                null,
                null,
                null,
                new Providers.InheritedProvider(),
                new Providers.InheritedDataContextProvider(s),
                new Providers.DefaultValueProvider(),
                new Providers.AutoCreateProvider()]
            );
            return s;
        }
        XamlNode: TextElementNode;
        CreateNode(): TextElementNode {
            return new TextElementNode(this, null);
        }
        static ForegroundProperty: DependencyProperty = DependencyProperty.RegisterInheritable("Foreground", () => Media.Brush, TextElement, undefined, (d, args) => (<TextElement>d)._UpdateFont(false), undefined, Providers._Inheritable.Foreground);
        static FontFamilyProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontFamily", () => String, TextElement, Font.DEFAULT_FAMILY, (d, args) => (<TextElement>d)._UpdateFont(false), undefined, Providers._Inheritable.FontFamily);
        static FontStretchProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontStretch", () => String, TextElement, Font.DEFAULT_STRETCH, (d, args) => (<TextElement>d)._UpdateFont(false), undefined, Providers._Inheritable.FontStretch);
        static FontStyleProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontStyle", () => String, TextElement, Font.DEFAULT_STYLE, (d, args) => (<TextElement>d)._UpdateFont(false), undefined, Providers._Inheritable.FontStyle);
        static FontWeightProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontWeight", () => new Enum(FontWeight), TextElement, Font.DEFAULT_WEIGHT, (d, args) => (<TextElement>d)._UpdateFont(false), undefined, Providers._Inheritable.FontWeight);
        static FontSizeProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontSize", () => Number, TextElement, Font.DEFAULT_SIZE, (d, args) => (<TextElement>d)._UpdateFont(false), undefined, Providers._Inheritable.FontSize);
        static LanguageProperty: DependencyProperty = DependencyProperty.RegisterInheritable("Language", () => String, TextElement, undefined, (d, args) => (<TextElement>d)._UpdateFont(false), undefined, Providers._Inheritable.Language);
        static TextDecorationsProperty: DependencyProperty = DependencyProperty.RegisterInheritable("TextDecorations", () => new Enum(TextDecorations), TextElement, TextDecorations.None, (d, args) => (<TextElement>d)._UpdateFont(false), undefined, Providers._Inheritable.TextDecorations);
        Foreground: Media.Brush;
        FontFamily: string;
        FontStretch: string;
        FontStyle: string;
        FontWeight: FontWeight;
        FontSize: number;
        Language: string;
        TextDecorations: TextDecorations;
        private _Font: Font = new Font();
        constructor() {
            super();
            this._UpdateFont(true);
        }
        _SerializeText(): string { return undefined; };
        private _UpdateFont(force?: bool) {
            var f = this._Font;
            f.Family = this.FontFamily;
            f.Stretch = this.FontStretch;
            f.Style = this.FontStyle;
            f.Weight = this.FontWeight;
            f.Size = this.FontSize;
            return f.IsChanged || force;
        }
        get Background(): Media.Brush { return null; }
        get SelectionBackground(): Media.Brush { return null; }
        get SelectionForeground(): Media.Brush { return this.Foreground; }
        get Font(): Font { return this._Font; }
        get Direction(): FlowDirection { return FlowDirection.LeftToRight; }
        get IsUnderlined(): bool { return (this.TextDecorations & TextDecorations.Underline) > 0; }
        Start: number;
        Equals(te: TextElement): bool {
            if (this.FontFamily !== te.FontFamily)
                return false;
            if (this.FontSize !== te.FontSize)
                return false;
            if (this.FontStyle !== te.FontStyle)
                return false;
            if (this.FontWeight !== te.FontWeight)
                return false;
            if (this.FontStretch !== te.FontStretch)
                return false;
            if (this.TextDecorations !== te.TextDecorations)
                return false;
            if (!Nullstone.Equals(this.Foreground, te.Foreground))
                return false;
            return true;
        }
    }
    Nullstone.RegisterType(TextElement, "TextElement");
}

module Fayde.Input {
    export enum Key {
        None = 0,
        Back = 1,
        Tab = 2,
        Enter = 3,
        Shift = 4,
        Ctrl = 5,
        Alt = 6,
        CapsLock = 7,
        Escape = 8,
        Space = 9,
        PageUp = 10,
        PageDown = 11,
        End = 12,
        Home = 13,
        Left = 14,
        Up = 15,
        Right = 16,
        Down = 17,
        Insert = 18,
        Delete = 19,
        D0 = 20,
        D1 = 21,
        D2 = 22,
        D3 = 23,
        D4 = 24,
        D5 = 25,
        D6 = 26,
        D7 = 27,
        D8 = 28,
        D9 = 29,
        A = 30,
        B = 31,
        C = 32,
        D = 33,
        E = 34,
        F = 35,
        G = 36,
        H = 37,
        I = 38,
        J = 39,
        K = 40,
        L = 41,
        M = 42,
        N = 43,
        O = 44,
        P = 45,
        Q = 46,
        R = 47,
        S = 48,
        T = 49,
        U = 50,
        V = 51,
        W = 52,
        X = 53,
        Y = 54,
        Z = 55,
        F1 = 56,
        F2 = 57,
        F3 = 58,
        F4 = 59,
        F5 = 60,
        F6 = 61,
        F7 = 62,
        F8 = 63,
        F9 = 64,
        F10 = 65,
        F11 = 66,
        F12 = 67,
        NumPad0 = 68,
        NumPad1 = 69,
        NumPad2 = 70,
        NumPad3 = 71,
        NumPad4 = 72,
        NumPad5 = 73,
        NumPad6 = 74,
        NumPad7 = 75,
        NumPad8 = 76,
        NumPad9 = 77,
        Multiply = 78,
        Add = 79,
        Subtract = 80,
        Decimal = 81,
        Divide = 82,
        Unknown = 255,
    }
    export class KeyboardEventArgs extends RoutedEventArgs {
    }
    Nullstone.RegisterType(KeyboardEventArgs, "KeyboardEventArgs");
    export class KeyEventArgs extends KeyboardEventArgs {
        Modifiers: any;
        PlatformKeyCode: number;
        Key: Key;
        Char: string;
        constructor(modifiers: any, keyCode: number, key: Key, char?: string) {
            super();
            this.Modifiers = modifiers;
            this.PlatformKeyCode = keyCode;
            this.Key = key;
            if (this.Key == null)
                this.Key = Key.Unknown;
            this.Char = char;
        }
    }
    Nullstone.RegisterType(KeyEventArgs, "KeyEventArgs");
}

module Fayde.Input {
    var keyFromKeyCode: Key[] = [];
    keyFromKeyCode[8] = Key.Back;
    keyFromKeyCode[9] = Key.Tab;
    keyFromKeyCode[13] = Key.Enter;
    keyFromKeyCode[16] = Key.Shift;
    keyFromKeyCode[17] = Key.Ctrl;
    keyFromKeyCode[18] = Key.Alt;
    keyFromKeyCode[20] = Key.CapsLock;
    keyFromKeyCode[27] = Key.Escape;
    keyFromKeyCode[32] = Key.Space;
    keyFromKeyCode[33] = Key.PageUp;
    keyFromKeyCode[34] = Key.PageDown;
    keyFromKeyCode[35] = Key.End;
    keyFromKeyCode[36] = Key.Home;
    keyFromKeyCode[37] = Key.Left;
    keyFromKeyCode[38] = Key.Up;
    keyFromKeyCode[39] = Key.Right;
    keyFromKeyCode[40] = Key.Down;
    keyFromKeyCode[45] = Key.Insert;
    keyFromKeyCode[46] = Key.Delete;
    keyFromKeyCode[48] = Key.D0;
    keyFromKeyCode[49] = Key.D1;
    keyFromKeyCode[50] = Key.D2;
    keyFromKeyCode[51] = Key.D3;
    keyFromKeyCode[52] = Key.D4;
    keyFromKeyCode[53] = Key.D5;
    keyFromKeyCode[54] = Key.D6;
    keyFromKeyCode[55] = Key.D7;
    keyFromKeyCode[56] = Key.D8;
    keyFromKeyCode[57] = Key.D9;
    keyFromKeyCode[65] = Key.A;
    keyFromKeyCode[66] = Key.B;
    keyFromKeyCode[67] = Key.C;
    keyFromKeyCode[68] = Key.D;
    keyFromKeyCode[69] = Key.E;
    keyFromKeyCode[70] = Key.F;
    keyFromKeyCode[71] = Key.G;
    keyFromKeyCode[72] = Key.H;
    keyFromKeyCode[73] = Key.I;
    keyFromKeyCode[74] = Key.J;
    keyFromKeyCode[75] = Key.K;
    keyFromKeyCode[76] = Key.L;
    keyFromKeyCode[77] = Key.M;
    keyFromKeyCode[78] = Key.N;
    keyFromKeyCode[79] = Key.O;
    keyFromKeyCode[80] = Key.P;
    keyFromKeyCode[81] = Key.Q;
    keyFromKeyCode[82] = Key.R;
    keyFromKeyCode[83] = Key.S;
    keyFromKeyCode[84] = Key.T;
    keyFromKeyCode[85] = Key.U;
    keyFromKeyCode[86] = Key.V;
    keyFromKeyCode[87] = Key.W;
    keyFromKeyCode[88] = Key.X;
    keyFromKeyCode[89] = Key.Y;
    keyFromKeyCode[90] = Key.Z;
    keyFromKeyCode[96] = Key.NumPad0;
    keyFromKeyCode[97] = Key.NumPad1;
    keyFromKeyCode[98] = Key.NumPad2;
    keyFromKeyCode[99] = Key.NumPad3;
    keyFromKeyCode[100] = Key.NumPad4;
    keyFromKeyCode[101] = Key.NumPad5;
    keyFromKeyCode[102] = Key.NumPad6;
    keyFromKeyCode[103] = Key.NumPad7;
    keyFromKeyCode[104] = Key.NumPad8;
    keyFromKeyCode[105] = Key.NumPad9;
    keyFromKeyCode[106] = Key.Multiply;
    keyFromKeyCode[107] = Key.Add;
    keyFromKeyCode[109] = Key.Subtract;
    keyFromKeyCode[110] = Key.Decimal;
    keyFromKeyCode[111] = Key.Divide;
    keyFromKeyCode[112] = Key.F1;
    keyFromKeyCode[113] = Key.F2;
    keyFromKeyCode[114] = Key.F3;
    keyFromKeyCode[115] = Key.F4;
    keyFromKeyCode[116] = Key.F5;
    keyFromKeyCode[117] = Key.F6;
    keyFromKeyCode[118] = Key.F7;
    keyFromKeyCode[119] = Key.F8;
    keyFromKeyCode[120] = Key.F9;
    keyFromKeyCode[121] = Key.F10;
    keyFromKeyCode[122] = Key.F11;
    keyFromKeyCode[123] = Key.F12;
    export class KeyInterop {
        constructor(public Surface: Surface) { }
        RegisterEvents() {
            document.onkeypress = (e) => {
                var args = this.CreateArgsPress(e);
                if (args) {
                    if (this.Surface._HandleKeyDown(args)) {
                        return false;
                    }
                }
            };
            document.onkeydown = (e) => {
                var args = this.CreateArgsDown(e);
                if (args) {
                    if (this.Surface._HandleKeyDown(args)) {
                        return false;
                    }
                }
            };
        }
        CreateArgsPress(e): Fayde.Input.KeyEventArgs { return undefined; }
        CreateArgsDown(e): Fayde.Input.KeyEventArgs { return undefined; }
        static CreateInterop(surface: Surface): KeyInterop {
            if (navigator.appName === "Microsoft Internet Explorer")
                return new IEKeyInterop(surface);
            else if (navigator.appName === "Netscape")
                return new NetscapeKeyInterop(surface);
            return new KeyInterop(surface);
        }
    }
    Nullstone.RegisterType(KeyInterop, "KeyInterop");
    var udkie = [];
    udkie[41] = 48;
    udkie[33] = 49;
    udkie[64] = 50;
    udkie[35] = 51;
    udkie[36] = 52;
    udkie[37] = 53;
    udkie[94] = 54;
    udkie[38] = 55;
    udkie[42] = 56;
    udkie[34] = Key.Unknown;
    export class IEKeyInterop extends KeyInterop {
        constructor(surface: Surface) {
            super(surface);
        }
        CreateArgsPress(e): Fayde.Input.KeyEventArgs {
            if (e.char == null)
                return;
            var modifiers = {
                Shift: e.shiftKey,
                Ctrl: e.ctrlKey,
                Alt: e.altKey
            };
            var keyCode = e.keyCode;
            var unshifted = udkie[keyCode];
            if (unshifted)
                keyCode = unshifted;
            return new Fayde.Input.KeyEventArgs(modifiers, keyCode, keyFromKeyCode[keyCode], e.char);
        }
        CreateArgsDown(e): Fayde.Input.KeyEventArgs {
            if (e.char != null && e.keyCode !== 8)
                return;
            var modifiers = {
                Shift: e.shiftKey,
                Ctrl: e.ctrlKey,
                Alt: e.altKey
            };
            return new Fayde.Input.KeyEventArgs(modifiers, e.keyCode, keyFromKeyCode[e.keyCode]);
        }
    }
    Nullstone.RegisterType(IEKeyInterop, "IEKeyInterop");
    var sknet = [];
    sknet[8] = Key.Back;
    sknet[9] = Key.Tab;
    sknet[20] = Key.CapsLock;
    sknet[27] = Key.Escape;
    sknet[33] = Key.PageUp;
    sknet[34] = Key.PageDown;
    sknet[35] = Key.End;
    sknet[36] = Key.Home;
    sknet[37] = Key.Left;
    sknet[38] = Key.Up;
    sknet[39] = Key.Right;
    sknet[40] = Key.Down;
    sknet[45] = Key.Insert;
    sknet[46] = Key.Delete;
    var udknet = [];
    udknet[41] = 48;
    udknet[33] = 49;
    udknet[64] = 50;
    udknet[35] = 51;
    udknet[36] = 52;
    udknet[37] = 53;
    udknet[94] = 54;
    udknet[38] = 55;
    udknet[42] = 56;
    udknet[34] = Key.Unknown;
    export class NetscapeKeyInterop extends KeyInterop {
        constructor(surface: Surface) {
            super(surface);
        }
        CreateArgsPress(e): Fayde.Input.KeyEventArgs {
            var modifiers = {
                Shift: e.shiftKey,
                Ctrl: e.ctrlKey,
                Alt: e.altKey
            };
            var keyCode = e.keyCode;
            var unshifted = udknet[keyCode];
            if (unshifted)
                keyCode = unshifted;
            return new Fayde.Input.KeyEventArgs(modifiers, keyCode, keyFromKeyCode[keyCode], String.fromCharCode(e.which || e.keyCode));
        }
        CreateArgsDown(e): Fayde.Input.KeyEventArgs {
            if (sknet[e.keyCode] === undefined)
                return null;
            var modifiers = {
                Shift: e.shiftKey,
                Ctrl: e.ctrlKey,
                Alt: e.altKey
            };
            return new Fayde.Input.KeyEventArgs(modifiers, e.keyCode, keyFromKeyCode[e.keyCode]);
        }
    }
    Nullstone.RegisterType(NetscapeKeyInterop, "NetscapeKeyInterop");
}

module Fayde.Input {
    export class MouseEventArgs extends RoutedEventArgs {
        private _AbsolutePos: Point;
        constructor(absolutePos: Point) {
            super();
            this._AbsolutePos = absolutePos;
        }
        GetPosition(relativeTo: UIElement): Point {
            return new Point();
        }
    }
    Nullstone.RegisterType(MouseEventArgs, "MouseEventArgs");
    export class MouseButtonEventArgs extends MouseEventArgs {
        constructor(absolutePos: Point) {
            super(absolutePos);
        }
    }
    Nullstone.RegisterType(MouseButtonEventArgs, "MouseButtonEventArgs");
    export class MouseWheelEventArgs extends MouseEventArgs {
        Delta: number;
        constructor(absolutePos: Point, delta: number) {
            super(absolutePos);
            this.Delta = delta;
        }
    }
    Nullstone.RegisterType(MouseWheelEventArgs, "MouseWheelEventArgs");
}

module Fayde {
    export interface IBindingData {
        Path: string;
        FallbackValue: any;
        Mode: Data.BindingMode;
        StringFormat: string;
    }
    export class BindingMarkup extends Markup {
        private _Data: IBindingData;
        constructor(data: any) {
            super();
            if (!data) data = {};
            this._Data = data;
        }
        Transmute(target: XamlObject, propd: DependencyProperty, propName: string, templateBindingSource: DependencyObject) {
            return new Data.BindingExpression(this._BuildBinding(), <DependencyObject>target, propd);
        }
        private _BuildBinding(): Data.Binding {
            var b = new Fayde.Data.Binding(this._Data.Path);
            if (this._Data.FallbackValue !== undefined)
                b.FallbackValue = this._Data.FallbackValue;
            if (this._Data.Mode !== undefined)
                b.Mode = this._Data.Mode;
            if (this._Data.StringFormat !== undefined)
                b.StringFormat = this._Data.StringFormat;
            return b;
        }
    }
    Nullstone.RegisterType(BindingMarkup, "BindingMarkup");
}

module Fayde.Media {
    export class GeneralTransform extends DependencyObject {
        Inverse: GeneralTransform;
        Transform(p: Point): Point { return p; }
        TransformBounds(r: rect): rect { return r; }
        TryTransform(inPoint: Point, outPoint: Point): bool { return false; }
    }
    Nullstone.RegisterType(GeneralTransform, "GeneralTransform");
    export class InternalTransform extends GeneralTransform {
        private _Raw: number[];
        constructor(raw: number[]) {
            super();
            this._Raw = raw;
        }
        get Inverse(): InternalTransform {
            var it = new InternalTransform(mat4.create());
            mat4.inverse(this._Raw, it._Raw);
            return it;
        }
        get Value(): Matrix {
            var m = new Matrix();
            m._Raw = mat4.create(this._Raw);
            return m;
        }
        Transform(p: Point): Point {
            var pi = vec4.createFrom(p.X, p.Y, 0.0, 1.0);
            var po = vec4.create();
            mat4.transformVec4(this._Raw, pi, po);
            if (po[3] !== 0.0) {
                var w = 1.0 / po[3];
                return new Point(po[0] * w, p[1] * w);
            }
            return new Point(NaN, NaN);
        }
        TransformBounds(r: rect): rect {
            if (r)
                return rect.transform4(rect.clone(r), this._Raw);
            return undefined;
        }
    }
    Nullstone.RegisterType(InternalTransform, "InternalTransform");
}

module Fayde.Media {
    export interface IGeometryListener {
        GeometryChanged(newGeometry: Geometry);
    }
    export class Geometry extends DependencyObject {
        private _Path: Shapes.RawPath = null;
        private _LocalBounds: rect = new rect();
        private _Listener: IGeometryListener = null;
        static TransformProperty: DependencyProperty = DependencyProperty.Register("Transform", () => Transform, Geometry, undefined, (d, args) => (<Geometry>d)._TransformChanged(args));
        Transform: Transform;
        constructor() {
            super();
            this._LocalBounds.Width = Number.NEGATIVE_INFINITY;
            this._LocalBounds.Height = Number.NEGATIVE_INFINITY;
        }
        GetBounds(thickness?: number): rect {
            var compute = rect.isEmpty(this._LocalBounds);
            if (!this._Path) {
                this._Path = this._Build();
                compute = true;
            }
            if (compute)
                rect.copyTo(this.ComputePathBounds(thickness), this._LocalBounds);
            var bounds = rect.clone(this._LocalBounds);
            var transform = this.Transform
            if (transform != null)
                bounds = transform.TransformBounds(bounds);
            return bounds;
        }
        Draw(ctx: RenderContext) {
            if (!this._Path)
                return;
            var transform = this.Transform;
            if (transform != null) {
                ctx.Save();
                ctx.Transform(transform);
            }
            this._Path.DrawRenderCtx(ctx);
            if (transform != null)
                ctx.Restore();
        }
        ComputePathBounds(thickness: number): rect {
            if (!this._Path)
                this._Path = this._Build();
            if (!this._Path)
                return new rect();
            return this._Path.CalculateBounds(thickness);
        }
        _InvalidateGeometry() {
            this._Path = null;
            rect.set(this._LocalBounds, 0, 0, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
        }
        _Build(): Shapes.RawPath { return undefined; }
        Listen(listener: IGeometryListener) { this._Listener = listener; }
        Unlisten(listener: IGeometryListener) { if (this._Listener === listener) this._Listener = null; }
        private TransformChanged(source: Transform) {
            this._InvalidateGeometry();
            var listener = this._Listener;
            if (listener) listener.GeometryChanged(this);
        }
        private _TransformChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldt = <Transform>args.OldValue;
            var newt = <Transform>args.NewValue;
            if (oldt)
                oldt.Unlisten(this);
            if (newt)
                newt.Listen(this);
            this._InvalidateGeometry();
            var listener = this._Listener;
            if (listener) listener.GeometryChanged(this);
        }
        Serialize(): string {
            var path = this._Path;
            if (!path)
                return;
            return path.Serialize();
        }
    }
    Nullstone.RegisterType(Geometry, "Geometry");
    export class GeometryCollection extends XamlObjectCollection implements IGeometryListener {
        private _Listener: IGeometryListener;
        Listen(listener: IGeometryListener) { this._Listener = listener; }
        Unlisten(listener: IGeometryListener) { if (this._Listener === listener) this._Listener = null; }
        AddedToCollection(value: Geometry, error: BError): bool {
            if (!super.AddedToCollection(value, error))
                return false;
            value.Listen(this);
            var listener = this._Listener;
            if (listener) listener.GeometryChanged(value);
        }
        RemovedFromCollection(value: Geometry, isValueSafe: bool) {
            super.RemovedFromCollection(value, isValueSafe);
            value.Unlisten(this);
            var listener = this._Listener;
            if (listener) listener.GeometryChanged(value);
        }
        private GeometryChanged(newGeometry: Geometry) {
            var listener = this._Listener;
            if (listener) listener.GeometryChanged(newGeometry);
        }
    }
    Nullstone.RegisterType(GeometryCollection, "GeometryCollection");
}

module Fayde.Media {
    export class GeometryGroup extends Geometry implements IGeometryListener {
        static FillRulleProperty: DependencyProperty = DependencyProperty.Register("FillRule", () => new Enum(Shapes.FillRule), GeometryGroup, Shapes.FillRule.EvenOdd);
        FillRule: Shapes.FillRule;
        Children: GeometryCollection;
        constructor() {
            super();
            var coll = new GeometryCollection();
            coll.Listen(this);
            Object.defineProperty(this, "Children", {
                value: coll,
                writable: false
            });
        }
        ComputePathBounds(thickness: number): rect {
            var bounds = new rect();
            var enumerator = this.Children.GetEnumerator();
            while (enumerator.MoveNext()) {
                rect.unionLogical(bounds, (<Geometry>enumerator.Current).GetBounds(thickness));
            }
            return bounds;
        }
        Draw(ctx: RenderContext) {
            var transform = this.Transform;
            if (transform != null) {
                ctx.Save();
                ctx.Transform(transform);
            }
            var enumerator = this.Children.GetEnumerator();
            while (enumerator.MoveNext()) {
                (<Geometry>enumerator.Current).Draw(ctx);
            }
            if (transform != null)
                ctx.Restore();
        }
        private GeometryChanged(newGeometry: Geometry) { this._InvalidateGeometry(); }
    }
    Nullstone.RegisterType(GeometryGroup, "GeometryGroup");
}

module Fayde.Media {
    export interface IGradientStopListener {
        GradientStopChanged(newGradientStop: GradientStop);
    }
    export class GradientStop extends DependencyObject {
        private _Listener: IGradientStopListener;
        static ColorProperty: DependencyProperty = DependencyProperty.Register("Color", () => Color, GradientStop, undefined, (d, args) => (<GradientStop>d)._GradientStopChanged());
        static OffsetProperty: DependencyProperty = DependencyProperty.Register("Offset", () => Number, GradientStop, 0.0, (d, args) => (<GradientStop>d)._GradientStopChanged());
        Color: Color;
        Offset: number;
        Listen(listener: IGradientStopListener) { this._Listener = listener; }
        Unlisten(listener: IGradientStopListener) { if (this._Listener === listener) this._Listener = null; }
        private _GradientStopChanged() {
            var listener = this._Listener;
            if (listener) listener.GradientStopChanged(this);
        }
        toString(): string { return this.Color.toString() + " @ " + this.Offset.toString(); }
    }
    Nullstone.RegisterType(GradientStop, "GradientStop");
    export interface IGradientStopsListener {
        GradientStopsChanged(newGradientStops: GradientStopCollection);
    }
    export class GradientStopCollection extends XamlObjectCollection implements IGradientStopListener {
        private _Listener: IGradientStopsListener;
        Listen(listener: IGradientStopsListener) { this._Listener = listener; }
        Unlisten(listener: IGradientStopsListener) { if (this._Listener === listener) this._Listener = null; }
        private AddedToCollection(value: GradientStop, error: BError): bool {
            if (!super.AddedToCollection(value, error))
                return false;
            value.Listen(this);
            var listener = this._Listener;
            if (listener) listener.GradientStopsChanged(this);
        }
        private RemovedFromCollection(value: GradientStop, isValueSafe: bool) {
            if (!super.RemovedFromCollection(value, isValueSafe))
                return false;
            value.Unlisten(this);
            var listener = this._Listener;
            if (listener) listener.GradientStopsChanged(this);
        }
        private GradientStopChanged(newGradientStop: GradientStop) {
            var listener = this._Listener;
            if (listener) listener.GradientStopsChanged(this);
        }
    }
    Nullstone.RegisterType(GradientStopCollection, "GradientStopCollection");
}

module Fayde.Media {
    export class LineGeometry extends Geometry {
        static StartPointProperty: DependencyProperty = DependencyProperty.Register("StartPoint", () => Point, LineGeometry, undefined, (d, args) => (<Geometry>d)._InvalidateGeometry());
        static EndPointProperty: DependencyProperty = DependencyProperty.Register("EndPoint", () => Point, LineGeometry, undefined, (d, args) => (<Geometry>d)._InvalidateGeometry());
        StartPoint: Point;
        EndPoint: Point;
        private _Build(): Shapes.RawPath {
            var p1 = this.StartPoint;
            var p2 = this.EndPoint;
            var p = new Shapes.RawPath();
            p.Move(p1.X, p1.Y);
            p.Line(p2.X, p2.Y);
            return p;
        }
    }
    Nullstone.RegisterType(LineGeometry, "LineGeometry");
}

module Fayde.Media {
    export interface IPathFigureListener {
        PathFigureChanged(newPathFigure: PathFigure);
    }
    export class PathFigure extends DependencyObject implements IPathSegmentListener {
        static Annotations = { ContentProperty: "Segments" }
        static IsClosedProperty: DependencyProperty = DependencyProperty.RegisterCore("IsClosed", () => Boolean, PathFigure, false, (d, args) => (<PathFigure>d).InvalidatePathFigure());
        static StartPointProperty: DependencyProperty = DependencyProperty.RegisterCore("StartPoint", () => Point, PathFigure, undefined, (d, args) => (<PathFigure>d).InvalidatePathFigure());
        static IsFilledProperty: DependencyProperty = DependencyProperty.RegisterCore("IsFilled", () => Boolean, PathFigure, true, (d, args) => (<PathFigure>d).InvalidatePathFigure());
        IsClosed: bool;
        Segments: PathSegmentCollection;
        StartPoint: Point;
        IsFilled: bool;
        private _Path: Shapes.RawPath = null;
        private _Listener: IPathFigureListener;
        constructor() {
            super();
            var coll = new PathSegmentCollection();
            coll.Listen(this);
            Object.defineProperty(this, "Segments", {
                value: coll,
                writable: false
            });
        }
        private _Build(): Shapes.RawPath {
            var p = new Shapes.RawPath();
            var start = this.StartPoint;
            p.Move(start.X, start.Y);
            var enumerator = this.Segments.GetEnumerator();
            while (enumerator.MoveNext()) {
                (<PathSegment>enumerator.Current)._Append(p);
            }
            if (this.IsClosed)
                p.Close();
            return p;
        }
        private PathSegmentChanged(newPathSegment: PathSegment) {
            this._Path = null;
            var listener = this._Listener;
            if (listener) listener.PathFigureChanged(this);
        }
        private InvalidatePathFigure() {
            this._Path = null;
            var listener = this._Listener;
            if (listener) listener.PathFigureChanged(this);
        }
        Listen(listener: IPathFigureListener) { this._Listener = listener; }
        Unlisten(listener: IPathFigureListener) { if (this._Listener === listener) this._Listener = null; }
        MergeInto(rp: Shapes.RawPath) {
            if (!this._Path)
                this._Path = this._Build();
            Shapes.RawPath.Merge(rp, this._Path);
        }
    }
    Nullstone.RegisterType(PathFigure, "PathFigure");
    export class PathFigureCollection extends XamlObjectCollection implements IPathFigureListener {
        private _Listener: IPathFigureListener;
        AddedToCollection(value: PathFigure, error: BError): bool {
            if (!super.AddedToCollection(value, error))
                return false;
            value.Listen(this);
            var listener = this._Listener;
            if (listener) listener.PathFigureChanged(value);
        }
        RemovedFromCollection(value: PathFigure, isValueSafe: bool) {
            super.RemovedFromCollection(value, isValueSafe);
            value.Unlisten(this);
            var listener = this._Listener;
            if (listener) listener.PathFigureChanged(value);
        }
        Listen(listener: IPathFigureListener) { this._Listener = listener; }
        Unlisten(listener: IPathFigureListener) { if (this._Listener === listener) this._Listener = null; }
        private PathFigureChanged(newPathFigure: PathFigure) {
            var listener = this._Listener;
            if (listener) listener.PathFigureChanged(newPathFigure);
        }
    }
    Nullstone.RegisterType(PathFigureCollection, "PathFigureCollection");
}

module Fayde.Media {
    export class PathGeometry extends Geometry implements IPathFigureListener {
        static Annotations = { ContentProperty: "Figures" }
        static FillRuleProperty: DependencyProperty = DependencyProperty.Register("FillRule", () => new Enum(Shapes.FillRule), PathGeometry, Shapes.FillRule.EvenOdd, (d, args) => (<Geometry>d)._InvalidateGeometry());
        FillRule: Shapes.FillRule;
        Figures: PathFigureCollection;
        constructor() {
            super();
            var coll = new PathFigureCollection();
            coll.Listen(this);
            Object.defineProperty(this, "Figures", {
                value: coll,
                writable: false
            });
        }
        SetPath(path: Shapes.RawPath) {
            (<any>this)._Path = path;
        }
        private _Build(): Shapes.RawPath {
            var p = new Shapes.RawPath();
            var figures = this.Figures;
            if (!figures)
                return;
            var enumerator = figures.GetEnumerator();
            while (enumerator.MoveNext()) {
                (<PathFigure>enumerator.Current).MergeInto(p);
            }
            return p;
        }
        private PathFigureChanged(newPathFigure: PathFigure) {
            this._InvalidateGeometry();
        }
    }
    Nullstone.RegisterType(PathGeometry, "PathGeometry");
}

module Fayde.Media {
    export interface IPathSegmentListener {
        PathSegmentChanged(newPathSegment: PathSegment);
    }
    export class PathSegment extends DependencyObject {
        private _Listener: IPathSegmentListener;
        _Append(path: Shapes.RawPath) {
        }
        Listen(listener: IPathSegmentListener) { this._Listener = listener; }
        Unlisten(listener: IPathSegmentListener) { if (this._Listener === listener) this._Listener = null; }
    }
    Nullstone.RegisterType(PathSegment, "PathSegment");
    export class PathSegmentCollection extends XamlObjectCollection implements IPathSegmentListener {
        private _Listener: IPathSegmentListener;
        AddedToCollection(value: PathSegment, error: BError): bool {
            if (!super.AddedToCollection(value, error))
                return false;
            value.Listen(this);
            var listener = this._Listener;
            if (listener) listener.PathSegmentChanged(value);
        }
        RemovedFromCollection(value: PathSegment, isValueSafe: bool) {
            super.RemovedFromCollection(value, isValueSafe);
            value.Unlisten(this);
            var listener = this._Listener;
            if (listener) listener.PathSegmentChanged(value);
        }
        Listen(listener: IPathSegmentListener) { this._Listener = listener; }
        Unlisten(listener: IPathSegmentListener) { if (this._Listener === listener) this._Listener = null; }
        private PathSegmentChanged(newPathSegment: PathSegment) {
            var listener = this._Listener;
            if (listener) listener.PathSegmentChanged(newPathSegment);
        }
    }
    Nullstone.RegisterType(PathSegmentCollection, "PathSegmentCollection");
}

module Fayde.Media {
    declare var NotImplemented;
    export class ArcSegment extends PathSegment {
        static IsLargeArcProperty: DependencyProperty = DependencyProperty.RegisterCore("IsLargeArc", () => Boolean, ArcSegment, false);
        static PointProperty: DependencyProperty = DependencyProperty.Register("Point", () => Point, ArcSegment);
        static RotationAngleProperty: DependencyProperty = DependencyProperty.Register("RotationAngle", () => Number, ArcSegment, 0.0);
        static SizeProperty: DependencyProperty = DependencyProperty.Register("Size", () => size, ArcSegment);
        static SweepDirectionProperty: DependencyProperty = DependencyProperty.Register("SweepDirection", () => new Enum(Shapes.SweepDirection), ArcSegment, Shapes.SweepDirection.Counterclockwise);
        IsLargeArc: bool;
        Point: Point;
        RotationAngle: number;
        Size: size;
        SweepDirection: Shapes.SweepDirection;
        _Append(path: Shapes.RawPath) {
            NotImplemented("ArcSegment._Append");
        }
    }
    Nullstone.RegisterType(ArcSegment, "ArcSegment");
    export class BezierSegment extends PathSegment {
        static Point1Property: DependencyProperty = DependencyProperty.Register("Point1", () => Point, BezierSegment);
        static Point2Property: DependencyProperty = DependencyProperty.Register("Point2", () => Point, BezierSegment);
        static Point3Property: DependencyProperty = DependencyProperty.Register("Point3", () => Point, BezierSegment);
        Point1: Point;
        Point2: Point;
        Point3: Point;
        _Append(path: Shapes.RawPath) {
            NotImplemented("BezierSegment._Append");
        }
    }
    Nullstone.RegisterType(BezierSegment, "BezierSegment");
    export class LineSegment extends PathSegment {
        static PointProperty: DependencyProperty = DependencyProperty.Register("Point", () => Point, LineSegment);
        Point: Point;
        _Append(path: Shapes.RawPath) {
            NotImplemented("LineSegment._Append");
        }
    }
    Nullstone.RegisterType(LineSegment, "LineSegment");
    export class PolyBezierSegment extends PathSegment {
        static Annotations = { ContentProperty: "Points" }
        Points: Shapes.PointCollection;
        _Append(path: Shapes.RawPath) {
            NotImplemented("PolyBezierSegment._Append");
        }
    }
    Nullstone.RegisterType(PolyBezierSegment, "PolyBezierSegment");
    export class PolyLineSegment extends PathSegment {
        static Annotations = { ContentProperty: "Points" }
        Points: Shapes.PointCollection;
        _Append(path: Shapes.RawPath) {
            NotImplemented("PolyLineSegment._Append");
        }
    }
    Nullstone.RegisterType(PolyLineSegment, "PolyLineSegment");
    export class PolyQuadraticBezierSegment extends PathSegment {
        static Annotations = { ContentProperty: "Points" }
        Points: Shapes.PointCollection;
        _Append(path: Shapes.RawPath) {
            NotImplemented("PolyQuadraticBezierSegment._Append");
        }
    }
    Nullstone.RegisterType(PolyQuadraticBezierSegment, "PolyQuadraticBezierSegment");
    export class QuadraticBezierSegment extends PathSegment {
        static Point1Property: DependencyProperty = DependencyProperty.Register("Point1", () => Point, QuadraticBezierSegment);
        static Point2Property: DependencyProperty = DependencyProperty.Register("Point2", () => Point, QuadraticBezierSegment);
        Point1: Point;
        Point2: Point;
        _Append(path: Shapes.RawPath) {
            NotImplemented("QuadraticBezierSegment._Append");
        }
    }
    Nullstone.RegisterType(QuadraticBezierSegment, "QuadraticBezierSegment");
}

module Fayde.Media {
    export class Projection extends DependencyObject {
        GetDistanceFromXYPlane(objectSize: ISize): number {
            return NaN;
        }
        GetTransform(): number[] {
            return undefined;
        }
    }
    Nullstone.RegisterType(Projection, "Projection");
}

module Fayde.Media {
    export class RectangleGeometry extends Geometry {
        static RectProperty: DependencyProperty = DependencyProperty.RegisterCore("Rect", () => rect, RectangleGeometry, undefined, (d, args) => (<Geometry>d)._InvalidateGeometry());
        static RadiusXProperty: DependencyProperty = DependencyProperty.RegisterCore("RadiusX", () => Number, RectangleGeometry, 0, (d, args) => (<Geometry>d)._InvalidateGeometry());
        static RadiusYProperty: DependencyProperty = DependencyProperty.RegisterCore("RadiusY", () => Number, RectangleGeometry, 0, (d, args) => (<Geometry>d)._InvalidateGeometry());
        Rect: rect;
        RadiusX: number;
        RadiusY: number;
        private _Build(): Shapes.RawPath {
            var irect = this.Rect;
            if (!irect)
                return;
            var radiusX = this.RadiusX;
            var radiusY = this.RadiusY;
            var p = new Shapes.RawPath();
            p.RoundedRect(irect.X, irect.Y, irect.Width, irect.Height, radiusX, radiusY);
            return p;
        }
    }
    Nullstone.RegisterType(RectangleGeometry, "RectangleGeometry");
}

module Fayde.Media {
    export class TextOptions {
        static TextHintingModeProperty: DependencyProperty = DependencyProperty.RegisterAttached("TextHintingMode", () => new Enum(TextHintingMode), TextOptions);
        static GetTextHintingMode(d: DependencyObject): TextHintingMode { return d.GetValue(TextHintingModeProperty); }
        static SetTextHintingMode(d: DependencyObject, value: TextHintingMode) { d.SetValue(TextHintingModeProperty, value); }
    }
    Nullstone.RegisterType(TextOptions, "TextOptions");
}

module Fayde.Media {
    export interface ITransformChangedListener {
        TransformChanged(source: Transform);
    }
    export class Transform extends GeneralTransform {
        private _Value: Matrix;
        _Listener: ITransformChangedListener = null;
        get Value(): Matrix {
            var val = this._Value;
            if (!val) {
                var val = new Matrix();
                val._Raw = this._BuildValue();
                this._Value = val;
            }
            return val;
        }
        get Inverse(): Transform {
            var inverse = this.Value.Inverse;
            if (inverse == null)
                return;
            var mt = new MatrixTransform();
            mt.Matrix = inverse;
            return mt;
        }
        Transform(p: Point): Point {
            var val = this.Value;
            var v: number[];
            if (!val || !(v = val._Raw))
                return new Point(p.X, p.Y);
            v = mat3.transformVec2(v, vec2.createFrom(p.X, p.Y));
            return new Point(v[0], v[1]);
        }
        TransformBounds(r: rect): rect {
            if (!r)
                return undefined;
            var v = this.Value;
            if (!v || !v._Raw)
                return rect.clone(r);
            return rect.transform(rect.clone(r), v._Raw);
        }
        TryTransform(inPoint: Point, outPoint: Point): bool {
            return false;
        }
        Listen(listener: ITransformChangedListener) { this._Listener = listener; }
        Unlisten(listener: ITransformChangedListener) { if (this._Listener === listener) this._Listener = null; }
        _InvalidateValue() {
            if (this._Value === undefined)
                return;
            this._Value = undefined;
            var listener = this._Listener;
            if (listener) listener.TransformChanged(this);
        }
        _BuildValue(): number[] {
            return undefined;
        }
    }
    Nullstone.RegisterType(Transform, "Transform");
    export class MatrixTransform extends Transform implements IMatrixChangedListener {
        static MatrixProperty: DependencyProperty = DependencyProperty.RegisterFull("Matrix", () => Matrix, MatrixTransform, undefined, (d, args) => (<MatrixTransform>d)._MatrixChanged(args));
        Matrix: Matrix;
        _BuildValue(): number[] {
            var m = this.Matrix;
            if (m)
                return m._Raw;
            return mat3.identity();
        }
        _MatrixChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldv: Matrix = args.OldValue;
            var newv: Matrix = args.NewValue;
            if (oldv)
                oldv.Unlisten(this);
            if (newv)
                newv.Listen(this);
            this.MatrixChanged(newv);
        }
        MatrixChanged(newMatrix: Matrix) {
            var listener = this._Listener;
            if (listener) listener.TransformChanged(this);
        }
    }
    Nullstone.RegisterType(MatrixTransform, "MatrixTransform");
}

module Fayde.Media {
    export class RotateTransform extends Transform {
        static AngleProperty: DependencyProperty = DependencyProperty.Register("Angle", () => Number, RotateTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        static CenterXProperty: DependencyProperty = DependencyProperty.Register("CenterX", () => Number, RotateTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        static CenterYProperty: DependencyProperty = DependencyProperty.Register("CenterY", () => Number, RotateTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        Angle: number;
        CenterX: number;
        CenterY: number;
        private _BuildValue(): number[] {
            var cx = this.CenterX;
            var cy = this.CenterY;
            var angleRad = Math.PI / 180 * this.Angle;
            var m = mat3.createRotate(angleRad);
            if (cx === 0 && cy === 0)
                return m;
            mat3.multiply(mat3.createTranslate(-cx, -cy), m, m); //m = m * translation
            mat3.translate(m, cx, cy);
            return m;
        }
    }
    Nullstone.RegisterType(RotateTransform, "RotateTransform");
    export class ScaleTransform extends Transform {
        static CenterXProperty: DependencyProperty = DependencyProperty.Register("CenterX", () => Number, ScaleTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        static CenterYProperty: DependencyProperty = DependencyProperty.Register("CenterY", () => Number, ScaleTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        static ScaleXProperty: DependencyProperty = DependencyProperty.Register("ScaleX", () => Number, ScaleTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        static ScaleYProperty: DependencyProperty = DependencyProperty.Register("ScaleY", () => Number, ScaleTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        CenterX: number;
        CenterY: number;
        ScaleX: number;
        ScaleY: number;
        private _BuildValue(): number[] {
            var cx = this.CenterX;
            var cy = this.CenterY;
            var m = mat3.createScale(this.ScaleX, this.ScaleY);
            if (cx === 0 && cy === 0)
                return m;
            mat3.multiply(mat3.createTranslate(-cx, -cy), m, m); //m = m * translation
            mat3.translate(m, cx, cy);
            return m;
        }
    }
    Nullstone.RegisterType(ScaleTransform, "ScaleTransform");
    export class SkewTransform extends Transform {
        static AngleXProperty: DependencyProperty = DependencyProperty.Register("AngleX", () => Number, SkewTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        static AngleYProperty: DependencyProperty = DependencyProperty.Register("AngleY", () => Number, SkewTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        static CenterXProperty: DependencyProperty = DependencyProperty.Register("CenterX", () => Number, SkewTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        static CenterYProperty: DependencyProperty = DependencyProperty.Register("CenterY", () => Number, SkewTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        AngleX: number;
        AngleY: number;
        CenterX: number;
        CenterY: number;
        private _BuildValue(): number[] {
            var cx = this.CenterX;
            var cy = this.CenterY;
            var angleXRad = Math.PI / 180 * this.AngleX;
            var angleYRad = Math.PI / 180 * this.AngleY;
            var m = mat3.createSkew(angleXRad, angleYRad);
            if (cx === 0 && cy === 0)
                return m;
            mat3.multiply(mat3.createTranslate(-cx, -cy), m, m); //m = m * translation
            mat3.translate(m, cx, cy);
            return m;
        }
    }
    Nullstone.RegisterType(SkewTransform, "SkewTransform");
    export class TranslateTransform extends Transform {
        static XProperty: DependencyProperty = DependencyProperty.Register("X", () => Number, SkewTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        static YProperty: DependencyProperty = DependencyProperty.Register("Y", () => Number, SkewTransform, 0, (d, args) => (<Transform>d)._InvalidateValue());
        X: number;
        Y: number;
        private _BuildValue(): number[] {
            return mat3.createTranslate(this.X, this.Y);
        }
    }
    Nullstone.RegisterType(TranslateTransform, "TranslateTransform");
    export class TransformCollection extends XamlObjectCollection implements ITransformChangedListener {
        private _Listener: ITransformChangedListener;
        Listen(listener: ITransformChangedListener) { this._Listener = listener; }
        Unlisten(listener: ITransformChangedListener) { if (this._Listener === listener) this._Listener = null; }
        AddedToCollection(value: Transform, error: BError): bool {
            if (!super.AddedToCollection(value, error))
                return false;
            value.Listen(this);
            this.TransformChanged();
        }
        RemovedFromCollection(value: Transform, isValueSafe: bool) {
            if (!super.RemovedFromCollection(value, isValueSafe))
                return false;
            value.Unlisten(this);
            this.TransformChanged();
        }
        private TransformChanged(transform?: Transform) {
            var listener = this._Listener;
            if (listener) listener.TransformChanged(transform);
        }
    }
    Nullstone.RegisterType(TransformCollection, "TransformCollection");
    export class TransformGroup extends Transform implements ITransformChangedListener {
        Children: TransformCollection;
        constructor() {
            super();
            var coll = new TransformCollection();
            coll.Listen(this);
            Object.defineProperty(this, "Children", {
                value: coll,
                writable: false
            });
        }
        private TransformChanged(source: Transform) { this._InvalidateValue(); }
        private _BuildValue(): number[] {
            var enumerator = this.Children.GetEnumerator(true);
            var cur = mat3.identity();
            while (enumerator.MoveNext()) {
                mat3.multiply((<Transform>enumerator.Current).Value._Raw, cur, cur); //cur = cur * child
            }
            return cur;
        }
    }
    Nullstone.RegisterType(TransformGroup, "TransformGroup");
}

module Fayde.Media.Animation {
    export interface IEasingFunction {
        Ease(normalizedTime: number): number;
    }
    export class EasingFunctionBase extends DependencyObject implements IEasingFunction {
        static EasingModeProperty: DependencyProperty = DependencyProperty.Register("EasingMode", () => new Enum(EasingMode), EasingFunctionBase);
        EasingMode: EasingMode;
        Ease(normalizedTime: number): number {
            var easingMode = this.EasingMode;
            switch (easingMode) {
                case EasingMode.EaseIn:
                    return this.EaseInCore(normalizedTime);
                case EasingMode.EaseOut:
                    return this.EaseInCore(1.0 - normalizedTime);
                case EasingMode.EaseInOut:
                    return normalizedTime <= 0.5 ?
                        this.EaseInCore(normalizedTime * 2) * 0.5 :
                        1.0 - this.EaseInCore(((1.0 - normalizedTime) * 2) * 0.5);
                default:
                    return 0.0;
            }
        }
        EaseInCore(t: number): number {
            return t;
        }
    }
}

module Fayde.Media.Animation {
    export class BackEase extends EasingFunctionBase {
        static AmplitudeProperty: DependencyProperty = DependencyProperty.Register("Amplitude", () => Number, BackEase);
        Amplitude: number;
        EaseInCore(t: number): number {
            var a = this.Amplitude;
            return (t * t * t) - (t * a * Math.sin(t * Math.PI));
        }
    }
    Nullstone.RegisterType(BackEase, "BackEase");
    export class BounceEase extends EasingFunctionBase {
        static BouncesProperty:DependencyProperty = DependencyProperty.Register("Bounces", () => Number, BounceEase, 3);
        static BouncinessProperty:DependencyProperty = DependencyProperty.Register("Bounciness", () => Number, BounceEase, 2);
        Bounces: number;
        Bounciness: number;
        EaseInCore(t: number): number {
            t = 1 - t;
            var bounces = this.Bounces;
            var bounciness = this.Bounciness;
            var r = -1;
            var period = 2;
            for (var i = 0; i <= bounces; i++) {
                r += (period * Math.pow(1 + (bounciness / 2), -i));
            }
            var x1 = -1.0;
            var x2 = 0;
            var r_sq = r * r;
            var val = 100;
            var p = 0;
            while (val > 0.0) {
                x2 = x1 + period * Math.pow(1 + (bounciness / 2), -p++);
                val = r_sq * (t - x1 / r) * (t - x2 / r);
                x1 = x2;
            }
            return -val;
        }
    }
    Nullstone.RegisterType(BounceEase, "BounceEase");
    export class CircleEase extends EasingFunctionBase {
        EaseInCore(t: number): number {
            return 1 - Math.sqrt(1 - (t * t));
        }
    }
    Nullstone.RegisterType(CircleEase, "CircleEase");
    export class CubicEase extends EasingFunctionBase {
        EaseInCore(t: number): number {
            return t * t * t;
        }
    }
    Nullstone.RegisterType(CubicEase, "CubicEase");
    export class ElasticEase extends EasingFunctionBase {
        static OscillationsProperty: DependencyProperty = DependencyProperty.Register("Oscillations", () => Number, ElasticEase);
        static SpringinessProperty: DependencyProperty = DependencyProperty.Register("Springiness", () => Number, ElasticEase);
        Oscillations: number;
        Springiness: number;
        EaseInCore(t: number): number {
            var period = 1.0 / (this.Oscillations + .25);
            var offset = period / 4;
            t = t - 1;
            return t * -Math.pow(2.0, this.Springiness * t) * Math.sin(((t - offset) * Math.PI * 2) / period);
        }
    }
    Nullstone.RegisterType(ElasticEase, "ElasticEase");
    export class ExponentialEase extends EasingFunctionBase {
        static ExponentProperty: DependencyProperty = DependencyProperty.Register("Exponent", () => Number, ExponentialEase);
        Exponent: number;
        EaseInCore(t: number): number {
            var e = this.Exponent;
            return (Math.exp(e * t) - 1) / (Math.exp(e) - 1);
        }
    }
    Nullstone.RegisterType(ExponentialEase, "ExponentialEase");
    export class PowerEase extends EasingFunctionBase {
        static PowerProperty: DependencyProperty = DependencyProperty.Register("Power", () => Number, PowerEase);
        Power: number;
        EaseInCore(t: number): number {
            return Math.pow(t, this.Power);
        }
    }
    Nullstone.RegisterType(PowerEase, "PowerEase");
    export class QuadraticEase extends EasingFunctionBase {
        EaseInCore(t: number): number {
            return t * t;
        }
    }
    Nullstone.RegisterType(QuadraticEase, "QuadraticEase");
    export class QuarticEase extends EasingFunctionBase {
        EaseInCore(t: number): number {
            return t * t * t * t;
        }
    }
    Nullstone.RegisterType(QuarticEase, "QuarticEase");
    export class QuinticEase extends EasingFunctionBase {
        EaseInCore(t: number): number {
            return t * t * t * t * t;
        }
    }
    Nullstone.RegisterType(QuinticEase, "QuinticEase");
    export class SineEase extends EasingFunctionBase {
        EaseInCore(t: number): number {
            return 1 - (Math.sin(1 - t) * (Math.PI / 2));
        }
    }
    Nullstone.RegisterType(SineEase, "SineEase");
}

module Fayde.Media.Animation {
    export interface IKeyFrameListener {
        KeyFrameChanged(source: KeyFrame);
    }
    export interface IKeyFrame {
        _ResolvedKeyTime: TimeSpan;
        _Resolved: bool;
        Value: any;
        InterpolateValue(baseValue: any, keyFrameProgress: number): any;
    }
    export class KeyFrame extends DependencyObject implements IKeyFrame {
        private _ResolvedKeyTime: TimeSpan = null;
        private _Resolved: bool = false;
        private _Listener: IKeyFrameListener;
        static KeyTimeProperty: DependencyProperty = DependencyProperty.Register("KeyTime", () => KeyTime, KeyFrame, undefined, (d, args) => (<KeyFrame>d).InvalidateKeyFrame());
        KeyTime: KeyTime;
        Value: any;
        CoerceKeyTime(dobj: DependencyObject, propd: DependencyProperty, value: any, coerced: IOutValue, error: BError): bool {
            if (!value)
                coerced.Value = this.KeyTime;
            else
                coerced.Value = value;
            return true;
        }
        InterpolateValue(baseValue: any, keyFrameProgress: number): any {
            return undefined;
        }
        CompareToTimeSpan(otherTs: TimeSpan): number {
            return this._ResolvedKeyTime.CompareTo(otherTs);
        }
        Listen(listener: IKeyFrameListener) { this._Listener = listener; }
        Unlisten(listener: IKeyFrameListener) { if (this._Listener === listener) this._Listener = null; }
        InvalidateKeyFrame() {
            var listener = this._Listener;
            if (listener) listener.KeyFrameChanged(this);
        }
        static Comparer(kf1: KeyFrame, kf2: KeyFrame): number {
            var ts1 = kf1._ResolvedKeyTime;
            var ts2 = kf2._ResolvedKeyTime;
            return ts1.CompareTo(ts2);
        }
        static ResolveKeyFrames(animation: AnimationBase): KeyFrame[] {
            var totalInterpolationTime: TimeSpan;
            var hasTimeSpanKeyFrame = false;
            var highestKeyTimeTimeSpan = new TimeSpan();
            var keyFrame: KeyFrame;
            var arr: KeyFrame[] = (this)._ht;
            var len = arr.length;
            var i: number;
            for (i = 0; i < len; i++) {
                keyFrame = arr[i];
                keyFrame._ResolvedKeyTime = new TimeSpan();
                keyFrame._Resolved = false;
            }
            var keyTime;
            for (i = 0; i < len; i++) {
                keyFrame = arr[i];
                keyTime = keyFrame.KeyTime;
                if (keyTime.HasTimeSpan) {
                    hasTimeSpanKeyFrame = true;
                    var ts = keyTime.TimeSpan;
                    if (ts.CompareTo(highestKeyTimeTimeSpan) > 0)
                        highestKeyTimeTimeSpan = ts;
                    keyFrame._ResolvedKeyTime = ts;
                    keyFrame._Resolved = true;
                }
            }
            var d = animation._Store.GetValue(Timeline.DurationProperty);
            if (d.HasTimeSpan) {
                totalInterpolationTime = d.TimeSpan;
            } else if (hasTimeSpanKeyFrame) {
                totalInterpolationTime = highestKeyTimeTimeSpan;
            } else {
                totalInterpolationTime = TimeSpan.FromTicks(TimeSpan._TicksPerSecond);
            }
            for (i = 0; i < len; i++) {
                keyFrame = arr[i];
                keyTime = keyFrame.KeyTime;
                if (keyTime.HasPercent) {
                    keyFrame._ResolvedKeyTime = totalInterpolationTime.Multiply(keyTime.Percent)
                    keyFrame._Resolved = true;
                }
            }
            if (len > 0) {
                keyFrame = arr[len - 1];
                keyTime = keyFrame.KeyTime;
                if (keyTime.IsPaced || keyTime.IsUniform) {
                    keyFrame._ResolvedKeyTime = totalInterpolationTime;
                    keyFrame._Resolved = true;
                }
            }
            /* if the first frame is KeyTime Paced:
            **   1. if there is only 1 frame, its KeyTime is the total interpolation time.
            **   2. if there is more than 1 frame, its KeyTime is 0.
            **
            ** note 1 is handled in the above block so we only have to
            ** handle 2 here.
            */
            if (len > 0) {
                keyFrame = arr[len - 1];
                keyTime = keyFrame.KeyTime;
                if (!keyFrame._Resolved && keyTime.IsPaced) {
                    keyFrame._ResolvedKeyTime = new TimeSpan();
                    keyFrame._Resolved = true;
                }
            }
            return arr;
        }
    }
    Nullstone.RegisterType(KeyFrame, "KeyFrame");
    export class KeyFrameCollection extends XamlObjectCollection {
        private _Resolved: bool = false;
        private _SortedList: KeyFrame[] = [];
        GetKeyFrameForTime(t: TimeSpan, prevFrameRef: IOutValue): KeyFrame {
            var currentKeyFrame: KeyFrame = null;
            var previousKeyFrame: KeyFrame = null;
            var i;
            var sortedList = this._SortedList;
            if (sortedList.length == 0) {
                prevFrameRef.Value = null;
                return null;
            }
            var keyFrame: KeyFrame;
            var valuePropd;
            for (i = 0; i < sortedList.length; i++) {
                keyFrame = sortedList[i];
                if (keyFrame.CompareToTimeSpan(t) >= 0 || (i + 1) >= sortedList.length)
                    break;
            }
            for (; i >= 0; i--) {
                keyFrame = sortedList[i];
                valuePropd = DependencyProperty.GetDependencyProperty((<any>keyFrame).constructor, "Value");
                if (keyFrame._Store.GetValue(valuePropd) !== undefined) {
                    currentKeyFrame = keyFrame;
                    break;
                }
            }
            for (i--; i >= 0; i--) {
                keyFrame = sortedList[i];
                valuePropd = DependencyProperty.GetDependencyProperty((<any>keyFrame).constructor, "Value");
                if (keyFrame._Store.GetValue(valuePropd) !== undefined) {
                    previousKeyFrame = keyFrame;
                    break;
                }
            }
            prevFrameRef.Value = previousKeyFrame;
            return currentKeyFrame;
        }
        Clear(): bool {
            this._Resolved = false;
            this._SortedList = [];
            return super.Clear();
        }
        private AddedToCollection(value: KeyFrame, error: BError): bool {
            if (!super.AddedToCollection(value, error))
                return false;
            this._Resolved = false;
            value.Listen(this);
            return true;
        }
        private RemovedFromCollection(value: KeyFrame, isValueSafe: bool) {
            super.RemovedFromCollection(value, isValueSafe);
            this._Resolved = false;
            value.Unlisten(this);
        }
        private KeyFrameChanged(source: KeyFrame) {
            this._Resolved = false;
        }
        static ResolveKeyFrames(animation: AnimationBase, coll: KeyFrameCollection): KeyFrame[] {
            if (coll._Resolved)
                return;
            coll._SortedList = KeyFrame.ResolveKeyFrames(animation).slice(0);
            coll._SortedList.sort(KeyFrame.Comparer);
            coll._Resolved = true;
            return coll._SortedList;
        }
    }
    Nullstone.RegisterType(KeyFrameCollection, "KeyFrameCollection");
}

module Fayde.Media.Animation {
    export class KeySpline extends DependencyObject {
        static PRECISION_LEVEL: number = 4;
        static TOTAL_COUNT: number = Math.pow(2, KeySpline.PRECISION_LEVEL);
        static ControlPoint1Property: DependencyProperty = DependencyProperty.RegisterCore("ControlPoint1", function () { return Point; }, KeySpline, new Point(0, 0), (d, args) => (<KeySpline>d).InvalidateControlPoints());
        static ControlPoint2Property: DependencyProperty = DependencyProperty.RegisterCore("ControlPoint2", function () { return Point; }, KeySpline, new Point(1.0, 1.0), (d, args) => (<KeySpline>d).InvalidateControlPoints());
        ControlPoint1: Point;
        ControlPoint2: Point;
        private _QuadraticsArray: IQuadraticCurve[] = null;
        GetSplineProgress(linearProgress: number): number {
            if (linearProgress >= 1.0)
                return 1.0;
            if (linearProgress <= 0.0)
                return 0.0;
            if (!this._QuadraticsArray)
                this._RegenerateQuadratics();
            return Curves.QuadraticArrayYForX(this._QuadraticsArray, linearProgress, KeySpline.TOTAL_COUNT);
        }
        private InvalidateControlPoints() {
            this._QuadraticsArray = null;
        }
        private _RegenerateQuadratics() {
            var c1 = this.ControlPoint1;
            var c2 = this.ControlPoint2;
            var src: ICubicCurve = {
                c0: { x: 0.0, y: 0.0 },
                c1: { x: c1.X, y: c1.Y },
                c2: { x: c2.X, y: c2.Y },
                c3: { x: 1.0, y: 1.0 }
            };
            var carr: ICubicCurve[] = [];
            Curves.SubdivideCubicAtLevel(carr, KeySpline.PRECISION_LEVEL, src);
            this._QuadraticsArray = Curves.ConvertCubicsToQuadratics(carr, KeySpline.TOTAL_COUNT);
        }
    }
    Nullstone.RegisterType(KeySpline, "KeySpline");
}

module Fayde.Media.Animation {
    export class ObjectKeyFrame extends KeyFrame {
        static ValueProperty: DependencyProperty = DependencyProperty.Register("Value", () => Object, ObjectKeyFrame);
        Value: any;
        ConvertedValue: any = undefined;
    }
    Nullstone.RegisterType(ObjectKeyFrame, "ObjectKeyFrame");
    export class DiscreteObjectKeyFrame extends ObjectKeyFrame {
        InterpolateValue(baseValue: any, keyFrameProgress: number): any {
            if (keyFrameProgress >= 1.0)
                return this.ConvertedValue;
            return baseValue;
        }
    }
    Nullstone.RegisterType(DiscreteObjectKeyFrame, "DiscreteObjectKeyFrame");
}

module Fayde.Media.Animation {
    export class PointKeyFrame extends KeyFrame {
        static ValueProperty: DependencyProperty = DependencyProperty.Register("Value", () => Point, PointKeyFrame);
        Value: Point;
    }
    Nullstone.RegisterType(PointKeyFrame, "PointKeyFrame");
    export class DiscretePointKeyFrame extends PointKeyFrame {
        InterpolateValue(baseValue: Point, keyFrameProgress: number): Point {
            if (keyFrameProgress >= 1.0)
                return this.Value;
            return baseValue;
        }
    }
    Nullstone.RegisterType(DiscretePointKeyFrame, "DiscretePointKeyFrame");
    export class EasingPointKeyFrame extends PointKeyFrame {
        static EasingFunctionProperty: DependencyProperty = DependencyProperty.Register("EasingFunction", () => EasingFunctionBase, EasingPointKeyFrame);
        EasingFunction: EasingFunctionBase;
        InterpolateValue(baseValue: Point, keyFrameProgress: number): Point {
            if (keyFrameProgress >= 1.0)
                return this.Value;
            var start = baseValue;
            var end = this.Value;
            var easingFunction = this.EasingFunction;
            if (easingFunction)
                keyFrameProgress = easingFunction.Ease(keyFrameProgress);
            return Point.LERP(start, end, keyFrameProgress);
        }
    }
    Nullstone.RegisterType(EasingPointKeyFrame, "EasingPointKeyFrame");
    export class LinearPointKeyFrame extends PointKeyFrame {
        InterpolateValue(baseValue: Point, keyFrameProgress: number): Point {
            return Point.LERP(baseValue, this.Value, keyFrameProgress);
        }
    }
    Nullstone.RegisterType(LinearPointKeyFrame, "LinearPointKeyFrame");
    export class SplinePointKeyFrame extends PointKeyFrame {
        static KeySplineProperty: DependencyProperty = DependencyProperty.Register("KeySpline", () => KeySpline, SplinePointKeyFrame);
        KeySpline: KeySpline;
        InterpolateValue(baseValue: Point, keyFrameProgress: number): Point {
            if (keyFrameProgress >= 1.0)
                return this.Value;
            var start = baseValue;
            var end = this.Value;
            var splineProgress = keyFrameProgress;
            var keySpline = this.KeySpline;
            if (keySpline)
                splineProgress = keySpline.GetSplineProgress(keyFrameProgress);
            if (isNaN(start.X))
                start.X = 0;
            if (isNaN(start.Y))
                start.Y = 0;
            if (isNaN(end.X))
                end.X = 0;
            if (isNaN(end.Y))
                end.Y = 0;
            return Point.LERP(start, end, splineProgress);
        }
    }
    Nullstone.RegisterType(SplinePointKeyFrame, "SplinePointKeyFrame");
}

module Fayde.Media.Animation {
    export interface IClockData {
        CurrentTime: TimeSpan;
        Progress: number;
        Completed: bool;
    }
    export class Timeline extends DependencyObject {
        static AutoReverseProperty: DependencyProperty = DependencyProperty.Register("AutoReverse", () => Boolean, Timeline, false);
        static BeginTimeProperty: DependencyProperty = DependencyProperty.Register("BeginTime", () => TimeSpan, Timeline);
        static DurationProperty: DependencyProperty = DependencyProperty.Register("Duration", () => Duration, Timeline);
        static RepeatBehaviorProperty: DependencyProperty = DependencyProperty.Register("RepeatBehavior", () => RepeatBehavior, Timeline);
        static SpeedRatioProperty: DependencyProperty = DependencyProperty.Register("SpeedRatio", () => Number, Timeline, 1.0);
        static FillBehaviorProperty: DependencyProperty = DependencyProperty.Register("FillBehavior", () => new Enum(FillBehavior), Timeline, FillBehavior.HoldEnd);
        AutoReverse: bool;
        BeginTime: TimeSpan;
        Duration: Duration;
        RepeatBehavior: RepeatBehavior;
        SpeedRatio: number;
        FillBehavior: FillBehavior;
        Completed: MulticastEvent = new MulticastEvent();
        private _IsPaused: bool = false;
        private _BeginPauseTime: number = 0;
        private _TicksPaused: number = 0;
        private _IsFirstUpdate: bool = true;
        private _HasBegun: bool = false;
        private _BeginTicks: number = undefined;
        private _InitialStep: number = undefined;
        private _ManualTarget: DependencyObject = undefined;
        get HasManualTarget():bool { return this._ManualTarget != null; }
        get ManualTarget(): DependencyObject { return this._ManualTarget; }
        Reset() {
            this._TicksPaused = 0;
            this._IsFirstUpdate = true;
            this._BeginTicks = undefined;
            this._HasBegun = false;
        }
        Pause() {
            if (this._IsPaused)
                return;
            this._BeginPauseTime = new Date().getTime();
            this._IsPaused = true;
        }
        Resume() {
            if (!this._IsPaused)
                return;
            this._IsPaused = false;
            var nowTime = new Date().getTime();
            this._TicksPaused = nowTime - this._BeginPauseTime;
        }
        Stop() {
            this.Reset();
        }
        OnCompleted() {
            var fill = this.FillBehavior;
            switch (fill) {
                case FillBehavior.HoldEnd:
                    this.Disable();
                    break;
                case FillBehavior.Stop:
                    this.Stop();
                    break;
            }
            this.Completed.Raise(this, EventArgs.Empty);
        }
        Update(nowTime: number) {
            var clockData = this.CreateClockData(nowTime);
            if (!clockData)
                return;
            if (this._IsPaused)
                return;
            this.UpdateInternal(clockData);
            if (clockData.Completed)
                this.OnCompleted();
        }
        UpdateInternal(clockData: IClockData) { }
        Disable() { }
        CreateClockData(nowTime: number): IClockData {
            if (this._IsFirstUpdate) {
                this._InitialStep = nowTime;
                this._HasBegun = false;
                this._IsFirstUpdate = false;
            }
            if (!this._HasBegun) {
                if (!this.IsAfterBeginTime(nowTime))
                    return;
                this._BeginTicks = nowTime;
                this._HasBegun = true;
            }
            var elapsedTicks = nowTime - this._BeginTicks - this._TicksPaused;
            var currentTimeTicks = elapsedTicks;
            var progress = 0.0;
            var completed = false;
            var duration = this.GetNaturalDuration();
            if (!duration || duration.IsAutomatic) {
                progress = 1.0;
                completed = true;
            } else if (duration.HasTimeSpan) {
                var d = duration.TimeSpan.Ticks;
                if (d === 0) {
                    progress = 1.0;
                } else if (this.AutoReverse === true) {
                    d = d / 2;
                    progress = 1 - (Math.abs((elapsedTicks % (d + d)) - d) / d);
                } else {
                    progress = (elapsedTicks / d) - Math.floor(elapsedTicks / d);
                }
                var repeat = this.RepeatBehavior;
                if (repeat.IsForever) {
                } else if (repeat.HasCount) {
                    if ((d === 0) || (Math.floor(elapsedTicks / d) >= repeat.Count)) {
                        progress = 1.0;
                        completed = true;
                    }
                } else if (repeat.HasDuration) {
                    if (elapsedTicks >= repeat.Duration.TimeSpan.Ticks) {
                        progress = 1.0;
                        completed = true;
                    }
                }
                if (d !== 0)
                    currentTimeTicks = progress * d; //normalizes CurrentTime within [0,duration] constraints
            }
            return {
                CurrentTime: TimeSpan.FromTicks(currentTimeTicks),
                Progress: progress,
                Completed: completed
            };
        }
        IsAfterBeginTime(nowTime: number): bool {
            var beginTime = this.BeginTime;
            if (beginTime == null)
                return true;
            var beginTicks = beginTime.Ticks;
            if (beginTicks <= 0)
                return true;
            var elapsedTicks = nowTime - this._InitialStep;
            if (elapsedTicks < beginTicks)
                return false;
            return true;
        }
        GetNaturalDuration(): Duration {
            var d = this.Duration;
            if (d.IsAutomatic)
                return this.GetNaturalDurationCore();
            return d;
        }
        GetNaturalDurationCore(): Duration { return Duration.CreateAutomatic(); }
    }
    Nullstone.RegisterType(Timeline, "Timeline");
    export class TimelineCollection extends XamlObjectCollection {
    }
    Nullstone.RegisterType(TimelineCollection, "TimelineCollection");
}

module Fayde.Media.Effects {
    export interface IEffectListener {
        EffectChanged(effect: Media.Effects.Effect);
    }
    export class Effect extends DependencyObject {
        private _Listener: Media.Effects.IEffectListener;
        static EffectMappingProperty: DependencyProperty = DependencyProperty.Register("EffectMapping", () => GeneralTransform, Effect, undefined, (d, args) => (<Media.Effects.Effect>d)._EffectChanged(args));
        EffectMapping: GeneralTransform;
        Padding(): Thickness { return new Thickness(); }
        GetPadding(thickness: Thickness): bool { return false; }
        PreRender(ctx: RenderContext) {
        }
        Listen(listener: Media.Effects.IEffectListener) { this._Listener = listener; }
        Unlisten(listener: Media.Effects.IEffectListener) { if (this._Listener === listener) this._Listener = null; }
        _EffectChanged(args: IDependencyPropertyChangedEventArgs) {
            var listener = this._Listener;
            if (listener) listener.EffectChanged(this);
        }
    }
    Nullstone.RegisterType(Effect, "Effect");
}

module Fayde.Media.Imaging {
    export class ImageSource extends DependencyObject {
        PixelWidth: number = 0;
        PixelHeight: number = 0;
        Lock() { }
        Unlock() { }
        get Image(): HTMLImageElement { return undefined; }
    }
    Nullstone.RegisterType(ImageSource, "ImageSource");
}

module Fayde.Media.VSM {
    export class VisualState extends DependencyObject {
        static StoryboardProperty: DependencyProperty = DependencyProperty.Register("Storyboard", () => Animation.Storyboard, VisualState);
        Storyboard: Animation.Storyboard;
        static Annotations = { ContentProperty: VisualState.StoryboardProperty };
    }
    Nullstone.RegisterType(VisualState, "VisualState");
    export class VisualStateCollection extends XamlObjectCollection {
    }
    Nullstone.RegisterType(VisualStateCollection, "VisualStateCollection");
}

module Fayde.Media.VSM {
    export class VisualStateChangedEventArgs extends EventArgs {
        constructor(public OldState: VisualState, public NewState: VisualState, public Control: Controls.Control) {
            super();
        }
    }
    export class VisualStateGroup extends DependencyObject {
        static Annotations = { ContentProperty: "States" };
        private _CurrentStoryboards: Animation.Storyboard[] = [];
        private _Transitions: VisualTransition[] = null;
        Transitions: VisualTransition[];
        States: VisualStateCollection;
        CurrentStateChanging: MulticastEvent = new MulticastEvent();
        CurrentStateChanged: MulticastEvent = new MulticastEvent();
        CurrentState: VisualState = null;
        constructor() {
            super();
            Object.defineProperty(this, "States", {
                value: new VisualStateCollection(),
                writable: false
            });
            Object.defineProperty(this, "Transitions", {
                get: function() {
                    if (!this._Transitions)
                        this._Transitions = [];
                    return this._Transitions;
                }
            });
        }
        GetState(stateName: string): VisualState {
            var enumerator = this.States.GetEnumerator();
            var state: VisualState;
            while (enumerator.MoveNext()) {
                state = enumerator.Current;
                if (state.Name === stateName)
                    return state;
            }
            return null;
        }
        StartNewThenStopOld(element: FrameworkElement, newStoryboards: Animation.Storyboard[]) {
            var i;
            var storyboard;
            for (i = 0; i < newStoryboards.length; i++) {
                storyboard = newStoryboards[i];
                if (storyboard == null)
                    continue;
                element.Resources.Set(storyboard._ID, storyboard);
                try {
                    storyboard.Begin();
                } catch (err) {
                    for (var j = 0; j <= i; j++) {
                        if (newStoryboards[j] != null)
                            element.Resources.Remove((<any>newStoryboards[j])._ID);
                    }
                    throw err;
                }
            }
            this.StopCurrentStoryboards(element);
            var curStoryboards = this._CurrentStoryboards;
            for (i = 0; i < newStoryboards.length; i++) {
                if (newStoryboards[i] == null)
                    continue;
                curStoryboards.push(newStoryboards[i]);
            }
        }
        StopCurrentStoryboards(element: FrameworkElement) {
            var curStoryboards = this._CurrentStoryboards;
            var enumerator = ArrayEx.GetEnumerator(curStoryboards);
            var storyboard: Animation.Storyboard;
            while (enumerator.MoveNext()) {
                storyboard = enumerator.Current;
                if (!storyboard)
                    continue;
                element.Resources.Remove((<any>storyboard)._ID);
                storyboard.Stop();
            }
            this._CurrentStoryboards = [];
        }
        RaiseCurrentStateChanging(element: FrameworkElement, oldState: VisualState, newState: VisualState, control: Controls.Control) {
            this.CurrentStateChanging.Raise(this, new VisualStateChangedEventArgs(oldState, newState, control));
        }
        RaiseCurrentStateChanged(element: FrameworkElement, oldState: VisualState, newState: VisualState, control: Controls.Control) {
            this.CurrentStateChanged.Raise(this, new VisualStateChangedEventArgs(oldState, newState, control));
        }
    }
    Nullstone.RegisterType(VisualStateGroup, "VisualStateGroup");
    export class VisualStateGroupCollection extends XamlObjectCollection {
    }
    Nullstone.RegisterType(VisualStateGroupCollection, "VisualStateGroupCollection");
}

module Fayde.Media.VSM {
    declare var NotImplemented;
    export interface IStateData {
        state: VisualState;
        group: VisualStateGroup;
    }
    export class VisualStateManager extends DependencyObject {
        static VisualStateGroupsProperty: DependencyProperty = DependencyProperty.RegisterAttachedCore("VisualStateGroups", () => VisualStateGroupCollection, VisualStateManager);
        static GetVisualStateGroups(d: DependencyObject): VisualStateGroupCollection { return d.GetValue(VisualStateGroupsProperty); }
        static SetVisualStateGroups(d: DependencyObject, value: VisualStateGroupCollection) { d.SetValue(VisualStateGroupsProperty, value); }
        private static _GetVisualStateGroupsInternal(d: DependencyObject): VisualStateGroupCollection {
            var groups = this.GetVisualStateGroups(d);
            if (!groups) {
                groups = new VisualStateGroupCollection();
                VisualStateManager.SetVisualStateGroups(d, groups);
            }
            return groups;
        }
        static CustomVisualStateManagerProperty: DependencyProperty = DependencyProperty.RegisterAttachedCore("CustomVisualStateManager", () => VisualStateManager, VisualStateManager);
        static GetCustomVisualStateManager(d: DependencyObject): VisualStateManager { return d.GetValue(CustomVisualStateManagerProperty); }
        static SetCustomVisualStateManager(d: DependencyObject, value: VisualStateManager) { d.SetValue(CustomVisualStateManagerProperty, value); }
        static GoToState(control: Controls.Control, stateName: string, useTransitions: bool): bool {
            var root = VisualStateManager._GetTemplateRoot(control);
            if (!root)
                return false;
            var groups = VisualStateManager._GetVisualStateGroupsInternal(root);
            if (!groups)
                return false;
            var data: IStateData = { group: null, state: null };
            if (!VisualStateManager._TryGetState(groups, stateName, data))
                return false;
            var customVsm = VisualStateManager.GetCustomVisualStateManager(root);
            if (customVsm) {
                return customVsm.GoToStateCore(control, root, stateName, data.group, data.state, useTransitions);
            } else if (data.state != null) {
                return VisualStateManager.GoToStateInternal(control, root, data.group, data.state, useTransitions);
            }
            return false;
        }
        GoToStateCore(control: Controls.Control, element: FrameworkElement, stateName: string, group: VisualStateGroup, state: VisualState, useTransitions: bool): bool {
            return VisualStateManager.GoToStateInternal(control, element, group, state, useTransitions);
        }
        private static GoToStateInternal(control: Controls.Control, element: FrameworkElement, group: VisualStateGroup, state: VisualState, useTransitions: bool): bool {
            var lastState = group.CurrentState;
            if (lastState === state)
                return true;
            var transition = useTransitions ? VisualStateManager._GetTransition(element, group, lastState, state) : null;
            var storyboard;
            if (transition == null || (transition.GeneratedDuration.IsZero() && ((storyboard = transition.Storyboard) == null || storyboard.Duration.IsZero()))) {
                if (transition != null && storyboard != null) {
                    group.StartNewThenStopOld(element, [storyboard, state.Storyboard]);
                } else {
                    group.StartNewThenStopOld(element, [state.Storyboard]);
                }
                group.RaiseCurrentStateChanging(element, lastState, state, control);
                group.RaiseCurrentStateChanged(element, lastState, state, control);
            } else {
                var dynamicTransition = VisualStateManager._GenerateDynamicTransitionAnimations(element, group, state, transition);
                transition.DynamicStoryboardCompleted = false;
                var dynamicCompleted = function (sender, e) {
                    if (transition.Storyboard == null || transition.ExplicitStoryboardCompleted === true) {
                        group.StartNewThenStopOld(element, [state.Storyboard]);
                        group.RaiseCurrentStateChanged(element, lastState, state, control);
                    }
                    transition.DynamicStoryboardCompleted = true;
                };
                var eventClosure = {};
                dynamicTransition.Completed.Subscribe(dynamicCompleted, eventClosure);
                if (transition.Storyboard != null && transition.ExplicitStoryboardCompleted === true) {
                    var transitionCompleted = function (sender, e) {
                        if (transition.DynamicStoryboardCompleted === true) {
                            group.StartNewThenStopOld(element, [state.Storyboard]);
                            group.RaiseCurrentStateChanged(element, lastState, state, control);
                        }
                        transition.Storyboard.Completed.Unsubscribe(transitionCompleted, eventClosure);
                        transition.ExplicitStoryboardCompleted = true;
                    };
                    transition.ExplicitStoryboardCompleted = false;
                    transition.Storyboard.Completed.Subscribe(transitionCompleted, eventClosure);
                }
                group.StartNewThenStopOld(element, [transition.Storyboard, dynamicTransition]);
                group.RaiseCurrentStateChanging(element, lastState, state, control);
            }
            group.CurrentState = state;
            return true;
        }
        private static DestroyStoryboards(control: Controls.Control, root: FrameworkElement) {
            if (!root)
                return false;
            var groups = VisualStateManager._GetVisualStateGroupsInternal(root);
            if (!groups)
                return false;
            var enumerator = groups.GetEnumerator();
            while (enumerator.MoveNext()) {
                (<VisualStateGroup>enumerator.Current).StopCurrentStoryboards(root);
            }
        }
        private static _GetTemplateRoot(control: Controls.Control): FrameworkElement {
            if (control instanceof Controls.UserControl)
                return (<Controls.UserControl>control).XamlNode.TemplateRoot;
            var enumerator = control.XamlNode.GetVisualTreeEnumerator();
            var node: FENode = null;
            if (enumerator.MoveNext()) {
                node = enumerator.Current;
                if (!(node instanceof FENode))
                    node = null;
            }
            return (node) ? node.XObject : null;
        }
        private static _TryGetState(groups: VisualStateGroupCollection, stateName: string, data: IStateData): bool {
            var enumerator = groups.GetEnumerator();
            while (enumerator.MoveNext()) {
                data.group = enumerator.Current;
                data.state = data.group.GetState(stateName);
                if (data.state)
                    return true;
            }
            data.group = null;
            data.state = null;
            return false;
        }
        private static _GetTransition(element: FrameworkElement, group: VisualStateGroup, from: VisualState, to: VisualState): VisualTransition {
            if (!element)
                throw new ArgumentException("element");
            if (!group)
                throw new ArgumentException("group");
            if (!to)
                throw new ArgumentException("to");
            var best = null;
            var defaultTransition = null;
            var bestScore = -1;
            var transitions = group.Transitions;
            if (transitions) {
                var enumerator = ArrayEx.GetEnumerator(transitions);
                var transition: VisualTransition;
                while (enumerator.MoveNext()) {
                    transition = enumerator.Current;
                    if (!defaultTransition && transition.IsDefault) {
                        defaultTransition = transition;
                        continue;
                    }
                    var score = -1;
                    var transFromState = group.GetState(transition.From);
                    var transToState = group.GetState(transition.To);
                    if (from === transFromState)
                        score += 1;
                    else if (transFromState != null)
                        continue;
                    if (to === transToState)
                        score += 2;
                    else if (transToState != null)
                        continue;
                    if (score > bestScore) {
                        bestScore = score;
                        best = transition;
                    }
                }
            }
            if (best != null)
                return best;
            return defaultTransition;
        }
        private static _GenerateDynamicTransitionAnimations(root: FrameworkElement, group: VisualStateGroup, state: VisualState, transition: VisualTransition): Animation.Storyboard {
            var dynamic = new Animation.Storyboard();
            if (transition != null) {
                dynamic.Duration = transition.GeneratedDuration;
            } else {
                dynamic.Duration = Duration.CreateTimeSpan(new TimeSpan());
            }
            var currentAnimations; //FlattenTimelines
            var transitionAnimations; //FlattenTimelines
            var newStateAnimations; //FlattenTimelines
            NotImplemented("VisualStateManager._GenerateDynamicTransitionAnimations");
            return dynamic;
        }
    }
}

module Fayde.Media.VSM {
    export class VisualTransition {
        From;
        To;
        Storyboard;
        GeneratedDuration;
        DynamicStoryboardCompleted;
        ExplicitStoryboardCompleted;
        GeneratedEasingFunction;
        IsDefault: bool = false;
    }
}

module Fayde.Shapes {
    export class DoubleCollection extends XamlObjectCollection {
    }
    Nullstone.RegisterType(DoubleCollection, "DoubleCollection");
}

module Fayde.Shapes {
    export class PointCollection implements IEnumerable {
        private _ht: Point[] = [];
        Owner: Shape;
        get Count() { return this._ht.length; }
        static FromData(data: string): PointCollection {
            var pc = new PointCollection();
            pc._ht.concat(Media.ParseShapePoints(data));
            return pc;
        }
        GetValueAt(index: number): Point { return this._ht[index]; }
        SetValueAt(index: number, value: Point): bool {
            if (index < 0 || index >= this._ht.length)
                return false;
            var removed = this._ht[index];
            var added = value;
            this._ht[index] = added;
            var owner = this.Owner;
            if (owner) owner._InvalidateNaturalBounds();
        }
        Add(value: Point) {
            this._ht.push(value);
            var owner = this.Owner;
            if (owner) owner._InvalidateNaturalBounds();
        }
        AddRange(points: Point[]) {
            this._ht.concat(points);
            var owner = this.Owner;
            if (owner) owner._InvalidateNaturalBounds();
        }
        Insert(index: number, value: Point) {
            if (index < 0)
                return;
            var len = this._ht.length;
            if (index > len)
                index = len;
            this._ht.splice(index, 0, value);
            var owner = this.Owner;
            if (owner) owner._InvalidateNaturalBounds();
        }
        Remove(value: Point) {
            var index = this.IndexOf(value);
            if (index === -1)
                return;
            this.RemoveAt(index);
            var owner = this.Owner;
            if (owner) owner._InvalidateNaturalBounds();
        }
        RemoveAt(index: number) {
            if (index < 0 || index >= this._ht.length)
                return;
            var value = this._ht.splice(index, 1)[0];
            var owner = this.Owner;
            if (owner) owner._InvalidateNaturalBounds();
        }
        Clear() {
            this._ht = [];
            var owner = this.Owner;
            if (owner) owner._InvalidateNaturalBounds();
        }
        IndexOf(value: Point): number {
            var count = this._ht.length;
            for (var i = 0; i < count; i++) {
                if (Nullstone.Equals(value, this._ht[i]))
                    return i;
            }
            return -1;
        }
        Contains(value: Point): bool { return this.IndexOf(value) > -1; }
        GetEnumerator(reverse?: bool): IEnumerator { return ArrayEx.GetEnumerator(this._ht, reverse); }
    }
    Nullstone.RegisterType(PointCollection, "PointCollection");
}

module Fayde.Controls {
    export interface IColumnDefinitionListener {
        ColumnDefinitionChanged(colDefinition: ColumnDefinition);
    }
    export class ColumnDefinition extends DependencyObject {
        static WidthProperty: DependencyProperty = DependencyProperty.RegisterCore("Width", () => GridLength, ColumnDefinition, undefined, (d, args) => (<ColumnDefinition>d)._WidthsChanged(args));
        static MaxWidthProperty: DependencyProperty = DependencyProperty.RegisterCore("MaxWidth", () => Number, ColumnDefinition, Number.POSITIVE_INFINITY, (d, args) => (<ColumnDefinition>d)._WidthsChanged(args));
        static MinWidthProperty: DependencyProperty = DependencyProperty.RegisterCore("MinWidth", () => Number, ColumnDefinition, 0.0, (d, args) => (<ColumnDefinition>d)._WidthsChanged(args));
        static ActualWidthProperty: DependencyProperty = DependencyProperty.RegisterReadOnlyCore("ActualWidth", () => Number, ColumnDefinition, 0.0, (d, args) => (<ColumnDefinition>d)._WidthsChanged(args));
        Width: GridLength;
        MaxWidth: number;
        MinWidth: number;
        ActualWidth: number;
        private _Listener: IColumnDefinitionListener;
        Listen(listener: IColumnDefinitionListener) { this._Listener = listener; }
        Unlisten(listener: IColumnDefinitionListener) { if (this._Listener === listener) this._Listener = null; }
        private _WidthsChanged(args: IDependencyPropertyChangedEventArgs) {
            var listener = this._Listener;
            if (listener) listener.ColumnDefinitionChanged(this);
        }
    }
    Nullstone.RegisterType(ColumnDefinition, "ColumnDefinition");
    export interface IColumnDefinitionsListener {
        ColumnDefinitionsChanged(colDefinitions: ColumnDefinitionCollection);
    }
    export class ColumnDefinitionCollection extends XamlObjectCollection implements IColumnDefinitionListener {
        private _Listener: IColumnDefinitionsListener;
        Listen(listener: IColumnDefinitionsListener) { this._Listener = listener; }
        Unlisten(listener: IColumnDefinitionsListener) { if (this._Listener === listener) this._Listener = null; }
        ColumnDefinitionChanged(colDefinition: ColumnDefinition) {
            var listener = this._Listener;
            if (listener) listener.ColumnDefinitionsChanged(this);
        }
        AddedToCollection(value: ColumnDefinition, error: BError): bool {
            if (!super.AddedToCollection(value, error))
                return false;
            value.Listen(this);
            var listener = this._Listener;
            if (listener) listener.ColumnDefinitionsChanged(this);
        }
        RemovedFromCollection(value: ColumnDefinition, isValueSafe: bool) {
            super.RemovedFromCollection(value, isValueSafe);
            value.Unlisten(this);
            var listener = this._Listener;
            if (listener) listener.ColumnDefinitionsChanged(this);
        }
    }
    Nullstone.RegisterType(ColumnDefinitionCollection, "ColumnDefinitionCollection");
}

module Fayde.Controls {
    export class ControlTemplate extends FrameworkTemplate {
        private _TempJson: any;
        private _ResChain: ResourceDictionary[];
        TargetType: Function;
        constructor(targetType: Function, json: any, resChain?: ResourceDictionary[]) {
            super();
            Object.defineProperty(this, "TargetType", {
                value: targetType,
                writable: false
            });
            this._TempJson = json;
            this._ResChain = resChain;
        }
        _GetVisualTreeWithError(templateBindingSource: FrameworkElement, error: BError): XamlObject {
            if (this._TempJson)
                return Fayde.JsonParser.Parse(this._TempJson, templateBindingSource, new Fayde.NameScope(), this._ResChain);
            return super._GetVisualTreeWithError(templateBindingSource, error);
        }
    }
    Nullstone.RegisterType(ControlTemplate, "ControlTemplate");
}

module Fayde.Controls {
    export class ItemsPanelTemplate extends FrameworkTemplate {
        private _TempJson: any;
        constructor(json: any) {
            super();
            this._TempJson = json;
        }
        private _GetVisualTreeWithError(templateBindingSource: DependencyObject, error: BError): XamlObject {
            if (this._TempJson)
                return JsonParser.Parse(this._TempJson, templateBindingSource, new NameScope());
            return super._GetVisualTreeWithError(templateBindingSource, error);
        }
    }
    Nullstone.RegisterType(ItemsPanelTemplate, "ItemsPanelTemplate");
}

module Fayde.Controls {
    export interface IRowDefinitionListener {
        RowDefinitionChanged(rowDefinition: RowDefinition);
    }
    export class RowDefinition extends DependencyObject {
        static HeightProperty: DependencyProperty = DependencyProperty.RegisterCore("Height", () => GridLength, RowDefinition, undefined, (d, args) => (<RowDefinition>d)._HeightsChanged(args));
        static MaxHeightProperty: DependencyProperty = DependencyProperty.RegisterCore("MaxHeight", () => Number, RowDefinition, Number.POSITIVE_INFINITY, (d, args) => (<RowDefinition>d)._HeightsChanged(args));
        static MinHeightProperty: DependencyProperty = DependencyProperty.RegisterCore("MinHeight", () => Number, RowDefinition, 0.0, (d, args) => (<RowDefinition>d)._HeightsChanged(args));
        static ActualHeightProperty: DependencyProperty = DependencyProperty.RegisterReadOnlyCore("ActualHeight", () => Number, RowDefinition, 0.0, (d, args) => (<RowDefinition>d)._HeightsChanged(args));
        Height: GridLength;
        MaxHeight: number;
        MinHeight: number;
        ActualHeight: number;
        private _Listener: IRowDefinitionListener;
        Listen(listener: IRowDefinitionListener) { this._Listener = listener; }
        Unlisten(listener: IRowDefinitionListener) { if (this._Listener === listener) this._Listener = null; }
        private _HeightsChanged(args: IDependencyPropertyChangedEventArgs) {
            var listener = this._Listener;
            if (listener) listener.RowDefinitionChanged(this);
        }
    }
    Nullstone.RegisterType(RowDefinition, "RowDefinition");
    export interface IRowDefinitionsListener {
        RowDefinitionsChanged(rowDefinitions: RowDefinitionCollection);
    }
    export class RowDefinitionCollection extends XamlObjectCollection implements IRowDefinitionListener {
        private _Listener: IRowDefinitionsListener;
        Listen(listener: IRowDefinitionsListener) { this._Listener = listener; }
        Unlisten(listener: IRowDefinitionsListener) { if (this._Listener === listener) this._Listener = null; }
        RowDefinitionChanged(rowDefinition: RowDefinition) {
            var listener = this._Listener;
            if (listener) listener.RowDefinitionsChanged(this);
        }
        AddedToCollection(value: RowDefinition, error: BError): bool {
            if (!super.AddedToCollection(value, error))
                return false;
            value.Listen(this);
            var listener = this._Listener;
            if (listener) listener.RowDefinitionsChanged(this);
        }
        RemovedFromCollection(value: RowDefinition, isValueSafe: bool) {
            super.RemovedFromCollection(value, isValueSafe);
            value.Unlisten(this);
            var listener = this._Listener;
            if (listener) listener.RowDefinitionsChanged(this);
        }
    }
    Nullstone.RegisterType(RowDefinitionCollection, "RowDefinitionCollection");
}

module Fayde {
    export class DataTemplate extends FrameworkTemplate {
        private _TempJson: any;
        private _ResChain: ResourceDictionary[];
        constructor(json: any, resChain: ResourceDictionary[]) {
            super();
            this._TempJson = json;
            this._ResChain = resChain;
        }
        _GetVisualTreeWithError(templateBindingSource: FrameworkElement, error: BError): XamlObject {
            if (this._TempJson)
                return JsonParser.Parse(this._TempJson, templateBindingSource);
            return super._GetVisualTreeWithError(templateBindingSource, error);
        }
    }
    Nullstone.RegisterType(DataTemplate, "DataTemplate");
}

module Fayde {
    export class ResourceDictionaryCollection extends XamlObjectCollection {
        AddedToCollection(value: ResourceDictionary, error: BError): bool {
            if (!super.AddedToCollection(value, error))
                return false;
            return this._AssertNoCycles(value, value.XamlNode.ParentNode, error);
        }
        private _AssertNoCycles(subtreeRoot: ResourceDictionary, firstAncestorNode: XamlNode, error: BError) {
            var curNode = firstAncestorNode;
            while (curNode) {
                var rd = <ResourceDictionary>curNode.XObject;
                if (rd instanceof ResourceDictionary) {
                    var cycleFound = false;
                    if (rd === subtreeRoot)
                        cycleFound = true;
                    else if (rd.Source === subtreeRoot.Source)
                        cycleFound = true;
                    if (cycleFound) {
                        error.Message = "Cycle found in resource dictionaries.";
                        error.Number = BError.InvalidOperation;
                        return false;
                    }
                }
                curNode = curNode.ParentNode;
            }
            var enumerator = subtreeRoot.MergedDictionaries.GetEnumerator();
            while (enumerator.MoveNext()) {
                if (!this._AssertNoCycles(enumerator.Current, firstAncestorNode, error))
                    return false;
            }
            return true;
        }
    }
    Nullstone.RegisterType(ResourceDictionaryCollection, "ResourceDictionaryCollection");
    export class ResourceDictionary extends XamlObjectCollection {
        private _KeyIndex: number[] = [];
        MergedDictionaries: ResourceDictionaryCollection;
        Source: string = "";
        constructor() {
            super();
            Object.defineProperty(this, "MergedDictionaries", {
                value: new ResourceDictionaryCollection(),
                writable: false
            });
        }
        ContainsKey(key: any): bool {
            if (typeof key === "string")
                return this._KeyIndex[key] !== undefined;
        }
        Get(key: any): XamlObject {
            var index: number;
            if (typeof key === "string")
                index = this._KeyIndex[key];
            else
            var index = this._KeyIndex[key];
            if (index !== undefined)
                return this.GetValueAt(index);
            return this._GetFromMerged(key);
        }
        Set(key: any, value: XamlObject) {
            var oldValue;
            if (this.ContainsKey(key)) {
                oldValue = this.Get(key);
                this.Remove(oldValue);
            }
            var index = super.Add(value);
            this._KeyIndex[key] = index;
            this._RaiseItemReplaced(oldValue, value, index);
            return true;
        }
        Add(value: XamlObject): number {
            throw new InvalidOperationException("Cannot add to ResourceDictionary. Use Set instead.");
        }
        Remove(value: XamlObject): bool {
            throw new InvalidOperationException("Cannot remove from ResourceDictionary. Use Set instead.");
        }
        private _GetFromMerged(key: any): XamlObject {
            var merged = this.MergedDictionaries;
            if (!merged)
                return undefined;
            var enumerator = merged.GetEnumerator();
            var cur;
            while (enumerator.MoveNext()) {
                cur = (<ResourceDictionary>enumerator.Current).Get(key);
                if (cur !== undefined)
                    return cur;
            }
            return undefined;
        }
    }
    Nullstone.RegisterType(ResourceDictionary, "ResourceDictionary");
}

module Fayde {
    export class SetterCollection extends XamlObjectCollection {
        private _IsSealed: bool = false;
        _Seal(targetType: Function) {
            if (this._IsSealed)
                return;
            var enumerator = this.GetEnumerator();
            while (enumerator.MoveNext()) {
                (<Setter>enumerator.Current)._Seal(targetType);
            }
            this._IsSealed = true;
        }
        AddedToCollection(value: XamlObject, error: BError): bool {
            if (!value || !this._ValidateSetter(<Setter>value, error))
                return false;
            return super.AddedToCollection(value, error);
        }
        private _ValidateSetter(setter: Setter, error: BError) {
            if (setter.Property === undefined) {
                error.Message = "Cannot have a null PropertyProperty value";
                return false;
            }
            if (setter.Value === undefined) {
                error.Message = "Cannot have a null ValueProperty value";
                return false;
            }
            if (this._IsSealed) {
                error.Message = "Cannot add a setter to a sealed style";
                return false;
            }
            return true;
        }
    }
    Nullstone.RegisterType(SetterCollection, "SetterCollection");
    export class Setter extends XamlObject {
        private _IsSealed: bool = false;
        static PropertyProperty: DependencyProperty = DependencyProperty.RegisterCore("Property", () => DependencyProperty, Setter);
        static ValueProperty: DependencyProperty = DependencyProperty.RegisterCore("Value", () => Object, Setter);
        Property: DependencyProperty;
        Value: any;
        ConvertedValue: any;
        _Seal(targetType: Function) {
            var propd = this.Property;
            var val = this.Value;
            if (typeof propd.GetTargetType() === "string") {
                if (typeof val !== "string")
                    throw new XamlParseException("Setter value does not match property type.");
            }
            try {
                this.ConvertedValue = Fayde.TypeConverter.ConvertObject(propd, val, targetType, true);
            } catch (err) {
                throw new XamlParseException(err.message);
            }
            this._IsSealed = true;
        }
    }
    Nullstone.RegisterType(Setter, "Setter");
}

module Fayde {
    export class UINode extends DONode {
        XObject: UIElement;
        LayoutUpdater: LayoutUpdater;
        IsTopLevel: bool = false;
        private _Surface: Surface;
        SetSurfaceFromVisualParent(): UINode {
            if (this._Surface)
                return;
            var vpNode = this.VisualParentNode;
            if (vpNode)
                this.SetSurface(vpNode._Surface);
            return vpNode;
        }
        SetSurface(surface: Surface) {
            this._Surface = surface;
            this.LayoutUpdater.Surface = surface;
        }
        constructor(xobj: UIElement) {
            super(xobj);
            this.LayoutUpdater = new LayoutUpdater(this);
            this.LayoutUpdater.SetContainerMode(false);
        }
        VisualParentNode: UINode;
        GetVisualRoot(): UINode {
            var curNode = this;
            var vpNode: UINode;
            while (vpNode = curNode.VisualParentNode) {
                curNode = vpNode;
            }
            return curNode;
        }
        GetInheritedEnumerator(): IEnumerator {
            return this.GetVisualTreeEnumerator(VisualTreeDirection.Logical);
        }
        OnIsAttachedChanged(newIsAttached: bool) {
            var vpNode: UINode = null;
            if (newIsAttached)
                vpNode = this.SetSurfaceFromVisualParent();
            this.LayoutUpdater.OnIsAttachedChanged(newIsAttached, vpNode);
            super.OnIsAttachedChanged(newIsAttached);
        }
        IsLoaded: bool = false;
        SetIsLoaded(value: bool) { }
        OnVisualChildAttached(uie: UIElement) {
            var lu = this.LayoutUpdater;
            lu.UpdateBounds(true);
            lu.InvalidateMeasure();
            lu.PreviousConstraint = undefined;
            var un = uie.XamlNode;
            un.SetVisualParentNode(this);
            this.XObject._Store.PropagateInheritedOnAdd(un);
            un.LayoutUpdater.OnAddedToTree();
        }
        OnVisualChildDetached(uie: UIElement) {
            var lu = this.LayoutUpdater;
            var un = uie.XamlNode;
            lu.Invalidate(un.LayoutUpdater.SurfaceBoundsWithChildren);
            lu.InvalidateMeasure();
            un.SetVisualParentNode(null);
            un.LayoutUpdater.OnRemovedFromTree();
            this.XObject._Store.ClearInheritedOnRemove(un);
        }
        private SetVisualParentNode(visualParentNode: UINode) {
            if (this.VisualParentNode === visualParentNode)
                return;
            this.VisualParentNode = visualParentNode;
            if (visualParentNode) {
                this.SetSurface(visualParentNode._Surface);
            } else {
                this.SetSurface(null);
            }
        }
        Focus(): bool { return false; }
        _EmitFocusChange(type: string) {
            if (type === "got")
                this._EmitGotFocus();
            else if (type === "lost")
                this._EmitLostFocus();
        }
        private _EmitLostFocus() {
            var e = new Fayde.RoutedEventArgs();
            var x = this.XObject;
            x.OnLostFocus(e);
            x.LostFocus.Raise(x, e);
        }
        private _EmitGotFocus() {
            var e = new Fayde.RoutedEventArgs();
            var x = this.XObject;
            x.OnGotFocus(e);
            x.GotFocus.Raise(x, e);
        }
        _EmitKeyDown(args: Fayde.Input.KeyEventArgs) {
            var x = this.XObject;
            x.OnKeyDown(args);
            x.KeyDown.Raise(x, args);
        }
        _EmitKeyUp(args: Fayde.Input.KeyEventArgs) {
            var x = this.XObject;
            x.OnKeyUp(args);
            x.KeyUp.Raise(x, args);
        }
        _EmitLostMouseCapture(pos: Point) {
            var x = this.XObject;
            var e = new Input.MouseEventArgs(pos);
            x.OnLostMouseCapture(e);
            x.LostMouseCapture.Raise(x, e);
        }
        _EmitMouseEvent(type: InputType, isLeftButton: bool, isRightButton: bool, args: Input.MouseEventArgs): bool {
            var x = this.XObject;
            switch (type) {
                case InputType.MouseUp:
                    if (isLeftButton) {
                        x.OnMouseLeftButtonUp(<Input.MouseButtonEventArgs>args);
                        x.MouseLeftButtonUp.Raise(x, args);
                    } else if (isRightButton) {
                        x.OnMouseRightButtonUp(<Input.MouseButtonEventArgs>args);
                        x.MouseRightButtonUp.Raise(x, args);
                    }
                    break;
                case InputType.MouseDown:
                    if (isLeftButton) {
                        x.OnMouseLeftButtonDown(<Input.MouseButtonEventArgs>args);
                        x.MouseLeftButtonDown.Raise(x, args);
                    } else if (isRightButton) {
                        x.OnMouseRightButtonDown(<Input.MouseButtonEventArgs>args);
                        x.MouseRightButtonDown.Raise(x, args);
                    }
                    break;
                case InputType.MouseLeave:
                    (<any>x)._IsMouseOver = false;
                    x.OnMouseLeave(args);
                    x.MouseLeave.Raise(x, args);
                    break;
                case InputType.MouseEnter:
                    (<any>x)._IsMouseOver = true;
                    x.OnMouseEnter(args);
                    x.MouseEnter.Raise(x, args);
                    break;
                case InputType.MouseMove:
                    x.OnMouseMove(args);
                    x.MouseMove.Raise(x, args);
                    break;
                case InputType.MouseWheel:
                    x.OnMouseWheel(<Input.MouseWheelEventArgs>args);
                    x.MouseWheel.Raise(x, args);
                    break;
                default:
                    return false;
            }
            return args.Handled;
        }
        FindElementsInHostCoordinates(intersectingPoint: Point): Fayde.UINode[] {
            var uinlist: UINode[] = [];
            this._FindElementsInHostCoordinates(this._Surface.TestRenderContext, intersectingPoint, uinlist);
            return uinlist;
        }
        _FindElementsInHostCoordinates(ctx: RenderContext, p: Point, uinlist: UINode[]) {
            uinlist.unshift(this);
        }
        _HitTestPoint(ctx: RenderContext, p: Point, uinlist: UINode[]) {
            uinlist.unshift(this);
        }
        _InsideClip(ctx: RenderContext, lu: LayoutUpdater, x: number, y: number): bool {
            var clip = this.XObject.Clip;
            if (!clip)
                return true;
            var np = new Point(x, y);
            lu.TransformPoint(np);
            if (!rect.containsPoint(clip.GetBounds(), np))
                return false;
            return ctx.IsPointInClipPath(clip, np);
        }
        CanCaptureMouse(): bool { return true; }
        CaptureMouse(): bool {
            if (!this.IsAttached)
                return false;
            this._Surface.SetMouseCapture(this);
            return true;
        }
        ReleaseMouseCapture() {
            if (!this.IsAttached)
                return;
            this._Surface.ReleaseMouseCapture(this);
        }
        _ResortChildrenByZIndex() {
            Warn("_Dirty.ChildrenZIndices only applies to Panel subclasses");
        }
        InvalidateParent(r: rect) {
            var vpNode = this.VisualParentNode;
            if (vpNode)
                vpNode.LayoutUpdater.Invalidate(r);
            else if (this.IsAttached)
                this._Surface._Invalidate(r);
        }
        InvalidateClip(oldClip: Media.Geometry, newClip: Media.Geometry) {
            var lu = this.LayoutUpdater;
            if (!newClip)
                rect.clear(lu.ClipBounds);
            else
                rect.copyTo(newClip.GetBounds(), lu.ClipBounds);
            this.InvalidateParent(lu.SurfaceBoundsWithChildren);
            lu.UpdateBounds(true);
            lu.ComputeComposite();
        }
        InvalidateEffect(oldEffect: Media.Effects.Effect, newEffect: Media.Effects.Effect) {
            var lu = this.LayoutUpdater;
            var changed = (newEffect) ? newEffect.GetPadding(lu.EffectPadding) : false;
            this.InvalidateParent(lu.SurfaceBoundsWithChildren);
            if (changed)
                lu.UpdateBounds();
            lu.ComputeComposite();
            if (oldEffect !== newEffect && this.IsAttached)
                this._Surface._AddDirtyElement(this.LayoutUpdater, _Dirty.Transform);
        }
        InvalidateOpacity() {
            var lu = this.LayoutUpdater;
            lu.UpdateTotalRenderVisibility();
            this.InvalidateParent(lu.SurfaceBoundsWithChildren);
        }
        InvalidateVisibility(newVisibility: Visibility) {
            var lu = this.LayoutUpdater;
            if (newVisibility === Visibility.Visible)
                lu.Flags |= UIElementFlags.RenderVisible;
            else
                lu.Flags &= ~UIElementFlags.RenderVisible;
            lu.UpdateTotalRenderVisibility();
            this.InvalidateParent(lu.SurfaceBoundsWithChildren);
            lu.InvalidateMeasure();
            var vpNode = this.VisualParentNode;
            if (vpNode)
                vpNode.LayoutUpdater.InvalidateMeasure();
            var surface = this._Surface;
            if (surface) surface._RemoveFocusFrom(lu);
        }
        IsAncestorOf(uin: UINode) {
            var vpNode = uin;
            while (vpNode && vpNode !== this)
                vpNode = vpNode.VisualParentNode;
            return vpNode === this;
        }
        TranformToVisual(uin: UINode): Media.GeneralTransform {
            if (uin && !uin.IsAttached)
                throw new ArgumentException("UIElement not attached.");
            var curNode = this;
            var ok = false;
            var surface = this._Surface;
            if (this.IsAttached) {
                while (curNode) {
                    if (curNode.IsTopLevel)
                        ok = true;
                    curNode = curNode.VisualParentNode;
                }
            }
            if (!ok)
                throw new ArgumentException("UIElement not attached.");
            if (uin && !uin.IsTopLevel) {
                ok = false;
                curNode = uin.VisualParentNode;
                if (curNode && uin.IsAttached) {
                    while (curNode) {
                        if (curNode.IsTopLevel)
                            ok = true;
                        curNode.VisualParentNode;
                    }
                }
                if (!ok)
                    throw new ArgumentException("UIElement not attached.");
            }
            return this.LayoutUpdater.TransformToVisual(uin);
        }
    }
    Nullstone.RegisterType(UINode, "UINode");
    export class UIElement extends DependencyObject {
        XamlNode: UINode;
        _Store: Providers.InheritedProviderStore;
        private _ClipListener: Media.IGeometryListener = null;
        private _EffectListener: Media.Effects.IEffectListener = null;
        CreateStore(): Providers.InheritedProviderStore {
            var s = new Providers.InheritedProviderStore(this);
            s.SetProviders([null, 
                new Providers.LocalValueProvider(), 
                null,
                null,
                null,
                new Providers.InheritedProvider(),
                null,
                new Providers.DefaultValueProvider(),
                new Providers.AutoCreateProvider()]
            );
            return s;
        }
        CreateNode(): UINode { return new UINode(this); }
        static AllowDropProperty: DependencyProperty;
        static CacheModeProperty: DependencyProperty;
        static ClipProperty = DependencyProperty.RegisterCore("Clip", function () { return Media.Geometry; }, UIElement, undefined, (d, args) => (<UIElement>d)._ClipChanged(args));
        static EffectProperty = DependencyProperty.Register("Effect", function () { return Media.Effects.Effect; }, UIElement, undefined, (d, args) => (<UIElement>d)._EffectChanged(args));
        static IsHitTestVisibleProperty = DependencyProperty.RegisterCore("IsHitTestVisible", function () { return Boolean; }, UIElement, true, (d, args) => (<UIElement>d)._IsHitTestVisibleChanged(args));
        static OpacityMaskProperty = DependencyProperty.RegisterCore("OpacityMask", function () { return Media.Brush; }, UIElement);
        static OpacityProperty = DependencyProperty.RegisterCore("Opacity", function () { return Number; }, UIElement, 1.0, (d, args) => (<UIElement>d).XamlNode.InvalidateOpacity());
        static ProjectionProperty = DependencyProperty.Register("Projection", function () { return Media.Projection; }, UIElement, undefined, (d, args) => (<UIElement>d).XamlNode.LayoutUpdater.UpdateProjection());
        static RenderTransformProperty = DependencyProperty.Register("RenderTransform", function () { return Media.Transform; }, UIElement, undefined, (d, args) => (<UIElement>d).XamlNode.LayoutUpdater.UpdateTransform());
        static RenderTransformOriginProperty = DependencyProperty.Register("RenderTransformOrigin", function () { return Point; }, UIElement, undefined, (d, args) => (<UIElement>d).XamlNode.LayoutUpdater.UpdateTransform());
        static TagProperty = DependencyProperty.Register("Tag", function () { return Object; }, UIElement);
        static UseLayoutRoundingProperty = DependencyProperty.RegisterInheritable("UseLayoutRounding", function () { return Boolean; }, UIElement, true, (d, args) => (<UIElement>d)._UseLayoutRoundingChanged(args), undefined, Providers._Inheritable.UseLayoutRounding);
        static VisibilityProperty = DependencyProperty.RegisterCore("Visibility", function () { return new Enum(Visibility); }, UIElement, Visibility.Visible, (d, args) => (<UIElement>d).XamlNode.InvalidateVisibility(args.NewValue));
        private _IsMouseOver: bool = false;
        get IsMouseOver() { return this._IsMouseOver; }
        get DesiredSize(): size { return this.XamlNode.LayoutUpdater.DesiredSize; }
        get RenderSize(): size { return this.XamlNode.LayoutUpdater.RenderSize; }
        Clip: Media.Geometry;
        Effect: Media.Effects.Effect;
        IsHitTestVisible: bool;
        Cursor: string;
        OpacityMask: Media.Brush;
        Opacity: number;
        Projection: Media.Projection;
        RenderTransform: Media.Transform;
        RenderTransformOrigin: Point;
        Tag: any;
        UseLayoutRounding: bool;
        Visibility: Visibility;
        Focus(): bool { return this.XamlNode.Focus(); }
        CaptureMouse():bool { return this.XamlNode.CaptureMouse(); }
        ReleaseMouseCapture() { this.XamlNode.ReleaseMouseCapture(); }
        TranformToVisual(uie: UIElement): Media.GeneralTransform {
            var uin = (uie) ? uie.XamlNode : null;
            return this.XamlNode.TranformToVisual(uin);
        }
        Measure(availableSize: size) {
        }
        Arrange(finalRect: rect) {
        }
        LostFocus: RoutedEvent = new RoutedEvent();
        GotFocus: RoutedEvent = new RoutedEvent();
        LostMouseCapture: RoutedEvent = new RoutedEvent();
        KeyDown: MulticastEvent = new MulticastEvent();
        KeyUp: MulticastEvent = new MulticastEvent();
        MouseLeftButtonUp: RoutedEvent = new RoutedEvent();
        MouseRightButtonUp: RoutedEvent = new RoutedEvent();
        MouseLeftButtonDown: RoutedEvent = new RoutedEvent();
        MouseRightButtonDown: RoutedEvent = new RoutedEvent();
        MouseLeave: RoutedEvent = new RoutedEvent();
        MouseEnter: RoutedEvent = new RoutedEvent();
        MouseMove: RoutedEvent = new RoutedEvent();
        MouseWheel: RoutedEvent = new RoutedEvent();
        OnGotFocus(e: RoutedEventArgs) { }
        OnLostFocus(e: RoutedEventArgs) { }
        OnLostMouseCapture(e: Input.MouseEventArgs) { }
        OnKeyDown(e: Input.KeyEventArgs) { }
        OnKeyUp(e: Input.KeyEventArgs) { }
        OnMouseEnter(e: Input.MouseEventArgs) { }
        OnMouseLeave(e: Input.MouseEventArgs) { }
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) { }
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs) { }
        OnMouseMove(e: Input.MouseEventArgs) { }
        OnMouseRightButtonDown(e: Input.MouseButtonEventArgs) { }
        OnMouseRightButtonUp(e: Input.MouseButtonEventArgs) { }
        OnMouseWheel(e: Input.MouseWheelEventArgs) { }
        private _ClipChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldClip: Media.Geometry = args.OldValue;
            var newClip: Media.Geometry = args.NewValue;
            this.XamlNode.InvalidateClip(oldClip, newClip);
            if (oldClip == newClip)
                return;
            if (oldClip)
                oldClip.Unlisten(this._ClipListener);
            if (newClip) {
                if (!this._ClipListener)
                    this._ClipListener = { GeometryChanged: (newGeometry: Media.Geometry) => this.XamlNode.InvalidateClip(newGeometry, newGeometry) };
                newClip.Listen(this._ClipListener);
            }
        }
        private _EffectChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldEffect: Media.Effects.Effect = args.OldValue;
            var newEffect: Media.Effects.Effect = args.NewValue;
            this.XamlNode.InvalidateEffect(oldEffect, newEffect);
            if (oldEffect === newEffect)
                return;
            if (oldEffect)
                oldEffect.Unlisten(this._EffectListener);
            if (newEffect) {
                if (!this._EffectListener)
                    this._EffectListener = { EffectChanged: (effect: Media.Effects.Effect) => this.XamlNode.InvalidateEffect(effect, effect) };
                newEffect.Listen(this._EffectListener);
            }
        }
        private _UseLayoutRoundingChanged(args: IDependencyPropertyChangedEventArgs) {
            var lu = this.XamlNode.LayoutUpdater;
            lu.InvalidateMeasure();
            lu.InvalidateArrange();
        }
        private _IsHitTestVisibleChanged(args: IDependencyPropertyChangedEventArgs) {
            var lu = this.XamlNode.LayoutUpdater;
            if (args.NewValue === true) {
                lu.Flags |= UIElementFlags.HitTestVisible;
            } else {
                lu.Flags &= ~UIElementFlags.HitTestVisible;
            }
            lu.UpdateTotalHitTestVisibility();
        }
    }
    Nullstone.RegisterType(UIElement, "UIElement");
}

module Fayde.Providers {
    export interface IInheritedIsEnabledProvider extends IPropertyProvider {
        LocalValueChanged(propd?: DependencyProperty): bool;
        SetDataSource(source: DependencyObject);
    }
    export class ControlProviderStore extends FrameworkProviderStore {
        constructor(dobj: DependencyObject) {
            super(dobj);
        }
        SetProviders(providerArr: IPropertyProvider[]) {
            this._InheritedIsEnabledProvider = this._Providers[0] = <IInheritedIsEnabledProvider>providerArr[0];
            this._LocalValueProvider = this._Providers[1] = <LocalValueProvider>providerArr[1];
            this._DynamicValueProvider = this._Providers[2] = providerArr[2];
            this._LocalStyleProvider = this._Providers[3] = providerArr[3];
            this._ImplicitStyleProvider = this._Providers[4] = providerArr[4];
            this._InheritedProvider = this._Providers[5] = <IInheritedProvider>providerArr[5];
            this._InheritedDataContextProvider = this._Providers[6] = providerArr[6];
            this._DefaultValueProvider = this._Providers[7] = <DefaultValueProvider>providerArr[7];
            this._AutoCreateProvider = this._Providers[8] = <AutoCreateProvider>providerArr[8];
        }
        private _Providers: IPropertyProvider[];
        private _InheritedIsEnabledProvider: IInheritedIsEnabledProvider;
        private _LocalValueProvider: LocalValueProvider;
        private _DynamicValueProvider: IPropertyProvider;
        private _LocalStyleProvider: IPropertyProvider;
        private _ImplicitStyleProvider: IPropertyProvider;
        private _InheritedProvider: IInheritedProvider;
        private _InheritedDataContextProvider: IPropertyProvider;
        private _DefaultValueProvider: DefaultValueProvider;
        private _AutoCreateProvider: AutoCreateProvider;
        _PostProviderValueChanged(providerPrecedence: number, propd: DependencyProperty, oldValue: any, newValue: any, notifyListeners: bool, error: BError) {
            var iiep: IInheritedIsEnabledProvider;
            if (providerPrecedence !== _PropertyPrecedence.IsEnabled && (iiep = this._InheritedIsEnabledProvider) && iiep.LocalValueChanged(propd))
                return;
            super._PostProviderValueChanged(providerPrecedence, propd, oldValue, newValue, notifyListeners, error);
        }
        SetIsEnabledSource(source: DependencyObject) {
            this._InheritedIsEnabledProvider.SetDataSource(source);
        }
    }
    Nullstone.RegisterType(ControlProviderStore, "ControlProviderStore");
}

module Fayde.Documents {
    export class Block extends TextElement {
    }
    Nullstone.RegisterType(Block, "Block");
}

module Fayde.Documents {
    export interface IInlinesChangedListener {
        InlinesChanged(newInline: Inline, isAdd: bool);
    }
    export class Inline extends TextElement {
        Autogen: bool = false;
    }
    Nullstone.RegisterType(Inline, "Inline");
    export class InlineCollection extends XamlObjectCollection {
        private _Listener: IInlinesChangedListener;
        Listen(listener: IInlinesChangedListener) { this._Listener = listener; }
        Unlisten(listener: IInlinesChangedListener) { if (this._Listener === listener) this._Listener = null; }
        AddedToCollection(value: Inline, error: BError): bool {
            if (!super.AddedToCollection(value, error))
                return false;
            var listener = this._Listener;
            if (listener) listener.InlinesChanged(value, true);
            return true;
        }
        RemovedFromCollection(value: Inline, isValueSafe: bool) {
            super.RemovedFromCollection(value, isValueSafe);
            var listener = this._Listener;
            if (listener) listener.InlinesChanged(value, false);
        }
    }
    Nullstone.RegisterType(InlineCollection, "InlineCollection");
}

module Fayde.Documents {
    export class LineBreak extends Inline {
    }
    Nullstone.RegisterType(LineBreak, "LineBreak");
}

module Fayde.Documents {
    export class Paragraph extends Block {
        static InlinesProperty;
        CreateNode(): TextElementNode {
            return new TextElementNode(this, Paragraph.InlinesProperty)
        }
    }
    Nullstone.RegisterType(Paragraph, "Paragraph");
}

module Fayde.Documents {
    export class Run extends Inline {
        static FlowDirectionProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FlowDirection", () => new Enum(FlowDirection), Run, FlowDirection.LeftToRight, undefined, undefined, Providers._Inheritable.FlowDirection);
        static TextProperty: DependencyProperty = DependencyProperty.Register("Text", () => String, Run);
        FlowDirection: FlowDirection;
        Text: string;
        _SerializeText(): string { return this.Text; }
    }
    Nullstone.RegisterType(Run, "Run");
}

module Fayde.Documents {
    export class Section extends TextElement {
        static BlocksProperty;
        CreateNode(): TextElementNode {
            return new TextElementNode(this, Section.BlocksProperty);
        }
    }
    Nullstone.RegisterType(Section, "Section");
}

module Fayde.Documents {
    export class Span extends Inline {
        static InlinesProperty;
        Inlines: XamlObjectCollection;
        CreateNode(): TextElementNode {
            return new TextElementNode(this, Span.InlinesProperty);
        }
    }
    Nullstone.RegisterType(Span, "Span");
}

module Fayde.Documents {
    export class Underline extends Span {
    }
    Nullstone.RegisterType(Underline, "Underline");
}

module Fayde.Media {
    export interface IBrushChangedListener {
        BrushChanged(newBrush: Brush);
    }
    export class Brush extends DependencyObject implements ITransformChangedListener {
        static TransformProperty: DependencyProperty = DependencyProperty.RegisterCore("Transform", () => Fayde.Media.Transform, Brush, undefined, (d, args) => (<Brush>d)._TransformChanged(args));
        Transform: Fayde.Media.Transform;
        private _CachedBounds: rect = null;
        private _CachedBrush: any = null;
        private _Listener: IBrushChangedListener = null;
        SetupBrush(ctx: CanvasRenderingContext2D, bounds: rect) {
            if (this._CachedBrush && this._CachedBounds && rect.isEqual(this._CachedBounds, bounds))
                return;
            this._CachedBounds = bounds;
            var transform = this.Transform;
            if (transform) {
                var transformedBounds = transform.TransformBounds(bounds);
                var raw = transform.Value._Raw;
                var tmpBrush = this.CreateBrush(ctx, bounds);
                var fillExtents = rect.clone(bounds);
                rect.growBy(fillExtents, raw[2], raw[5], 0, 0);
                var tmpCanvas = <HTMLCanvasElement>document.createElement("canvas");
                tmpCanvas.width = Math.max(transformedBounds.Width, bounds.Width);
                tmpCanvas.height = Math.max(transformedBounds.Height, bounds.Height);
                var tmpCtx = tmpCanvas.getContext("2d");
                tmpCtx.setTransform(raw[0], raw[1], raw[3], raw[4], raw[2], raw[5]);
                tmpCtx.fillStyle = tmpBrush;
                tmpCtx.fillRect(fillExtents.X, fillExtents.Y, fillExtents.Width, fillExtents.Height);
                this._CachedBrush = ctx.createPattern(tmpCanvas, "no-repeat");
            } else {
                this._CachedBrush = this.CreateBrush(ctx, bounds);
            }
        }
        CreateBrush(ctx: CanvasRenderingContext2D, bounds: rect): any { return undefined; }
        ToHtml5Object(): any { return this._CachedBrush; }
        Listen(listener: IBrushChangedListener) { this._Listener = listener; }
        Unlisten(listener: IBrushChangedListener) { if (this._Listener === listener) this._Listener = null; }
        InvalidateBrush() {
            this._CachedBrush = null;
            this._CachedBounds = null;
            var listener = this._Listener;
            if (listener) listener.BrushChanged(this);
        }
        private TransformChanged(source: Transform) {
            this.InvalidateBrush();
        }
        private _TransformChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldt = <Transform>args.OldValue;
            var newt = <Transform>args.NewValue;
            if (oldt)
                oldt.Unlisten(this);
            if (newt)
                newt.Listen(this);
            this.InvalidateBrush();
        }
    }
    Nullstone.RegisterType(Brush, "Brush");
}

module Fayde.Media {
    export class EllipseGeometry extends Geometry {
        static CenterProperty: DependencyProperty = DependencyProperty.Register("Center", () => Point, EllipseGeometry, undefined, (d, args) => (<Geometry>d)._InvalidateGeometry());
        static RadiusXProperty: DependencyProperty = DependencyProperty.Register("RadiusX", () => Number, EllipseGeometry, 0.0, (d, args) => (<Geometry>d)._InvalidateGeometry());
        static RadiusYProperty: DependencyProperty = DependencyProperty.Register("RadiusY", () => Number, EllipseGeometry, 0.0, (d, args) => (<Geometry>d)._InvalidateGeometry());
        Center: Point;
        RadiusX: number;
        RadiusY: number;
        private _Build(): Shapes.RawPath {
            var rx = this.RadiusX;
            var ry = this.RadiusY;
            var center = this.Center;
            var x = center ? center.X : 0.0;
            var y = center ? center.Y : 0.0;
            var p = new Shapes.RawPath();
            p.Ellipse(x - rx, y - ry, rx * 2.0, ry * 2.0);
            return p;
        }
    }
    Nullstone.RegisterType(EllipseGeometry, "EllipseGeometry");
}

module Fayde.Media {
    export class GradientBrush extends Brush implements IGradientStopsListener {
        static MappingModeProperty = DependencyProperty.Register("MappingMode", () => new Enum(BrushMappingMode), GradientBrush, BrushMappingMode.RelativeToBoundingBox, (d, args) => (<Brush>d).InvalidateBrush());
        static SpreadMethodProperty = DependencyProperty.Register("SpreadMethod", () => new Enum(GradientSpreadMethod), GradientBrush, GradientSpreadMethod.Pad, (d, args) => (<Brush>d).InvalidateBrush());
        GradientStops: GradientStopCollection;
        MappingMode: BrushMappingMode;
        SpreadMethod: GradientSpreadMethod;
        static Annotations = { ContentProperty: "GradientStops" }
        constructor() {
            super();
            var coll = new GradientStopCollection();
            coll.Listen(this);
            Object.defineProperty(this, "GradientStops", {
                value: coll,
                writable: false
            });
        }
        private CreateBrush(ctx: CanvasRenderingContext2D, bounds: rect): any {
            var spread = this.SpreadMethod;
            switch (spread) {
                case GradientSpreadMethod.Pad:
                default:
                    return this._CreatePad(ctx, bounds);
                case GradientSpreadMethod.Repeat:
                    return this._CreateRepeat(ctx, bounds);
                case GradientSpreadMethod.Reflect:
                    return this._CreateReflect(ctx, bounds);
            }
        }
        _CreatePad(ctx: CanvasRenderingContext2D, bounds: rect) { }
        _CreateRepeat(ctx: CanvasRenderingContext2D, bounds: rect) { }
        _CreateReflect(ctx: CanvasRenderingContext2D, bounds: rect) { }
        _GetMappingModeTransform(bounds: rect): number[] {
            if (!bounds)
                return mat3.identity();
            if (this.MappingMode === BrushMappingMode.Absolute)
                return mat3.identity();
            return mat3.createScale(bounds.Width, bounds.Height);
        }
        private GradientStopsChanged(newGradientStops: GradientStopCollection) { this.InvalidateBrush(); }
    }
    Nullstone.RegisterType(GradientBrush, "GradientBrush");
}

module Fayde.Media {
    export class LinearGradientBrush extends GradientBrush {
        static StartPointProperty: DependencyProperty = DependencyProperty.RegisterCore("StartPoint", () => Point, LinearGradientBrush, undefined, (d, args) => (<Brush>d).InvalidateBrush());
        static EndPointProperty: DependencyProperty = DependencyProperty.RegisterCore("EndPoint", () => Point, LinearGradientBrush, undefined, (d, args) => (<Brush>d).InvalidateBrush());
        StartPoint: Point;
        EndPoint: Point;
        private _CreatePad(ctx: CanvasRenderingContext2D, bounds: rect) {
            var data = this._GetPointData(bounds);
            var start = data.start;
            var end = data.end;
            var grd = ctx.createLinearGradient(start.X, start.Y, end.X, end.Y);
            var enumerator = this.GradientStops.GetEnumerator();
            while (enumerator.MoveNext()) {
                var stop: GradientStop = enumerator.Current;
                grd.addColorStop(stop.Offset, stop.Color.toString());
            }
            return grd;
        }
        private _CreateRepeat(ctx: CanvasRenderingContext2D, bounds: rect) {
            var data = this._GetPointData(bounds);
            var start = data.start;
            var end = data.end;
            var dir = { x: end.X - start.X, y: end.Y - start.Y };
            var first = { x: start.X, y: start.Y };
            var last = { x: end.X, y: end.Y };
            GradientMetrics.Calculate(dir, first, last, bounds);
            var grd = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
            var steps = (last.x - first.x) / dir.x;
            var curOffset = 0.0;
            for (var i = 0; i < steps; i++) {
                var enumerator = this.GradientStops.GetEnumerator();
                while (enumerator.MoveNext()) {
                    var stop: GradientStop = enumerator.Current;
                    grd.addColorStop(curOffset + (stop.Offset / steps), stop.Color.toString());
                }
                curOffset += (1.0 / steps);
            }
            return grd;
        }
        private _CreateReflect(ctx: CanvasRenderingContext2D, bounds: rect) {
            var data = this._GetPointData(bounds);
            var start = data.start;
            var end = data.end;
        }
        private _GetPointData(bounds: rect) {
            var transform = this._GetMappingModeTransform(bounds);
            var sp = this.StartPoint;
            var ep = this.EndPoint;
            var s = mat3.transformVec2(transform, vec2.createFrom(sp.X, sp.Y));
            var e = mat3.transformVec2(transform, vec2.createFrom(ep.X, ep.Y));
            return {
                start: new Point(s[0], s[1]),
                end: new Point(e[0], e[1])
            };
        }
        toString(): string {
            var enumerator = this.GradientStops.GetEnumerator();
            var ser = [];
            while (enumerator.MoveNext()) {
                ser.push(enumerator.Current.toString());
            }
            return "LinearGradientBrush(" + this.StartPoint.toString() + " --> " + this.EndPoint.toString() + " [" + ser.toString() + "])";
        }
    }
    Nullstone.RegisterType(LinearGradientBrush, "LinearGradientBrush");
}

module Fayde.Media {
    export class Matrix3DProjection extends Projection {
    }
    Nullstone.RegisterType(Matrix3DProjection, "Matrix3DProjection");
}

module Fayde.Media {
    export class RadialGradientBrush extends GradientBrush {
        static CenterProperty: DependencyProperty = DependencyProperty.RegisterCore("Center", () => Point, RadialGradientBrush, new Point(0.5, 0.5), (d, args) => (<Brush>d).InvalidateBrush());
        static GradientOriginProperty: DependencyProperty = DependencyProperty.RegisterCore("GradientOrigin", () => Point, RadialGradientBrush, new Point(0.5, 0.5), (d, args) => (<Brush>d).InvalidateBrush());
        static RadiusXProperty: DependencyProperty = DependencyProperty.RegisterCore("RadiusX", () => Number, RadialGradientBrush, 0.5, (d, args) => (<Brush>d).InvalidateBrush());
        static RadiusYProperty: DependencyProperty = DependencyProperty.RegisterCore("RadiusY", () => Number, RadialGradientBrush, 0.5, (d, args) => (<Brush>d).InvalidateBrush());
        Center: Point;
        GradientOrigin: Point;
        RadiusX: number;
        RadiusY: number;
        CreateBrush(ctx: CanvasRenderingContext2D, bounds: rect): any {
            return undefined;
        }
    }
    Nullstone.RegisterType(RadialGradientBrush, "RadialGradientBrush");
}

module Fayde.Media {
    export class SolidColorBrush extends Brush {
        static ColorProperty: DependencyProperty = DependencyProperty.Register("Color", () => Color, SolidColorBrush, undefined, (d, args) => (<Brush>d).InvalidateBrush());
        Color: Color;
        constructor() {
            super();
            if (arguments.length === 1 && arguments[0] instanceof Color)
                this.Color = arguments[0];
        }
        static FromColor(color: Color): SolidColorBrush {
            var scb = new SolidColorBrush();
            scb.Color = color;
            return scb;
        }
        private CreateBrush(ctx: CanvasRenderingContext2D, bounds: rect): any {
            var color = this.Color;
            if (!color)
                return "#000000";
            return color.toString();
        }
    }
    Nullstone.RegisterType(SolidColorBrush, "SolidColorBrush");
}

module Fayde.Media {
    function computeImageMatrix(width: number, height: number, sw: number, sh: number, stretch: Stretch, alignX: AlignmentX, alignY: AlignmentY): number[] {
        var sx = width / sw;
        var sy = height / sh;
        if (width === 0)
            sx = 1.0;
        if (height === 0)
            sy = 1.0;
        if (stretch === Stretch.Fill) {
            return mat3.createScale(sx, sy);
        }
        var scale = 1.0;
        var dx = 0.0;
        var dy = 0.0;
        switch (stretch) {
            case Stretch.Uniform:
                scale = sx < sy ? sx : sy;
                break;
            case Stretch.UniformToFill:
                scale = sx < sy ? sy : sx;
                break;
            case Stretch.None:
                break;
        }
        switch (alignX) {
            case AlignmentX.Left:
                dx = 0.0;
                break;
            case AlignmentX.Center:
                dx = (width - (scale * sw)) / 2;
                break;
            case AlignmentX.Right:
            default:
                dx = width - (scale * sw);
                break;
        }
        switch (alignY) {
            case AlignmentY.Top:
                dy = 0.0;
                break;
            case AlignmentY.Center:
                dy = (height - (scale * sh)) / 2;
                break;
            case AlignmentY.Bottom:
            default:
                dy = height - (scale * sh);
                break;
        }
        var m = mat3.createScale(scale, scale);
        mat3.translate(m, dx, dy);
        return m;
    }
    export class TileBrush extends Brush {
        static AlignmentXProperty: DependencyProperty = DependencyProperty.RegisterCore("AlignmentX", () => new Enum(AlignmentX), TileBrush, AlignmentX.Center, (d, args) => (<Brush>d).InvalidateBrush());
        static AlignmentYProperty: DependencyProperty = DependencyProperty.RegisterCore("AlignmentY", () => new Enum(AlignmentY), TileBrush, AlignmentY.Center, (d, args) => (<Brush>d).InvalidateBrush());
        static StretchProperty: DependencyProperty = DependencyProperty.RegisterCore("Stretch", () => new Enum(Stretch), TileBrush, Stretch.Fill, (d, args) => (<Brush>d).InvalidateBrush());
        AlignmentX: AlignmentX;
        AlignmentY: AlignmentY;
        Stretch: Stretch;
        CreateBrush(ctx: CanvasRenderingContext2D, bounds: rect) {
            var imgExtents = this.GetTileExtents();
            var tmpCanvas = <HTMLCanvasElement>document.createElement("canvas");
            tmpCanvas.width = bounds.Width;
            tmpCanvas.height = bounds.Height;
            var tmpCtx = tmpCanvas.getContext("2d");
            var mat = computeImageMatrix(bounds.Width, bounds.Height,
                imgExtents.Width, imgExtents.Height, this.Stretch, this.AlignmentX, this.AlignmentY);
            tmpCtx.setTransform(mat[0], mat[1], mat[3], mat[4], mat[2], mat[5]);
            this.DrawTile(tmpCtx, bounds);
            return ctx.createPattern(tmpCanvas, "no-repeat");
        }
        GetTileExtents(): rect { return undefined; }
        DrawTile(canvasCtx: CanvasRenderingContext2D, bounds: rect) { }
    }
    Nullstone.RegisterType(TileBrush, "TileBrush");
}

module Fayde.Media.Animation {
    export class AnimationBase extends Timeline {
        private _Storage: AnimationStorage;
        Resolve(target: DependencyObject, propd: DependencyProperty) { return true; }
        HookupStorage(targetObj: DependencyObject, targetProp: DependencyProperty): AnimationStorage {
            return (this._Storage = new AnimationStorage(this, targetObj, targetProp));
        }
        Disable() {
            var storage = this._Storage;
            if (storage)
                storage.Disable();
        }
        Stop() {
            var storage = this._Storage;
            if (storage)
                storage.Stop();
        }
        UpdateInternal(clockData: IClockData) {
            var storage = this._Storage;
            if (storage)
                storage.UpdateCurrentValueAndApply(clockData);
        }
        GetNaturalDurationCore(): Duration { return Duration.CreateTimeSpan(TimeSpan.FromArgs(0, 0, 0, 1)); }
        GetTargetValue(defaultOriginalValue: any): any { return undefined; }
        GetCurrentValue(defaultOriginalValue: any, defaultDestinationValue: any, clockData: IClockData): any { return undefined; }
    }
    Nullstone.RegisterType(AnimationBase, "AnimationBase");
}

module Fayde.Media.Animation {
    export class AnimationUsingKeyFrames extends AnimationBase {
        KeyFrames: KeyFrameCollection;
        constructor() {
            super();
            Object.defineProperty(this, "KeyFrames", {
                value: new KeyFrameCollection(),
                writable: false
            });
        }
        Resolve(target: DependencyObject, propd: DependencyProperty): bool {
            var keyFrames = this.KeyFrames;
            var sortedList = KeyFrameCollection.ResolveKeyFrames(this, keyFrames);
            var count = sortedList.length;
            for (var j = 0; j < count; j++) {
                if (!sortedList[j].KeyTime.IsValid)
                    return false;
            }
            return true;
        }
        GetCurrentValue(defaultOriginValue: any, defaultDestinationValue: any, clockData: IClockData): any {
            var keyFrames = this.KeyFrames;
            var prevFrameRef = { Value: null };
            var currentKeyFrame: IKeyFrame = keyFrames.GetKeyFrameForTime(clockData.CurrentTime, prevFrameRef);
            var prevFrame: IKeyFrame = prevFrameRef.Value;
            if (!currentKeyFrame)
                return null;
            var baseValue: any;
            var keyStartTime: TimeSpan;
            var keyEndTime = currentKeyFrame._ResolvedKeyTime;
            if (!prevFrame) {
                baseValue = defaultOriginValue;
                keyStartTime = new TimeSpan();
            } else {
                if (prevFrame instanceof ObjectKeyFrame) {
                    baseValue = (<ObjectKeyFrame>prevFrame).ConvertedValue;
                } else {
                    baseValue = prevFrame.Value;
                }
                keyStartTime = prevFrame._ResolvedKeyTime;
            }
            var progress: number;
            if (clockData.CurrentTime.CompareTo(keyEndTime) >= 0) {
                progress = 1.0;
            } else {
                var keyDuration = keyEndTime.Ticks - keyStartTime.Ticks;
                if (keyDuration <= 0)
                    progress = 1.0;
                else
                    progress = (clockData.CurrentTime.Ticks - keyStartTime.Ticks) / keyDuration;
            }
            return currentKeyFrame.InterpolateValue(baseValue, progress);
        }
        GetNaturalDurationCore(): Duration {
            var keyFrames = this.KeyFrames;
            var sortedList: IKeyFrame[] = KeyFrameCollection.ResolveKeyFrames(this, keyFrames);
            var len = sortedList.length;
            var ts: TimeSpan;
            if (len > 0)
                ts = sortedList[len - 1]._ResolvedKeyTime;
            else
                ts = new TimeSpan();
            return Duration.CreateTimeSpan(ts);
        }
        AddKeyFrame(kf: KeyFrame) { this.KeyFrames.Add(kf); }
        RemoveKeyFrame(kf: KeyFrame) { this.KeyFrames.Remove(kf); }
    }
    Nullstone.RegisterType(AnimationUsingKeyFrames, "AnimationUsingKeyFrames");
}

module Fayde.Media.Animation {
    export class ColorAnimation extends AnimationBase {
        static ByProperty: DependencyProperty = DependencyProperty.Register("By", () => Color, ColorAnimation, undefined, (d, args) => (<ColorAnimation>d)._InvalidateCache());
        static EasingFunctionProperty: DependencyProperty = DependencyProperty.Register("EasingFunction", () => EasingFunctionBase, ColorAnimation, undefined, (d, args) => (<ColorAnimation>d)._InvalidateCache());
        static FromProperty: DependencyProperty = DependencyProperty.Register("From", () => Color, ColorAnimation, undefined, (d, args) => (<ColorAnimation>d)._InvalidateCache());
        static ToProperty: DependencyProperty = DependencyProperty.Register("To", () => Color, ColorAnimation, undefined, (d, args) => (<ColorAnimation>d)._InvalidateCache());
        By: Color;
        EasingFunction: IEasingFunction;
        From: Color;
        To: Color;
        private _HasCached: bool = false;
        private _FromCached: Color = null;
        private _ToCached: Color = null;
        private _ByCached: Color = null;
        GetTargetValue(defaultOriginalValue: any): Color {
            this._EnsureCache();
            var start = new Color();
            if (this._FromCached != null)
                start = this._FromCached;
            else if (defaultOriginalValue != null && defaultOriginalValue instanceof Color)
                start = defaultOriginalValue;
            if (this._ToCached != null)
                return this._ToCached;
            else if (this._ByCached != null)
                return start.Add(this._ByCached);
            return start;
        }
        GetCurrentValue(defaultOriginalValue: any, defaultDestinationValue: any, clockData: IClockData): Color {
            this._EnsureCache();
            var start = new Color();
            if (this._FromCached != null)
                start = this._FromCached;
            else if (defaultOriginalValue != null && defaultOriginalValue instanceof Color)
                start = defaultOriginalValue;
            var end = start;
            if (this._ToCached != null)
                end = this._ToCached;
            else if (this._ByCached != null)
                end = start.Add(this._ByCached);
            else if (defaultDestinationValue != null && defaultDestinationValue instanceof Color)
                end = defaultDestinationValue;
            var easingFunc = this.EasingFunction;
            if (easingFunc != null)
                clockData.Progress = easingFunc.Ease(clockData.Progress);
            return Color.LERP(start, end, clockData.Progress);
        }
        private _EnsureCache() {
            if (this._HasCached)
                return;
            this._FromCached = this.From;
            this._ToCached = this.To;
            this._ByCached = this.By;
            this._HasCached = true;
        }
        private _InvalidateCache() {
            this._FromCached = null;
            this._ToCached = null;
            this._ByCached = null;
            this._HasCached = false;
        }
    }
    Nullstone.RegisterType(ColorAnimation, "ColorAnimation");
}

module Fayde.Media.Animation {
    export class ColorAnimationUsingKeyFrames extends AnimationUsingKeyFrames {
        static Annotations = { ContentProperty: "KeyFrames" };
    }
    Nullstone.RegisterType(ColorAnimationUsingKeyFrames, "ColorAnimationUsingKeyFrames");
}

module Fayde.Media.Animation {
    export class ColorKeyFrame extends KeyFrame {
        static ValueProperty: DependencyProperty = DependencyProperty.Register("Value", () => Color, ColorKeyFrame);
        Value: Color;
    }
    Nullstone.RegisterType(ColorKeyFrame, "ColorKeyFrame");
    export class DiscreteColorKeyFrame extends ColorKeyFrame {
        InterpolateValue(baseValue: Color, keyFrameProgress: number): Color {
            if (keyFrameProgress >= 1.0)
                return this.Value;
            return baseValue;
        }
    }
    Nullstone.RegisterType(DiscreteColorKeyFrame, "DiscreteColorKeyFrame");
    export class EasingColorKeyFrame extends ColorKeyFrame {
        static EasingFunctionProperty: DependencyProperty = DependencyProperty.Register("EasingFunction", () => EasingFunctionBase, EasingColorKeyFrame);
        EasingFunction: EasingFunctionBase;
        InterpolateValue(baseValue: Color, keyFrameProgress: number): Color {
            if (keyFrameProgress >= 1.0)
                return this.Value;
            var start = baseValue;
            var end = this.Value;
            var easingFunction = this.EasingFunction;
            if (easingFunction)
                keyFrameProgress = easingFunction.Ease(keyFrameProgress);
            return Color.LERP(start, end, keyFrameProgress);
        }
    }
    Nullstone.RegisterType(EasingColorKeyFrame, "EasingColorKeyFrame");
    export class LinearColorKeyFrame extends ColorKeyFrame {
        InterpolateValue(baseValue: Color, keyFrameProgress: number): Color {
            return Color.LERP(baseValue, this.Value, keyFrameProgress);
        }
    }
    Nullstone.RegisterType(LinearColorKeyFrame, "LinearColorKeyFrame");
    export class SplineColorKeyFrame extends ColorKeyFrame {
        static KeySplineProperty: DependencyProperty = DependencyProperty.Register("KeySpline", () => KeySpline, SplineColorKeyFrame);
        KeySpline: KeySpline;
        InterpolateValue(baseValue: Color, keyFrameProgress: number): Color {
            if (keyFrameProgress >= 1.0)
                return this.Value;
            var start = baseValue;
            var end = this.Value;
            var splineProgress = keyFrameProgress;
            var keySpline = this.KeySpline;
            if (keySpline)
                splineProgress = keySpline.GetSplineProgress(keyFrameProgress);
            return Color.LERP(start, end, splineProgress);
        }
    }
    Nullstone.RegisterType(SplineColorKeyFrame, "SplineColorKeyFrame");
}

module Fayde.Media.Animation {
    export class DoubleAnimation extends AnimationBase {
        static ByProperty: DependencyProperty = DependencyProperty.Register("By", () => Number, DoubleAnimation, undefined, (d, args) => (<DoubleAnimation>d)._InvalidateCache());
        static EasingFunctionProperty: DependencyProperty = DependencyProperty.Register("EasingFunction", () => EasingFunctionBase, DoubleAnimation, undefined, (d, args) => (<DoubleAnimation>d)._InvalidateCache());
        static FromProperty: DependencyProperty = DependencyProperty.Register("From", () => Number, DoubleAnimation, undefined, (d, args) => (<DoubleAnimation>d)._InvalidateCache());
        static ToProperty: DependencyProperty = DependencyProperty.Register("To", () => Number, DoubleAnimation, undefined, (d, args) => (<DoubleAnimation>d)._InvalidateCache());
        By: number;
        EasingFunction: IEasingFunction;
        From: number;
        To: number;
        private _HasCached: bool = false;
        private _FromCached: number = 0.0;
        private _ToCached: number = 0.0;
        private _ByCached: number = 0.0;
        GetTargetValue(defaultOriginalValue: any): number {
            this._EnsureCache();
            var start = 0.0;
            if (this._FromCached != null)
                start = this._FromCached;
            else if (defaultOriginalValue != null && typeof defaultOriginalValue === "number")
                start = defaultOriginalValue;
            if (this._ToCached != null)
                return this._ToCached;
            else if (this._ByCached != null)
                return start + this._ByCached;
            return start;
        }
        GetCurrentValue(defaultOriginalValue: any, defaultDestinationValue: any, clockData: IClockData): number {
            this._EnsureCache();
            var start = 0.0;
            if (this._FromCached != null)
                start = this._FromCached;
            else if (defaultOriginalValue != null && typeof defaultOriginalValue === "number")
                start = defaultOriginalValue;
            var end = start;
            if (this._ToCached != null)
                end = this._ToCached;
            else if (this._ByCached != null)
                end = start + this._ByCached;
            else if (defaultDestinationValue != null && typeof defaultDestinationValue === "number")
                end = defaultDestinationValue;
            var easingFunc = this.EasingFunction;
            if (easingFunc != null)
                clockData.Progress = easingFunc.Ease(clockData.Progress);
            return start + ((end - start) * clockData.Progress);
        }
        private _EnsureCache() {
            if (this._HasCached)
                return;
            this._FromCached = this.From;
            this._ToCached = this.To;
            this._ByCached = this.By;
            this._HasCached = true;
        }
        private _InvalidateCache() {
            this._FromCached = 0.0;
            this._ToCached = 0.0;
            this._ByCached = 0.0;
            this._HasCached = false;
        }
    }
    Nullstone.RegisterType(DoubleAnimation, "DoubleAnimation");
}

module Fayde.Media.Animation {
    export class DoubleAnimationUsingKeyFrames extends AnimationUsingKeyFrames {
        static Annotations = { ContentProperty: "KeyFrames" };
    }
    Nullstone.RegisterType(DoubleAnimationUsingKeyFrames, "DoubleAnimationUsingKeyFrames");
}

module Fayde.Media.Animation {
    export class DoubleKeyFrame extends KeyFrame {
        static ValueProperty: DependencyProperty = DependencyProperty.Register("Value", () => Number, DoubleKeyFrame);
        Value: number;
    }
    Nullstone.RegisterType(DoubleKeyFrame, "DoubleKeyFrame");
    export class DiscreteDoubleKeyFrame extends DoubleKeyFrame {
        InterpolateValue(baseValue: number, keyFrameProgress: number): number {
            if (keyFrameProgress >= 1.0)
                return this.Value;
            return baseValue;
        }
    }
    Nullstone.RegisterType(DiscreteDoubleKeyFrame, "DiscreteDoubleKeyFrame");
    export class EasingDoubleKeyFrame extends DoubleKeyFrame {
        static EasingFunctionProperty: DependencyProperty = DependencyProperty.Register("EasingFunction", () => EasingFunctionBase, EasingDoubleKeyFrame);
        EasingFunction: EasingFunctionBase;
        InterpolateValue(baseValue: number, keyFrameProgress: number): number {
            if (keyFrameProgress >= 1.0)
                return this.Value;
            var start = baseValue;
            var end = this.Value;
            var easingFunction = this.EasingFunction;
            if (easingFunction)
                keyFrameProgress = easingFunction.Ease(keyFrameProgress);
            if (isNaN(start))
                start = 0;
            if (isNaN(end))
                end = 0;
            return start + (end - start) * keyFrameProgress;
        }
    }
    Nullstone.RegisterType(EasingDoubleKeyFrame, "EasingDoubleKeyFrame");
    export class LinearDoubleKeyFrame extends DoubleKeyFrame {
        InterpolateValue(baseValue: number, keyFrameProgress: number): number {
            var start = baseValue;
            var end = this.Value;
            if (isNaN(start))
                start = 0;
            if (isNaN(end))
                end = 0;
            return start + (end - start) * keyFrameProgress;
        }
    }
    Nullstone.RegisterType(LinearDoubleKeyFrame, "LinearDoubleKeyFrame");
    export class SplineDoubleKeyFrame extends DoubleKeyFrame {
        static KeySplineProperty: DependencyProperty = DependencyProperty.Register("KeySpline", () => KeySpline, SplineDoubleKeyFrame);
        KeySpline: KeySpline;
        InterpolateValue(baseValue: number, keyFrameProgress: number): number {
            if (keyFrameProgress >= 1.0)
                return this.Value;
            var start = baseValue;
            var end = this.Value;
            var splineProgress = keyFrameProgress;
            var keySpline = this.KeySpline;
            if (keySpline)
                splineProgress = keySpline.GetSplineProgress(keyFrameProgress);
            if (isNaN(start))
                start = 0;
            if (isNaN(end))
                end = 0;
            return start + (end - start) * splineProgress;
        }
    }
    Nullstone.RegisterType(SplineDoubleKeyFrame, "SplineDoubleKeyFrame");
}

module Fayde.Media.Animation {
    export class ObjectAnimationUsingKeyFrames extends AnimationUsingKeyFrames {
        static Annotations = { ContentProperty: "KeyFrames" };
        Resolve(target: DependencyObject, propd: DependencyProperty): bool {
            var enumerator = this.KeyFrames.GetEnumerator();
            while (enumerator.MoveNext()) {
                var keyFrame: ObjectKeyFrame = enumerator.Current;
                var value = keyFrame.Value;
                if (value == null) {
                    keyFrame.ConvertedValue = undefined;
                } else {
                    var converted = value;
                    keyFrame.ConvertedValue = converted;
                }
            }
            return super.Resolve(target, propd);
        }
    }
    Nullstone.RegisterType(ObjectAnimationUsingKeyFrames, "ObjectAnimationUsingKeyFrames");
}

module Fayde.Media.Animation {
    export class PointAnimation extends AnimationBase {
        static ByProperty: DependencyProperty = DependencyProperty.Register("By", () => Point, PointAnimation, undefined, (d, args) => (<PointAnimation>d)._InvalidateCache());
        static EasingFunctionProperty: DependencyProperty = DependencyProperty.Register("EasingFunction", () => EasingFunctionBase, PointAnimation, undefined, (d, args) => (<PointAnimation>d)._InvalidateCache());
        static FromProperty: DependencyProperty = DependencyProperty.Register("From", () => Point, PointAnimation, undefined, (d, args) => (<PointAnimation>d)._InvalidateCache());
        static ToProperty: DependencyProperty = DependencyProperty.Register("To", () => Point, PointAnimation, undefined, (d, args) => (<PointAnimation>d)._InvalidateCache());
        By: Point;
        EasingFunction: IEasingFunction;
        From: Point;
        To: Point;
        private _HasCached: bool = false;
        private _FromCached: Point = null;
        private _ToCached: Point = null;
        private _ByCached: Point = null;
        GetTargetValue(defaultOriginalValue: any): Point {
            this._EnsureCache();
            var start = new Point();
            if (this._FromCached != null)
                start = this._FromCached;
            else if (defaultOriginalValue != null && defaultOriginalValue instanceof Point)
                start = defaultOriginalValue;
            if (this._ToCached != null)
                return this._ToCached;
            else if (this._ByCached != null)
                return new Point(start.X + this._ByCached.X, start.Y + this._ByCached.Y);
            return start;
        }
        GetCurrentValue(defaultOriginalValue: any, defaultDestinationValue: any, clockData: IClockData): Point {
            this._EnsureCache();
            var start = new Point();
            if (this._FromCached != null)
                start = this._FromCached;
            else if (defaultOriginalValue != null && defaultOriginalValue instanceof Point)
                start = defaultOriginalValue;
            var end = start;
            if (this._ToCached != null)
                end = this._ToCached;
            else if (this._ByCached != null)
                end = new Point(start.X + this._ByCached.X, start.Y + this._ByCached.Y);
            else if (defaultDestinationValue != null && defaultDestinationValue instanceof Point)
                end = defaultDestinationValue;
            var easingFunc = this.EasingFunction;
            if (easingFunc != null)
                clockData.Progress = easingFunc.Ease(clockData.Progress);
            return Point.LERP(start, end, clockData.Progress);
        }
        private _EnsureCache() {
            if (this._HasCached)
                return;
            this._FromCached = this.From;
            this._ToCached = this.To;
            this._ByCached = this.By;
            this._HasCached = true;
        }
        private _InvalidateCache() {
            this._FromCached = null;
            this._ToCached = null;
            this._ByCached = null;
            this._HasCached = false;
        }
    }
    Nullstone.RegisterType(PointAnimation, "PointAnimation");
}

module Fayde.Media.Animation {
    export class PointAnimationUsingKeyFrames extends AnimationUsingKeyFrames {
        static Annotations = { ContentProperty: "KeyFrames" };
    }
    Nullstone.RegisterType(PointAnimationUsingKeyFrames, "PointAnimationUsingKeyFrames");
}

module Fayde.Media.Animation {
    export class Storyboard extends Timeline {
        static TargetNameProperty: DependencyProperty = DependencyProperty.RegisterAttached("TargetName", () => String, Storyboard);
        static GetTargetName(d: DependencyObject): string { return d.GetValue(TargetNameProperty); }
        static SetTargetName(d: DependencyObject, value: string) { return d.SetValue(TargetNameProperty, value); }
        static TargetPropertyProperty: DependencyProperty = DependencyProperty.RegisterAttached("TargetProperty", () => Data.PropertyPath, Storyboard);
        static GetTargetProperty(d: DependencyObject): Data.PropertyPath { return d.GetValue(TargetPropertyProperty); }
        static SetTargetProperty(d: DependencyObject, value: Data.PropertyPath) { return d.SetValue(TargetPropertyProperty, value); }
        TargetName: string;
        TargetProperty: Data.PropertyPath;
        Children: TimelineCollection;
        static Annotations = { ContentProperty: "Children" }
        constructor() {
            super();
            Object.defineProperty(this, "Children", {
                value: new TimelineCollection(),
                writable: false
            });
        }
        Begin() {
            this.Reset();
            var error = new BError();
            var promotedValues: any[] = [];
            if (this._HookupAnimations(promotedValues, error)) {
                App.Instance.RegisterStoryboard(this);
            } else {
                error.ThrowException();
            }
        }
        Pause() {
            super.Pause();
            var enumerator = this.Children.GetEnumerator();
            while (enumerator.MoveNext()) {
                (<Timeline>enumerator.Current).Pause();
            }
        }
        Resume() {
            super.Resume();
            var enumerator = this.Children.GetEnumerator();
            while (enumerator.MoveNext()) {
                (<Timeline>enumerator.Current).Resume();
            }
        }
        Stop() {
            super.Stop();
            App.Instance.UnregisterStoryboard(this);
            var enumerator = this.Children.GetEnumerator();
            while (enumerator.MoveNext()) {
                (<Timeline>enumerator.Current).Stop();
            }
        }
        private _HookupAnimations(promotedValues: any[], error: BError): bool {
            var enumerator = this.Children.GetEnumerator();
            while (enumerator.MoveNext()) {
                if (!this._HookupAnimation((<AnimationBase>enumerator.Current), null, null, promotedValues, error))
                    return false;
            }
            return true;
        }
        private _HookupAnimation(animation: AnimationBase, targetObject: DependencyObject, targetPropertyPath: Data.PropertyPath, promotedValues: any[], error: BError): bool {
            animation.Reset();
            var localTargetObject: DependencyObject = null;
            var localTargetPropertyPath: Data.PropertyPath = null;
            if (animation.HasManualTarget) {
                localTargetObject = animation.ManualTarget;
            } else {
                var name = Storyboard.GetTargetName(animation);
                if (name) {
                    var n = animation.XamlNode.FindName(name);
                    localTargetObject = <DependencyObject>n.XObject;
                }
            }
            localTargetPropertyPath = Storyboard.GetTargetProperty(animation);
            if (localTargetObject != null)
                targetObject = localTargetObject;
            if (localTargetPropertyPath != null)
                targetPropertyPath = localTargetPropertyPath;
            var refobj = {
                Value: targetObject
            };
            targetPropertyPath.TryResolveDependencyProperty(targetObject);
            var targetProperty = Data.PropertyPath.ResolvePropertyPath(refobj, targetPropertyPath, promotedValues);
            if (targetProperty == null) {
                error.Number = BError.XamlParse;
                error.Message = "Could not resolve property for storyboard. [" + localTargetPropertyPath.Path.toString() + "]";
                return false;
            }
            if (!animation.Resolve(refobj.Value, targetProperty)) {
                error.Number = BError.InvalidOperation;
                error.Message = "Storyboard value could not be converted to the correct type";
                return false;
            }
            animation.HookupStorage(refobj.Value, targetProperty);
            return true;
        }
        UpdateInternal(clockData: IClockData) {
            var enumerator = this.Children.GetEnumerator();
            while (enumerator.MoveNext()) {
                (<Timeline>enumerator.Current).Update(clockData.CurrentTime.Ticks);
            }
        }
        GetNaturalDurationCore(): Duration {
            var fullTicks = 0;
            var enumerator = this.Children.GetEnumerator();
            while (enumerator.MoveNext()) {
                var timeline = <Timeline>enumerator.Current;
                var dur = timeline.GetNaturalDuration();
                if (dur.IsAutomatic)
                    continue;
                if (dur.IsForever)
                    return Duration.CreateForever();
                var spanTicks = dur.TimeSpan.Ticks;
                var repeat = timeline.RepeatBehavior;
                if (repeat.IsForever)
                    return Duration.CreateForever();
                if (repeat.HasCount)
                    spanTicks = spanTicks * repeat.Count;
                if (timeline.AutoReverse)
                    spanTicks *= 2;
                if (repeat.HasDuration)
                    spanTicks = repeat.Duration.TimeSpan.Ticks;
                if (spanTicks !== 0)
                    spanTicks = spanTicks / timeline.SpeedRatio;
                spanTicks += timeline.BeginTime.Ticks;
                if (fullTicks === 0 || fullTicks <= spanTicks)
                    fullTicks = spanTicks;
            }
            if (!fullTicks)
                return Duration.CreateAutomatic();
            return Duration.CreateTimeSpan(TimeSpan.FromTicks(fullTicks));
        }
    }
    Nullstone.RegisterType(Storyboard, "Storyboard");
}

module Fayde.Media.Effects {
    export class BlurEffect extends Effect {
        static RadiusProperty: DependencyProperty = DependencyProperty.Register("Radius", () => Number, BlurEffect, undefined, (d, args) => (<Media.Effects.Effect>d)._EffectChanged(args));
        Radius: number;
    }
    Nullstone.RegisterType(BlurEffect, "BlurEffect");
}

module Fayde.Media.Effects {
    export class DropShadowEffect extends Effect {
        static MAX_BLUR_RADIUS: number = 20;
        static MAX_SHADOW_DEPTH: number = 300;
        static BlurRadiusProperty: DependencyProperty = DependencyProperty.Register("BlurRadius", () => Number, DropShadowEffect, 5.0, (d, args) => (<Media.Effects.Effect>d)._EffectChanged(args));
        static ColorProperty: DependencyProperty = DependencyProperty.Register("Color", () => Color, DropShadowEffect, Color.KnownColors.Black, (d, args) => (<Media.Effects.Effect>d)._EffectChanged(args));
        static DirectionProperty: DependencyProperty = DependencyProperty.Register("Direction", () => Number, DropShadowEffect, 315.0, (d, args) => (<Media.Effects.Effect>d)._EffectChanged(args));
        static OpacityProperty: DependencyProperty = DependencyProperty.Register("Opacity", () => Number, DropShadowEffect, 1.0, (d, args) => (<Media.Effects.Effect>d)._EffectChanged(args));
        static ShadowDepthProperty: DependencyProperty = DependencyProperty.Register("ShadowDepth", () => Number, DropShadowEffect, 5.0, (d, args) => (<Media.Effects.Effect>d)._EffectChanged(args));
        BlurRadius: number;
        Color: Color;
        Direction: number;
        Opacity: number;
        ShadowDepth: number;
        Padding(): Thickness {
            var radius = Math.min(this.BlurRadius, DropShadowEffect.MAX_BLUR_RADIUS);
            var depth = Math.min(Math.max(0, this.ShadowDepth), DropShadowEffect.MAX_SHADOW_DEPTH);
            var direction = this.Direction * Math.PI / 180.0;
            var width = Math.ceil(radius);
            var offsetX = Math.cos(direction) * depth;
            var offsetY = Math.sin(direction) * depth;
            var left = -offsetX + width;
            var top = offsetY + width;
            var right = offsetX + width;
            var bottom = -offsetY + width;
            return new Thickness(left < 1.0 ? 1.0 : Math.ceil(left),
                top < 1.0 ? 1.0 : Math.ceil(top),
                right < 1.0 ? 1.0 : Math.ceil(right),
                bottom < 1.0 ? 1.0 : Math.ceil(bottom));
        }
        GetPadding(thickness: Thickness): bool {
            var radius = Math.min(this.BlurRadius, DropShadowEffect.MAX_BLUR_RADIUS);
            var depth = Math.min(Math.max(0, this.ShadowDepth), DropShadowEffect.MAX_SHADOW_DEPTH);
            var direction = this.Direction * Math.PI / 180.0;
            var width = Math.ceil(radius);
            var offsetX = Math.cos(direction) * depth;
            var offsetY = Math.sin(direction) * depth;
            var left = -offsetX + width;
            var top = offsetY + width;
            var right = offsetX + width;
            var bottom = -offsetY + width;
            var l = left < 1.0 ? 1.0 : Math.ceil(left);
            var t = top < 1.0 ? 1.0 : Math.ceil(top);
            var r = right < 1.0 ? 1.0 : Math.ceil(right);
            var b = bottom < 1.0 ? 1.0 : Math.ceil(bottom);
            var flag = false;
            if (thickness.Left !== l) {
                thickness.Left = l;
                flag = true;
            }
            if (thickness.Top !== t) {
                thickness.Top = t;
                flag = true;
            }
            if (thickness.Right !== r) {
                thickness.Right = r;
                flag = true;
            }
            if (thickness.Bottom !== b) {
                thickness.Bottom = b;
                flag = true;
            }
            return flag;
        }
        PreRender(ctx: RenderContext) {
            var color = this.Color;
            var opacity = color.A * this.Opacity;
            var radius = Math.min(this.BlurRadius, DropShadowEffect.MAX_BLUR_RADIUS);
            var depth = Math.min(Math.max(0, this.ShadowDepth), DropShadowEffect.MAX_SHADOW_DEPTH);
            var direction = this.Direction * Math.PI / 180.0;
            var offsetX = Math.cos(direction) * depth;
            var offsetY = Math.sin(direction) * depth;
            var canvasCtx = ctx.CanvasContext;
            canvasCtx.shadowColor = "rgba(" + color.R + "," + color.G + "," + color.B + "," + opacity + ")";
            canvasCtx.shadowBlur = radius;
            canvasCtx.shadowOffsetX = offsetX;
            canvasCtx.shadowOffsetY = offsetY;
        }
    }
    Nullstone.RegisterType(DropShadowEffect, "DropShadowEffect");
}

module Fayde.Media.Imaging {
    declare var Info;
    export interface IImageChangedListener {
        OnImageErrored(source: BitmapSource, e: Event);
        OnImageLoaded(source: BitmapSource, e: Event);
        ImageChanged(source: BitmapSource);
    }
    function intGreaterThanZeroValidator(instance: DependencyObject, propd: DependencyProperty, value: any) {
        if (typeof value !== "number")
            return false;
        return value > 0;
    }
    export class BitmapSource extends ImageSource {
        static PixelWidthProperty: DependencyProperty = DependencyProperty.RegisterFull("PixelWidth", () => Number, BitmapSource, 0, undefined, undefined, undefined, undefined, intGreaterThanZeroValidator);
        static PixelHeightProperty: DependencyProperty = DependencyProperty.RegisterFull("PixelHeight", () => Number, BitmapSource, 0, undefined, undefined, undefined, undefined, intGreaterThanZeroValidator);
        private _Listener: IImageChangedListener = null;
        private _Image: HTMLImageElement;
        get Image(): HTMLImageElement { return this._Image; }
        ResetImage() {
            this._Image = new Image();
            this._Image.onerror = (e) => this._OnErrored(e);
            this._Image.onload = (e) => this._OnLoad(e);
            this.PixelWidth = 0;
            this.PixelHeight = 0;
            var listener = this._Listener;
            if (listener) listener.ImageChanged(this);
        }
        UriSourceChanged(oldValue: Uri, newValue: Uri) {
            this._Image.src = newValue.toString();
            var listener = this._Listener;
            if (listener) listener.ImageChanged(this);
        }
        Listen(listener: IImageChangedListener) { this._Listener = listener; }
        Unlisten(listener: IImageChangedListener) { if (this._Listener === listener) this._Listener = null; }
        _OnErrored(e: Event) {
            Info("Failed to load: " + this._Image.src.toString());
            var listener = this._Listener;
            if (listener)
                listener.OnImageErrored(this, e);
        }
        _OnLoad(e: Event) {
            this.PixelWidth = this._Image.naturalWidth;
            this.PixelHeight = this._Image.naturalHeight;
            var listener = this._Listener;
            if (listener) {
                listener.OnImageLoaded(this, e);
                listener.ImageChanged(this);
            }
        }
    }
    Nullstone.RegisterType(BitmapSource, "BitmapSource");
}

module Fayde.Media.Imaging {
    export class ImageBrush extends TileBrush implements IImageChangedListener {
        static ImageSourceProperty: DependencyProperty = DependencyProperty.RegisterFull("ImageSource", () => ImageSource, ImageBrush, undefined, (d, args) => (<ImageBrush>d)._ImageSourceChanged(args)/*, ... */);
        ImageSource: ImageSource;
        ImageFailed: MulticastEvent = new MulticastEvent();
        ImageOpened: MulticastEvent = new MulticastEvent();
        SetupBrush(ctx: CanvasRenderingContext2D, bounds: rect) {
            var source = this.ImageSource;
            if (source && source.Image)
                super.SetupBrush(ctx, bounds);
        }
        private GetTileExtents(): rect {
            var source = this.ImageSource;
            var r = new rect();
            r.Width = source.PixelWidth;
            r.Height = source.PixelHeight;
            return r;
        }
        private DrawTile(canvasCtx: CanvasRenderingContext2D, bounds: rect) {
            var source = this.ImageSource;
            canvasCtx.rect(0, 0, bounds.Width, bounds.Height);
            canvasCtx.fillStyle = canvasCtx.createPattern(source.Image, "no-repeat");
            canvasCtx.fill();
        }
        private _ImageSourceChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldSrc: BitmapSource;
            if ((oldSrc = args.OldValue) && (oldSrc instanceof BitmapSource))
                oldSrc.Unlisten(this);
            var newSrc: BitmapSource;
            if ((newSrc = args.NewValue) && (newSrc instanceof BitmapSource))
                newSrc.Listen(this);
            this.InvalidateBrush();
        }
        private OnImageErrored(source: BitmapSource, e: Event) { this.ImageFailed.Raise(this, EventArgs.Empty); }
        private OnImageLoaded(source: BitmapSource, e: Event) { this.ImageOpened.Raise(this, EventArgs.Empty); }
        private ImageChanged(source: BitmapSource) { }
    }
    Nullstone.RegisterType(ImageBrush, "ImageBrush");
}

module Fayde {
    export class FENode extends UINode {
        private _Surface: Surface;
        XObject: FrameworkElement;
        constructor(xobj: FrameworkElement) {
            super(xobj);
        }
        SubtreeNode: XamlNode;
        SetSubtreeNode(subtreeNode: XamlNode, error: BError): bool {
            var error = new BError();
            if (subtreeNode && !subtreeNode.AttachTo(this, error))
                return false;
            this.SubtreeNode = subtreeNode;
            return true;
        }
        SetIsLoaded(value: bool) {
            if (this.IsLoaded === value)
                return;
            this.IsLoaded = value;
            this.OnIsLoadedChanged(value);
        }
        OnIsLoadedChanged(newIsLoaded: bool) {
            var xobj = this.XObject;
            var res = xobj.Resources;
            var store = xobj._Store;
            if (!newIsLoaded) {
                store.ClearImplicitStyles(Providers._StyleMask.VisualTree);
            } else {
                store.SetImplicitStyles(Providers._StyleMask.All);
            }
            var enumerator = this.GetVisualTreeEnumerator();
            while (enumerator.MoveNext()) {
                (<UINode>enumerator.Current).SetIsLoaded(newIsLoaded);
            }
            if (newIsLoaded) {
                this.InvokeLoaded();
                store.EmitDataContextChanged();
            }
        }
        InvokeLoaded() { }
        AttachVisualChild(uie: UIElement, error: BError): bool {
            this.OnVisualChildAttached(uie);
            if (!this.SetSubtreeNode(uie.XamlNode, error))
                return false;
            uie.XamlNode.SetIsLoaded(this.IsLoaded);
        }
        DetachVisualChild(uie: UIElement, error: BError) {
            if (!this.SetSubtreeNode(null, error))
                return false;
            this.OnVisualChildDetached(uie);
            uie.XamlNode.SetIsLoaded(false);
        }
        _ApplyTemplateWithError(error: BError): bool {
            if (this.SubtreeNode)
                return false;
            var result = this._DoApplyTemplateWithError(error);
            if (result)
                this.XObject.OnApplyTemplate();
            return result;
        }
        _DoApplyTemplateWithError(error: BError): bool {
            var uie = <UIElement>this._GetDefaultTemplate();
            if (uie) {
                if (error.Message)
                    return false;
                this.AttachVisualChild(uie, error);
            }
            return error.Message == null && uie != null;
        }
        _GetDefaultTemplate(): UIElement { return undefined; }
        _FindElementsInHostCoordinates(ctx: RenderContext, p: Point, uinlist: UINode[]) {
            var lu = this.LayoutUpdater;
            if (!lu.TotalIsRenderVisible)
                return;
            if (!lu.TotalIsHitTestVisible)
                return;
            if (lu.SurfaceBoundsWithChildren.Height <= 0)
                return;
            if (!this._InsideClip(ctx, lu, p.X, p.Y))
                return;
            ctx.Save();
            uinlist.unshift(this);
            var enumerator = this.GetVisualTreeEnumerator(VisualTreeDirection.ZFoward);
            while (enumerator.MoveNext()) {
                (<UINode>enumerator.Current)._FindElementsInHostCoordinates(ctx, p, uinlist);
            }
            if (this === uinlist[0]) {
                if (!this._CanFindElement() || !this._InsideObject(ctx, lu, p.X, p.Y))
                    uinlist.shift();
            }
            ctx.Restore();
        }
        _HitTestPoint(ctx: RenderContext, p: Point, uinlist: UINode[]) {
            var lu = this.LayoutUpdater;
            if (!lu.TotalIsRenderVisible)
                return;
            if (!lu.TotalIsHitTestVisible)
                return;
            if (!this._InsideClip(ctx, lu, p.X, p.Y))
                return;
            uinlist.unshift(this);
            var hit = false;
            var enumerator = this.GetVisualTreeEnumerator(VisualTreeDirection.ZReverse);
            while (enumerator.MoveNext()) {
                var childNode = (<FENode>enumerator.Current);
                childNode._HitTestPoint(ctx, p, uinlist);
                if (this !== uinlist[0]) {
                    hit = true;
                    break;
                }
            }
            if (!hit && !(this._CanFindElement() && this._InsideObject(ctx, lu, p.X, p.Y))) {
                if (uinlist.shift() !== this) {
                    throw new Exception("Look at my code! -> FENode._HitTestPoint");
                }
            }
        }
        _CanFindElement(): bool { return false; }
        _InsideObject(ctx: RenderContext, lu: LayoutUpdater, x: number, y: number): bool {
            var np = new Point(x, y);
            lu.TransformPoint(np);
            var fe = this.XObject;
            if (np.X < 0 || np.Y < 0 || np.X > fe.ActualWidth || np.Y > fe.ActualHeight)
                return false;
            if (!this._InsideLayoutClip(lu, x, y))
                return false;
            return this._InsideClip(ctx, lu, x, y);
        }
        _InsideLayoutClip(lu: LayoutUpdater, x: number, y: number): bool {
            /*
            Geometry * composite_clip = LayoutInformation:: GetCompositeClip(this);
            bool inside = true;
            if (!composite_clip)
                return inside;
            var np = new Point();
            lu.TransformPoint(np);
            inside = composite_clip - > GetBounds().PointInside(x, y);
            composite_clip - > unref();
            return inside;
            */
            return true;
        }
        _HasFocus(): bool {
            var curNode = this._Surface.FocusedNode
            while (curNode) {
                if (curNode === this)
                    return true;
                curNode = curNode.VisualParentNode;
            }
            return false;
        }
        GetVisualTreeEnumerator(direction?: VisualTreeDirection): IEnumerator {
            if (this.SubtreeNode)
                return ArrayEx.GetEnumerator([this.SubtreeNode]);
            return ArrayEx.EmptyEnumerator;
        }
    }
    Nullstone.RegisterType(FENode, "FENode");
    export class FrameworkElement extends UIElement implements IMeasurableHidden, IArrangeableHidden {
        DefaultStyleKey: any;
        XamlNode: FENode;
        Resources: ResourceDictionary;
        constructor() {
            super();
            Object.defineProperty(this, "Resources", {
                value: new ResourceDictionary(),
                writable: false
            });
        }
        _Store: Providers.FrameworkProviderStore;
        CreateStore(): Providers.FrameworkProviderStore {
            var s = new Providers.FrameworkProviderStore(this);
            s.SetProviders([null,
                new Providers.LocalValueProvider(),
                new Providers.FrameworkElementDynamicProvider(),
                new Providers.LocalStyleProvider(s),
                new Providers.ImplicitStyleProvider(s),
                new Providers.InheritedProvider(),
                new Providers.InheritedDataContextProvider(s),
                new Providers.DefaultValueProvider(),
                new Providers.AutoCreateProvider()]
            );
            return s;
        }
        CreateNode(): FENode { return new FENode(this); }
        static ActualHeightProperty: DependencyProperty = DependencyProperty.RegisterReadOnlyCore("ActualHeight", () => Number, FrameworkElement);
        static ActualWidthProperty: DependencyProperty = DependencyProperty.RegisterReadOnlyCore("ActualWidth", () => Number, FrameworkElement);
        static CursorProperty: DependencyProperty = DependencyProperty.RegisterFull("Cursor", () => new Enum(CursorType), FrameworkElement, CursorType.Default);
        static FlowDirectionProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FlowDirection", () => new Enum(FlowDirection), FrameworkElement, FlowDirection.LeftToRight, (d, args) => (<FrameworkElement>d)._SizeChanged(args), undefined, Providers._Inheritable.FlowDirection);
        static HeightProperty: DependencyProperty = DependencyProperty.RegisterCore("Height", () => Number, FrameworkElement, NaN, (d, args) => (<FrameworkElement>d)._HeightChanged(args));
        static HorizontalAlignmentProperty: DependencyProperty = DependencyProperty.RegisterCore("HorizontalAlignment", () => new Enum(HorizontalAlignment), FrameworkElement, HorizontalAlignment.Stretch, (d, args) => (<FrameworkElement>d)._AlignmentChanged(args));
        static MarginProperty: DependencyProperty = DependencyProperty.RegisterCore("Margin", () => Thickness, FrameworkElement, undefined, (d, args) => (<FrameworkElement>d)._SizeChanged(args));
        static MaxHeightProperty: DependencyProperty = DependencyProperty.RegisterCore("MaxHeight", () => Number, FrameworkElement, Number.POSITIVE_INFINITY, (d, args) => (<FrameworkElement>d)._SizeChanged(args));
        static MaxWidthProperty: DependencyProperty = DependencyProperty.RegisterCore("MaxWidth", () => Number, FrameworkElement, Number.POSITIVE_INFINITY, (d, args) => (<FrameworkElement>d)._SizeChanged(args));
        static MinHeightProperty: DependencyProperty = DependencyProperty.RegisterCore("MinHeight", () => Number, FrameworkElement, 0.0, (d, args) => (<FrameworkElement>d)._SizeChanged(args));
        static MinWidthProperty: DependencyProperty = DependencyProperty.RegisterCore("MinWidth", () => Number, FrameworkElement, 0.0, (d, args) => (<FrameworkElement>d)._SizeChanged(args));
        static StyleProperty: DependencyProperty = DependencyProperty.RegisterCore("Style", () => Style, FrameworkElement, undefined, (d, args) => (<FrameworkElement>d)._StyleChanged(args));
        static VerticalAlignmentProperty: DependencyProperty = DependencyProperty.RegisterCore("VerticalAlignment", () => new Enum(VerticalAlignment), FrameworkElement, VerticalAlignment.Stretch, (d, args) => (<FrameworkElement>d)._AlignmentChanged(args));
        static WidthProperty: DependencyProperty = DependencyProperty.RegisterCore("Width", () => Number, FrameworkElement, NaN, (d, args) => (<FrameworkElement>d)._WidthChanged(args));
        ActualHeight: number;
        ActualWidth: number;
        FlowDirection: FlowDirection;
        Height: number;
        HorizontalAlignment: HorizontalAlignment;
        Margin: Thickness;
        MaxWidth: number;
        MaxHeight: number;
        MinWidth: number;
        MinHeight: number;
        Style: Style;
        VerticalAlignment: VerticalAlignment;
        Width: number;
        SizeChanged: RoutedEvent = new RoutedEvent();
        Loaded: RoutedEvent = new RoutedEvent();
        Unloaded: RoutedEvent = new RoutedEvent();
        OnApplyTemplate() { }
        FindName(name: string): XamlObject {
            var n = this.XamlNode.FindName(name);
            if (n)
                return n.XObject;
        }
        private _MeasureOverride(availableSize: size, error: BError): size {
            var desired = new size();
            availableSize = size.clone(availableSize);
            size.max(availableSize, desired);
            var enumerator = this.XamlNode.GetVisualTreeEnumerator();
            while (enumerator.MoveNext()) {
                var childNode = <FENode>enumerator.Current;
                var childLu = childNode.LayoutUpdater;
                childLu._Measure(availableSize, error);
                desired = size.clone(childLu.DesiredSize);
            }
            size.min(desired, availableSize);
            return desired;
        }
        private _ArrangeOverride(finalSize: size, error: BError): size {
            var arranged = size.clone(finalSize);
            var enumerator = this.XamlNode.GetVisualTreeEnumerator();
            while (enumerator.MoveNext()) {
                var childNode = <FENode>enumerator.Current;
                var childRect = rect.fromSize(finalSize);
                childNode.LayoutUpdater._Arrange(childRect, error);
                size.max(arranged, finalSize);
            }
            return arranged;
        }
        private _StyleChanged(args: IDependencyPropertyChangedEventArgs) {
            var error = new BError();
            this._Store.SetLocalStyle(args.NewValue, error);
            if (error.Message)
                error.ThrowException();
        }
        private _SizeChanged(args: IDependencyPropertyChangedEventArgs) {
            var node = this.XamlNode;
            var lu = node.LayoutUpdater;
            lu.FullInvalidate(false);
            var vpNode = node.VisualParentNode;
            if (vpNode)
                vpNode.LayoutUpdater.InvalidateMeasure();
            lu.InvalidateMeasure();
            lu.InvalidateArrange();
            lu.UpdateBounds();
        }
        private _AlignmentChanged(args: IDependencyPropertyChangedEventArgs) {
            var lu = this.XamlNode.LayoutUpdater;
            lu.InvalidateArrange();
            lu.FullInvalidate(true);
        }
        _WidthChanged(args: IDependencyPropertyChangedEventArgs) {
            this._SizeChanged(args);
        }
        _HeightChanged(args: IDependencyPropertyChangedEventArgs) {
            this._SizeChanged(args);
        }
    }
    Nullstone.RegisterType(FrameworkElement, "FrameworkElement");
}

module Fayde.Media.Imaging {
    export class BitmapImage extends BitmapSource {
        static UriSourceProperty: DependencyProperty = DependencyProperty.RegisterFull("UriSource", () => Uri, BitmapImage, undefined, (d, args) => (<BitmapImage>d)._UriSourceChanged(args), undefined, undefined, true);
        UriSource: Uri;
        ImageFailed: MulticastEvent = new MulticastEvent();
        ImageOpened: MulticastEvent = new MulticastEvent();
        constructor(uri?: Uri) {
            super();
            if (uri)
                this.UriSource = uri;
        }
        private _UriSourceChanged(args: IDependencyPropertyChangedEventArgs) {
            var uri: Uri = args.NewValue;
            if (Uri.IsNullOrEmpty(uri))
                this.ResetImage();
            else
                this.UriSourceChanged(args.OldValue, uri);
        }
        private _OnErrored(e: Event) {
            super._OnErrored(e);
            this.ImageFailed.Raise(this, EventArgs.Empty);
        }
        private _OnLoad(e: Event) {
            super._OnLoad(e);
            this.ImageOpened.Raise(this, EventArgs.Empty);
        }
    }
    Nullstone.RegisterType(BitmapImage, "BitmapImage");
}

module Fayde.Shapes {
    declare var NotImplemented;
    export class ShapeNode extends FENode implements IBoundsComputable {
        XObject: Shape;
        constructor(xobj: Shape) {
            super(xobj);
        }
        _CanFindElement(): bool {
            var shape = this.XObject;
            return (<any>shape)._Fill != null || (<any>shape)._Stroke != null;
        }
        _InsideObject(ctx: RenderContext, lu: LayoutUpdater, x: number, y: number): bool {
            if (!this._InsideLayoutClip(lu, x, y))
                return false;
            if (!this._InsideClip(ctx, lu, x, y))
                return false;
            var p = new Point(x, y);
            lu.TransformPoint(p);
            x = p.X;
            y = p.Y;
            var shape = this.XObject;
            if (!rect.containsPointXY(this.GetStretchExtents(shape, lu), x, y))
                return false;
            return shape._InsideShape(ctx, lu, x, y);
        }
        ComputeBounds(baseComputer: () => void , lu: LayoutUpdater) {
            this.IntersectBaseBoundsWithClipPath(lu, lu.Bounds, this.GetStretchExtents(this.XObject, lu), lu.AbsoluteXform);
            rect.copyTo(lu.Bounds, lu.BoundsWithChildren);
            lu.ComputeGlobalBounds();
            lu.ComputeSurfaceBounds();
        }
        private IntersectBaseBoundsWithClipPath(lu: LayoutUpdater, dest: rect, baseBounds: rect, xform: number[]) {
            var isClipEmpty = rect.isEmpty(lu.ClipBounds);
            var isLayoutClipEmpty = rect.isEmpty(lu.LayoutClipBounds);
            if ((!isClipEmpty || !isLayoutClipEmpty) && !lu.TotalIsRenderVisible) {
                rect.clear(dest);
                return;
            }
            rect.copyGrowTransform(dest, baseBounds, lu.EffectPadding, xform);
            if (!isClipEmpty)
                rect.intersection(dest, lu.ClipBounds);
            if (!isLayoutClipEmpty)
                rect.intersection(dest, lu.LayoutClipBounds);
        }
        UpdateStretch() {
            var lu = this.LayoutUpdater;
            rect.clear(lu.Extents);
            rect.clear(lu.ExtentsWithChildren);
        }
        GetStretchExtents(shape: Shapes.Shape, lu: LayoutUpdater) {
            if (rect.isEmpty(lu.Extents)) {
                rect.copyTo(shape._ComputeStretchBounds(), lu.Extents);
                rect.copyTo(lu.Extents, lu.ExtentsWithChildren);
            }
            return lu.Extents;
        }
    }
    function isSignificant(dx: number, x: number): bool {
        return Math.abs(x) < 0.000019 && (Math.abs(dx) * x - x) > 1.0;
    }
    export class Shape extends FrameworkElement implements IMeasurableHidden, IArrangeableHidden, IRenderable, IActualSizeComputable, Media.IBrushChangedListener {
        XamlNode: ShapeNode;
        CreateNode(): ShapeNode { return new ShapeNode(this); }
        private _ShapeFlags: ShapeFlags = ShapeFlags.None;
        private _StretchXform: number[] = mat3.identity();
        private _NaturalBounds: rect = new rect();
        private _Path: RawPath = null;
        private _Fill: Media.Brush = null;
        private _Stroke: Media.Brush = null;
        static FillProperty: DependencyProperty = DependencyProperty.Register("Fill", () => Media.Brush, Shape, undefined, (d, args) => (<Shape>d)._FillChanged(args));
        static StretchProperty: DependencyProperty = DependencyProperty.Register("Stretch", () => new Enum(Media.Stretch), Shape, Media.Stretch.None, (d, args) => (<Shape>d)._StretchChanged(args));
        static StrokeProperty: DependencyProperty = DependencyProperty.Register("Stroke", () => Media.Brush, Shape, undefined, (d, args) => (<Shape>d)._StrokeChanged(args));
        static StrokeThicknessProperty: DependencyProperty = DependencyProperty.Register("StrokeThickness", () => Number, Shape, 1.0, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        static StrokeDashArrayProperty: DependencyProperty = DependencyProperty.Register("StrokeDashArray", () => DoubleCollection, Shape, undefined, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        static StrokeDashCapProperty: DependencyProperty = DependencyProperty.Register("StrokeDashCap", () => new Enum(PenLineCap), Shape, PenLineCap.Flat, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        static StrokeDashOffsetProperty: DependencyProperty = DependencyProperty.Register("StrokeDashOffset", () => Number, Shape, 0.0, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        static StrokeEndLineCapProperty: DependencyProperty = DependencyProperty.Register("StrokeEndLineCap", () => new Enum(PenLineCap), Shape, PenLineCap.Flat, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        static StrokeLineJoinProperty: DependencyProperty = DependencyProperty.Register("StrokeLineJoin", () => new Enum(PenLineJoin), Shape, PenLineJoin.Miter, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        static StrokeMiterLimitProperty: DependencyProperty = DependencyProperty.Register("StrokeMiterLimit", () => Number, Shape, 10.0, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        static StrokeStartLineCapProperty: DependencyProperty = DependencyProperty.Register("StrokeStartLineCap", () => new Enum(PenLineCap), Shape, PenLineCap.Flat, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        Fill: Media.Brush;
        Stretch: Media.Stretch;
        Stroke: Media.Brush;
        StrokeThickness: number;
        StrokeDashArray: DoubleCollection;
        StrokeDashCap: PenLineCap;
        StrokeDashOffset: number;
        StrokeEndLineCap: PenLineCap;
        StrokeLineJoin: PenLineJoin;
        StrokeMiterLimit: number;
        StrokeStartLineCap: PenLineCap;
        _InsideShape(ctx: RenderContext, lu: LayoutUpdater, x: number, y: number): bool {
            if (this._ShapeFlags & ShapeFlags.Empty)
                return false;
            var ret = false;
            var area = this.XamlNode.GetStretchExtents(this, lu);
            ctx.Save();
            ctx.PreTransformMatrix(this._StretchXform);
            if (this._Fill != null) {
                this._DrawPath(ctx);
                if (ctx.IsPointInPath(new Point(x, y)))
                    ret = true;
            }
            if (!ret && this._Stroke != null) {
                NotImplemented("Shape._InsideShape-Stroke");
            }
            ctx.Restore();
            return ret;
        }
        private _MeasureOverride(availableSize: size, error: BError): size {
            var shapeBounds = this._GetNaturalBounds();
            if (!shapeBounds)
                return new size();
            var sx = 0.0;
            var sy = 0.0;
            var desired;
            if (this instanceof Rectangle || this instanceof Ellipse)
                desired = new size();
            else
                desired = size.clone(availableSize);
            var stretch = this.Stretch;
            if (stretch === Media.Stretch.None) {
                return size.fromRaw(shapeBounds.X + shapeBounds.Width, shapeBounds.Y + shapeBounds.Height);
            }
            if (!isFinite(availableSize.Width))
                desired.Width = shapeBounds.Width;
            if (!isFinite(availableSize.Height))
                desired.Height = shapeBounds.Height;
            if (shapeBounds.Width > 0)
                sx = desired.Width / shapeBounds.Width;
            if (shapeBounds.Height > 0)
                sy = desired.Height / shapeBounds.Height;
            if (!isFinite(availableSize.Width))
                sx = sy;
            if (!isFinite(availableSize.Height))
                sy = sx;
            switch (stretch) {
                case Media.Stretch.Uniform:
                    sx = sy = Math.min(sx, sy);
                    break;
                case Media.Stretch.UniformToFill:
                    sx = sy = Math.max(sx, sy);
                    break;
                case Media.Stretch.Fill:
                    if (!isFinite(availableSize.Width))
                        sx = 1.0;
                    if (!isFinite(availableSize.Height))
                        sy = 1.0;
                    break;
                default:
                    break;
            }
            desired.Width = shapeBounds.Width * sx;
            desired.Height = shapeBounds.Height * sy;
            return desired;
        }
        private _ArrangeOverride(finalSize: size, error: BError): size {
            var sx = 1.0;
            var sy = 1.0;
            var shapeBounds = this._GetNaturalBounds();
            if (!shapeBounds)
                return new size();
            this._InvalidateStretch();
            var arranged;
            var stretch = this.Stretch;
            if (stretch === Fayde.Media.Stretch.None) {
                arranged = size.fromRaw(Math.max(finalSize.Width, shapeBounds.X + shapeBounds.Width), Math.max(finalSize.Height, shapeBounds.Y + shapeBounds.Height));
            } else {
                arranged = size.clone(finalSize);
            }
            if (shapeBounds.Width === 0)
                shapeBounds.Width = arranged.Width;
            if (shapeBounds.Height === 0)
                shapeBounds.Height = arranged.Height;
            if (shapeBounds.Width !== arranged.Width)
                sx = arranged.Width / shapeBounds.Width;
            if (shapeBounds.Height !== arranged.Height)
                sy = arranged.Height / shapeBounds.Height;
            switch (stretch) {
                case Fayde.Media.Stretch.Uniform:
                    sx = sy = Math.min(sx, sy);
                    break;
                case Fayde.Media.Stretch.UniformToFill:
                    sx = sy = Math.max(sx, sy);
                    break;
                default:
                    break;
            }
            arranged.Width = shapeBounds.Width * sx;
            arranged.Height = shapeBounds.Height * sy;
            return arranged;
        }
        private Render(ctx: RenderContext, lu: LayoutUpdater, region: rect) {
            if (this._ShapeFlags & ShapeFlags.Empty)
                return;
            var area = this.XamlNode.GetStretchExtents(this, lu);
            ctx.Save();
            ctx.PreTransformMatrix(this._StretchXform);
            this._DrawPath(ctx);
            if (this._Fill != null)
                ctx.Fill(this._Fill, area);
            if (this._Stroke != null)
                ctx.Stroke(this._Stroke, this.StrokeThickness, area);
            ctx.Restore();
        }
        _GetFillRule(): FillRule { return FillRule.NonZero; }
        _BuildPath() { }
        _DrawPath(ctx: RenderContext) { this._Path.DrawRenderCtx(ctx); }
        private ComputeActualSize(baseComputer: () => size, lu: LayoutUpdater) {
            var desired = baseComputer.call(this);
            var node = this.XamlNode;
            var lu = node.LayoutUpdater;
            var shapeBounds = this._GetNaturalBounds();
            var sx = 1.0;
            var sy = 1.0;
            var visualParentNode = node.VisualParentNode;
            if (visualParentNode != null && !(visualParentNode instanceof Controls.CanvasNode)) {
                if (lu.PreviousConstraint !== undefined || lu.LayoutSlot !== undefined) {
                    return desired;
                }
            }
            if (!node.IsAttached)
                return desired;
            if (shapeBounds.Width <= 0 && shapeBounds.Height <= 0)
                return desired;
            var stretch = this.Stretch;
            if (stretch === Media.Stretch.None && shapeBounds.Width > 0 && shapeBounds.Height > 0)
                return size.fromRect(shapeBounds);
            if (!isFinite(desired.Width))
                desired.Width = shapeBounds.Width;
            if (!isFinite(desired.Height))
                desired.Height = shapeBounds.Height;
            if (shapeBounds.Width > 0)
                sx = desired.Width / shapeBounds.Width;
            if (shapeBounds.Height > 0)
                sy = desired.Height / shapeBounds.Height;
            switch (stretch) {
                case Media.Stretch.Uniform:
                    sx = sy = Math.min(sx, sy);
                    break;
                case Media.Stretch.UniformToFill:
                    sx = sy = Math.max(sx, sy);
                    break;
                default:
                    break;
            }
            desired.Width = Math.min(desired.Width, shapeBounds.Width * sx);
            desired.Height = Math.min(desired.Height, shapeBounds.Height * sy);
            return desired;
        }
        _ComputeStretchBounds(): rect {
            var shapeBounds = this._GetNaturalBounds();
            if (!shapeBounds || shapeBounds.Width <= 0.0 || shapeBounds.Height <= 0.0) {
                this._ShapeFlags = ShapeFlags.Empty;
                return new rect();
            }
            var specified = size.fromRaw(this.Width, this.Height);
            var autoDim = isNaN(specified.Width);
            var framework = size.fromRaw(this.ActualWidth, this.ActualHeight);
            if (specified.Width <= 0.0 || specified.Height <= 0.0) {
                this._ShapeFlags = ShapeFlags.Empty;
                return new rect();
            }
            var node = this.XamlNode;
            var lu = node.LayoutUpdater;
            var vpNode = node.VisualParentNode;
            if (vpNode instanceof Controls.CanvasNode) {
                framework.Width = framework.Width === 0.0 ? shapeBounds.Width : framework.Width;
                framework.Height = framework.Height === 0.0 ? shapeBounds.Height : framework.Height;
                if (!isNaN(specified.Width))
                    framework.Width = specified.Width;
                if (!isNaN(specified.Height))
                    framework.Height = specified.Height;
            } else if (!lu.PreviousConstraint) {
                framework.Width = framework.Width === 0.0 ? shapeBounds.Width : framework.Width;
                framework.Height = framework.Height === 0.0 ? shapeBounds.Height : framework.Height;
            }
            var stretch = this.Stretch;
            if (stretch === Fayde.Media.Stretch.None) {
                rect.transform(shapeBounds, this._StretchXform);
                return shapeBounds;
            }
            if (framework.Width === 0.0 || framework.Height === 0.0) {
                this._ShapeFlags = ShapeFlags.Empty;
                return new rect();
            }
            var logicalBounds = this._ComputeShapeBoundsImpl(true, null);
            var adjX = logicalBounds.Width !== 0.0;
            var adjY = logicalBounds.Height !== 0.0;
            var diffX = shapeBounds.Width - logicalBounds.Width;
            var diffY = shapeBounds.Height - logicalBounds.Height;
            var sw = adjX ? (framework.Width - diffX) / logicalBounds.Width : 1.0;
            var sh = adjY ? (framework.Height - diffY) / logicalBounds.Height : 1.0;
            var center = false;
            switch (stretch) {
                case Media.Stretch.Fill:
                    center = true;
                    break;
                case Media.Stretch.Uniform:
                    sw = sh = (sw < sh) ? sw : sh;
                    center = true;
                    break;
                case Media.Stretch.UniformToFill:
                    sw = sh = (sw > sh) ? sw : sh;
                    break;
            }
            if ((adjX && isSignificant(sw - 1, shapeBounds.Width)) || (adjY && isSignificant(sh - 1, shapeBounds.Height))) {
                var temp = mat3.createScale(adjX ? sw : 1.0, adjY ? sh : 1.0);
                var stretchBounds = this._ComputeShapeBoundsImpl(false, temp);
                if (stretchBounds.Width !== shapeBounds.Width && stretchBounds.Height !== shapeBounds.Height) {
                    sw *= adjX ? (framework.Width - stretchBounds.Width + logicalBounds.Width * sw) / (logicalBounds.Width * sw) : 1.0;
                    sh *= adjY ? (framework.Height - stretchBounds.Height + logicalBounds.Height * sh) / (logicalBounds.Height * sh) : 1.0;
                    switch (stretch) {
                        case Media.Stretch.Uniform:
                            sw = sh = (sw < sh) ? sw : sh;
                            break;
                        case Media.Stretch.UniformToFill:
                            sw = sh = (sw > sh) ? sw : sh;
                            break;
                    }
                }
            }
            var x = (!autoDim || adjX) ? shapeBounds.X : 0;
            var y = (!autoDim || adjY) ? shapeBounds.Y : 0;
            var st = this._StretchXform;
            if (!(this instanceof Line) || !autoDim)
                mat3.translate(st, -x, -y);
            mat3.translate(st,
                adjX ? -shapeBounds.Width * 0.5 : 0.0,
                adjY ? -shapeBounds.Height * 0.5 : 0.0);
            mat3.scale(st,
                adjX ? sw : 1.0,
                adjY ? sh : 1.0);
            if (center) {
                mat3.translate(st,
                    adjX ? framework.Width * 0.5 : 0,
                    adjY ? framework.Height * 0.5 : 0);
            } else {
                mat3.translate(st,
                    adjX ? (logicalBounds.Width * sw + diffX) * 0.5 : 0,
                    adjY ? (logicalBounds.Height * sh + diffY) * 0.5 : 0);
            }
            this._StretchXform = st;
            rect.transform(shapeBounds, this._StretchXform);
            return shapeBounds;
        }
        private _GetNaturalBounds(): rect {
            if (!this._NaturalBounds)
                return;
            if (rect.isEmpty(this._NaturalBounds))
                this._NaturalBounds = this._ComputeShapeBoundsImpl(false);
            return this._NaturalBounds;
        }
        _ComputeShapeBounds(logical: bool): rect {
            return this._ComputeShapeBoundsImpl(logical, null);
        }
        _ComputeShapeBoundsImpl(logical: bool, matrix?): rect {
            var thickness = (logical || !this._Stroke) ? 0.0 : this.StrokeThickness;
            if (!this._Path)
                this._BuildPath();
            if (this._ShapeFlags & ShapeFlags.Empty)
                return new rect();
            if (logical) {
            } else if (thickness > 0) {
            } else {
            }
            NotImplemented("Shape._ComputeShapeBoundsImpl");
            return new rect();
        }
        private _InvalidateStretch() {
            this.XamlNode.UpdateStretch();
            this._StretchXform = mat3.identity();
            this._InvalidatePathCache();
        }
        _InvalidatePathCache(free?: bool) {
            this._Path = null;
            if (!free)
                this.XamlNode.LayoutUpdater.UpdateBounds(true);
        }
        _InvalidateNaturalBounds() {
            rect.clear(this._NaturalBounds);
            this._InvalidateStretch();
            this.XamlNode.LayoutUpdater.Invalidate();
        }
        private _FillChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldFill = <Media.Brush>args.OldValue;
            var newFill = <Media.Brush>args.NewValue;
            if (oldFill)
                oldFill.Unlisten(this);
            if (newFill)
                newFill.Listen(this);
            if (this._Fill || newFill)
                this._InvalidateNaturalBounds();
            this._Fill = newFill;
        }
        private _StrokeChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldStroke = <Media.Brush>args.OldValue;
            var newStroke = <Media.Brush>args.NewValue;
            if (oldStroke)
                oldStroke.Unlisten(this);
            if (newStroke)
                newStroke.Listen(this);
            if (this._Stroke || newStroke)
                this._InvalidateNaturalBounds();
            this._Stroke = newStroke;
        }
        private BrushChanged(newBrush: Media.Brush) {
            this.XamlNode.LayoutUpdater.Invalidate();
        }
        private _StretchChanged(args: IDependencyPropertyChangedEventArgs) {
            this.XamlNode.LayoutUpdater.InvalidateMeasure();
            this._InvalidateStretch();
        }
        private _WidthChanged(args: IDependencyPropertyChangedEventArgs) {
            super._WidthChanged(args);
            this._InvalidateStretch();
        }
        private _HeightChanged(args: IDependencyPropertyChangedEventArgs) {
            super._HeightChanged(args);
            this._InvalidateStretch();
        }
    }
    Nullstone.RegisterType(Shape, "Shape");
}

module Fayde.Controls {
    export class BorderNode extends FENode {
        XObject: Border;
        constructor(xobj: Border) {
            super(xobj);
            this.LayoutUpdater.SetContainerMode(true);
        }
        _CanFindElement(): bool {
            var xobj = this.XObject;
            return xobj.Background != null || xobj.BorderBrush != null;
        }
    }
    Nullstone.RegisterType(BorderNode, "BorderNode");
    export class Border extends FrameworkElement {
        XamlNode: BorderNode;
        CreateNode(): BorderNode { return new BorderNode(this); }
        static BackgroundProperty: DependencyProperty = DependencyProperty.RegisterCore("Background", () => Media.Brush, Border, undefined, (d, args) => (<Border>d)._BackgroundChanged(args));
        static BorderBrushProperty: DependencyProperty = DependencyProperty.RegisterCore("BorderBrush", () => Media.Brush, Border, undefined, (d, args) => (<Border>d)._BorderBrushChanged(args));
        static BorderThicknessProperty: DependencyProperty = DependencyProperty.RegisterFull("BorderThickness", () => Thickness, Border, undefined, (d, args) => (<Border>d)._BorderThicknessChanged(args)); //TODO: Validator
        static ChildProperty: DependencyProperty = DependencyProperty.RegisterCore("Child", () => UIElement, Border, undefined, (d, args) => (<Border>d)._ChildChanged(args));
        static CornerRadiusProperty: DependencyProperty = DependencyProperty.RegisterFull("CornerRadius", () => CornerRadius, Border); //TODO: Validator
        static PaddingProperty: DependencyProperty = DependencyProperty.RegisterFull("Padding", () => Thickness, Border, undefined, (d, args) => (<Border>d)._PaddingChanged(args)); //TODO: Validator
        Background: Media.Brush;
        BorderBrush: Media.Brush;
        BorderThickness: Thickness;
        Child: UIElement;
        CornerRadius: CornerRadius;
        Padding: Thickness;
        static Annotations = { ContentProperty: Border.ChildProperty }
        private _MeasureOverride(availableSize: size, error: BError): size {
            var padding = this.Padding;
            var borderThickness = this.BorderThickness;
            var border: Thickness = null;
            if (padding && borderThickness) {
                border = padding.Plus(borderThickness);
            } else if (padding) {
                border = padding;
            } else if (borderThickness) {
                border = borderThickness;
            }
            var desired = new size();
            if (border) availableSize = size.shrinkByThickness(size.clone(availableSize), border);
            var child = this.Child;
            if (child) {
                var lu = child.XamlNode.LayoutUpdater;
                lu._Measure(availableSize, error);
                desired = size.clone(lu.DesiredSize);
            }
            if (border) size.growByThickness(desired, border);
            size.min(desired, availableSize);
            return desired;
        }
        private _ArrangeOverride(finalSize: size, error: BError): size {
            var child = this.Child;
            if (child) {
                var padding = this.Padding;
                var borderThickness = this.BorderThickness;
                var border: Thickness = null;
                if (padding && borderThickness) {
                    border = padding.Plus(borderThickness);
                } else if (padding) {
                    border = padding;
                } else if (borderThickness) {
                    border = borderThickness;
                }
                var childRect = rect.fromSize(finalSize);
                if (border) rect.shrinkByThickness(childRect, border);
                child.XamlNode.LayoutUpdater._Arrange(childRect, error);
                /*
                arranged = size.fromRect(childRect);
                if (border) size.growByThickness(arranged, border);
                size.max(arranged, finalSize);
                */
            }
            return finalSize;
        }
        private _ChildChanged(args: IDependencyPropertyChangedEventArgs) {
            var olduie = <UIElement>args.OldValue;
            var newuie = <UIElement>args.NewValue;
            var node = this.XamlNode;
            var error = new BError();
            if (olduie instanceof UIElement)
                node.DetachVisualChild(olduie, error);
            if (newuie instanceof UIElement)
                node.AttachVisualChild(newuie, error);
            if (error.Message)
                error.ThrowException();
            var lu = node.LayoutUpdater;
            lu.UpdateBounds();
            lu.InvalidateMeasure();
        }
        private _BackgroundChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldBrush = <Media.Brush>args.OldValue;
            var newBrush = <Media.Brush>args.NewValue;
            if (oldBrush)
                oldBrush.Unlisten(this);
            if (newBrush)
                newBrush.Listen(this);
            this.BrushChanged(newBrush);
        }
        private _BorderBrushChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldBrush = <Media.Brush>args.OldValue;
            var newBrush = <Media.Brush>args.NewValue;
            if (oldBrush)
                oldBrush.Unlisten(this);
            if (newBrush)
                newBrush.Listen(this);
            this.BrushChanged(newBrush);
        }
        private _BorderThicknessChanged(args: IDependencyPropertyChangedEventArgs) {
            this.XamlNode.LayoutUpdater.InvalidateMeasure();
        }
        private _PaddingChanged(args: IDependencyPropertyChangedEventArgs) {
            this.XamlNode.LayoutUpdater.InvalidateMeasure();
        }
        private BrushChanged(newBrush: Media.Brush) { this.XamlNode.LayoutUpdater.Invalidate(); }
        private Render(ctx: RenderContext, lu:LayoutUpdater, region: rect) {
            var borderBrush = this.BorderBrush;
            var extents = lu.Extents;
            var backgroundBrush = this.Background;
            if (!backgroundBrush && !borderBrush)
                return;
            if (rect.isEmpty(extents))
                return;
            var thickness = this.BorderThickness;
            var fillOnly = !borderBrush || thickness.IsEmpty();
            if (fillOnly && !backgroundBrush)
                return;
            ctx.Save();
            lu._RenderLayoutClip(ctx);
            if (fillOnly)
                this._RenderFillOnly(ctx, extents, backgroundBrush, thickness, this.CornerRadius);
            else if (thickness.IsBalanced())
                this._RenderBalanced(ctx, extents, backgroundBrush, borderBrush, thickness, this.CornerRadius);
            else
                this._RenderUnbalanced(ctx, extents, backgroundBrush, borderBrush, thickness, this.CornerRadius);
            ctx.Restore();
        }
        private _RenderFillOnly(ctx: RenderContext, extents: rect, backgroundBrush: Media.Brush, thickness: Thickness, cornerRadius: CornerRadius) {
            var fillExtents = rect.clone(extents);
            if (!thickness.IsEmpty())
                rect.shrinkByThickness(fillExtents, thickness);
            if (cornerRadius.IsZero()) {
                ctx.FillRect(backgroundBrush, fillExtents);
                return;
            }
            var rawPath = new Shapes.RawPath();
            rawPath.RoundedRectFull(fillExtents.X, fillExtents.Y, fillExtents.Width, fillExtents.Height,
                cornerRadius.TopLeft, cornerRadius.TopRight, cornerRadius.BottomRight, cornerRadius.BottomLeft);
            rawPath.DrawRenderCtx(ctx);
            ctx.Fill(backgroundBrush, fillExtents);
        }
        private _RenderBalanced(ctx: RenderContext, extents: rect, backgroundBrush: Media.Brush, borderBrush: Media.Brush, thickness: Thickness, cornerRadius: CornerRadius) {
            var full = thickness.Left;
            var half = full * 0.5;
            var strokeExtents = rect.clone(extents);
            rect.shrinkBy(strokeExtents, half, half, half, half);
            var fillExtents = rect.clone(extents);
            rect.shrinkBy(fillExtents, full, full, full, full);
            if (cornerRadius.IsZero()) {
                if (backgroundBrush) {
                    ctx.StrokeAndFillRect(borderBrush, thickness.Left, strokeExtents, backgroundBrush, fillExtents);
                } else {
                    ctx.Rect(fillExtents);
                    ctx.Stroke(borderBrush, thickness.Left, extents);
                }
            } else {
                var rawPath = new Shapes.RawPath();
                rawPath.RoundedRectFull(strokeExtents.X, strokeExtents.Y, strokeExtents.Width, strokeExtents.Height,
                    cornerRadius.TopLeft, cornerRadius.TopRight, cornerRadius.BottomRight, cornerRadius.BottomLeft);
                rawPath.DrawRenderCtx(ctx);
                if (backgroundBrush)
                    ctx.Fill(backgroundBrush, fillExtents);
                ctx.Stroke(borderBrush, thickness.Left, extents);
            }
        }
        private _RenderUnbalanced(ctx: RenderContext, extents: rect, backgroundBrush: Media.Brush, borderBrush: Media.Brush, thickness: Thickness, cornerRadius: CornerRadius) {
            var hasCornerRadius = !cornerRadius.IsZero();
            var innerExtents = rect.clone(extents);
            rect.shrinkByThickness(innerExtents, thickness);
            var innerPath = new Fayde.Shapes.RawPath();
            var outerPath = new Fayde.Shapes.RawPath();
            if (hasCornerRadius) {
                outerPath.RoundedRectFull(0, 0, extents.Width, extents.Height,
                    cornerRadius.TopLeft, cornerRadius.TopRight, cornerRadius.BottomRight, cornerRadius.BottomLeft);
                innerPath.RoundedRectFull(innerExtents.X - extents.X, innerExtents.Y - extents.Y, innerExtents.Width, innerExtents.Height,
                    cornerRadius.TopLeft, cornerRadius.TopRight, cornerRadius.BottomRight, cornerRadius.BottomLeft);
            } else {
                outerPath.Rect(0, 0, extents.Width, extents.Height);
                innerPath.Rect(innerExtents.X - extents.X, innerExtents.Y - extents.Y, innerExtents.Width, innerExtents.Height);
            }
            var tmpCanvas = <HTMLCanvasElement>document.createElement("canvas");
            tmpCanvas.width = extents.Width;
            tmpCanvas.height = extents.Height;
            var tmpCtx = tmpCanvas.getContext("2d");
            outerPath.DrawCanvasCtx(tmpCtx);
            borderBrush.SetupBrush(tmpCtx, extents);
            tmpCtx.fillStyle = borderBrush.ToHtml5Object();
            tmpCtx.fill();
            tmpCtx.globalCompositeOperation = "xor";
            innerPath.DrawCanvasCtx(tmpCtx);
            tmpCtx.fill();
            ctx.CanvasContext.drawImage(tmpCanvas, extents.X, extents.Y);
            innerPath.DrawRenderCtx(ctx);
            if (backgroundBrush)
                ctx.Fill(backgroundBrush, innerExtents);
        }
    }
    Nullstone.RegisterType(Border, "Border");
}

module Fayde.Controls {
    export class ContentPresenterNode extends FENode {
        _ContentRoot: UIElement;
        XObject: ContentPresenter;
        constructor(xobj:ContentPresenter) {
            super(xobj);
        }
        _ClearRoot() {
            if (this._ContentRoot)
                this.DetachVisualChild(this._ContentRoot, null);
            this._ContentRoot = null;
        }
        private _FallbackRoot: UIElement;
        private _FallbackTemplate: ControlTemplate;
        get FallbackRoot(): UIElement {
            var fr = this._FallbackRoot;
            if (!fr) {
                var ft = this._FallbackTemplate;
                if (!ft)
                    ft = this._CreateFallbackTemplate();
                fr = this._FallbackRoot = <UIElement>ft.GetVisualTree(this.XObject);
            }
            return fr;
        }
        private _CreateFallbackTemplate(): ControlTemplate {
            return new ControlTemplate(ContentPresenter, {
                ParseType: Grid,
                Children: [
                    {
                        ParseType: TextBlock,
                        Props: {
                            Text: new BindingMarkup({})
                        }
                    }
                ]
            });
        }
        InvokeLoaded() {
            var xobj = this.XObject;
            if (xobj.Content instanceof UIElement)
                xobj.ClearValue(DependencyObject.DataContextProperty);
            else
                xobj.SetValue(DependencyObject.DataContextProperty, xobj.Content);
        }
        _GetDefaultTemplate(): UIElement {
            var xobj = this.XObject;
            if (xobj.TemplateOwner instanceof ContentControl) {
                if (xobj.ReadLocalValue(ContentPresenter.ContentProperty) instanceof UnsetValue) {
                    xobj.SetValue(ContentPresenter.ContentProperty,
                        new TemplateBindingExpression(ContentControl.ContentProperty, ContentPresenter.ContentProperty, "Content"));
                }
                if (xobj.ReadLocalValue(ContentPresenter.ContentTemplateProperty) instanceof UnsetValue) {
                    xobj.SetValue(ContentPresenter.ContentTemplateProperty,
                        new TemplateBindingExpression(ContentControl.ContentTemplateProperty, ContentPresenter.ContentTemplateProperty, "ContentTemplate"));
                }
            }
            if (xobj.ContentTemplate instanceof ControlTemplate) {
                var vt = (<ControlTemplate>xobj.ContentTemplate).GetVisualTree(this.XObject);
                if (vt instanceof UIElement)
                    this._ContentRoot = <UIElement>vt;
            } else {
                var content = xobj.Content;
                if (content instanceof UIElement)
                    this._ContentRoot = content;
                if (!this._ContentRoot && content)
                    this._ContentRoot = this.FallbackRoot;
            }
            return this._ContentRoot;
        }
    }
    Nullstone.RegisterType(ContentPresenterNode, "ContentPresenterNode");
    export class ContentPresenter extends FrameworkElement {
        XamlNode: ContentPresenterNode;
        CreateNode(): ContentPresenterNode { return new ContentPresenterNode(this); }
        static ContentProperty: DependencyProperty = DependencyProperty.Register("Content", () => Object, ContentPresenter, undefined, (d, args) => (<ContentPresenter>d)._ContentChanged(args));
        static ContentTemplateProperty: DependencyProperty = DependencyProperty.Register("ContentTemplate", () => ControlTemplate, ContentPresenter, undefined, (d, args) => (<ContentPresenter>d)._ContentTemplateChanged(args));
        Content: any;
        ContentTemplate: ControlTemplate;
        static Annotations = { ContentProperty: ContentPresenter.ContentProperty }
        _ContentChanged(args: IDependencyPropertyChangedEventArgs) {
            var node = this.XamlNode;
            var newContent = args.NewValue;
            var newUie: UIElement;
            if (newContent instanceof UIElement)
                newUie = newContent;
            if (newUie || args.OldValue instanceof UIElement)
                node._ClearRoot();
            if (newContent && !newUie)
                this._Store.SetValue(DependencyObject.DataContextProperty, newContent);
            else
                this._Store.ClearValue(DependencyObject.DataContextProperty);
            node.LayoutUpdater.InvalidateMeasure();
        }
        _ContentTemplateChanged(args: IDependencyPropertyChangedEventArgs) {
            var node = this.XamlNode;
            node._ClearRoot();
            node.LayoutUpdater.InvalidateMeasure();
        }
    }
    Nullstone.RegisterType(ContentPresenter, "ContentPresenter");
}

module Fayde.Controls {
    export class ControlNode extends FENode {
        private _Surface: Surface;
        XObject: Control;
        TemplateRoot: FrameworkElement;
        IsFocused: bool = false;
        constructor(xobj: Control) {
            super(xobj);
            this.LayoutUpdater.SetContainerMode(true);
        }
        TabTo() {
            var xobj = this.XObject;
            return xobj.IsEnabled && xobj.IsTabStop && this.Focus();
        }
        _DoApplyTemplateWithError(error: BError): bool {
            var xobj = this.XObject;
            var t = xobj.Template;
            if (!t)
                return super._DoApplyTemplateWithError(error);
            var root = <UIElement>t._GetVisualTreeWithError(xobj, error);
            if (root && !(root instanceof UIElement)) {
                Warn("Root element in template was not a UIElement.");
                root = null;
            }
            if (!root)
                return super._DoApplyTemplateWithError(error);
            if (this.TemplateRoot && this.TemplateRoot !== root)
                this.DetachVisualChild(this.TemplateRoot, error)
            this.TemplateRoot = <FrameworkElement>root;
            if (this.TemplateRoot)
                this.AttachVisualChild(this.TemplateRoot, error);
            if (error.Message)
                return false;
            return true;
        }
        OnIsAttachedChanged(newIsAttached: bool) {
            super.OnIsAttachedChanged(newIsAttached);
            if (!newIsAttached)
                Media.VSM.VisualStateManager.DestroyStoryboards(this.XObject, this.TemplateRoot);
        }
        OnIsEnabledChanged(newIsEnabled: bool) {
            var surface = this._Surface;
            if (surface) {
                surface._RemoveFocusFrom(this.LayoutUpdater);
                TabNavigationWalker.Focus(this, true);
            }
            this.ReleaseMouseCapture();
        }
        _FindElementsInHostCoordinates(ctx: RenderContext, p: Point, uinlist: UINode[]) {
            if (this.XObject.IsEnabled)
                super._FindElementsInHostCoordinates(ctx, p, uinlist);
        }
        _HitTestPoint(ctx: RenderContext, p: Point, uinlist: UINode[]) {
            if (this.XObject.IsEnabled)
                super._HitTestPoint(ctx, p, uinlist);
        }
        _CanFindElement(): bool { return this.XObject.IsEnabled; }
        _InsideObject(ctx: RenderContext, lu: LayoutUpdater, x: number, y: number): bool { return false; }
        Focus(): bool { return this._Surface.Focus(this); }
        CanCaptureMouse(): bool { return this.XObject.IsEnabled; }
    }
    Nullstone.RegisterType(ControlNode, "ControlNode");
    export class Control extends FrameworkElement {
        XamlNode: ControlNode;
        _Store: Providers.ControlProviderStore;
        CreateStore(): Providers.ControlProviderStore {
            var s = new Providers.ControlProviderStore(this);
            s.SetProviders([
                new Providers.InheritedIsEnabledProvider(s),
                new Providers.LocalValueProvider(),
                new Providers.FrameworkElementDynamicProvider(),
                new Providers.LocalStyleProvider(s),
                new Providers.ImplicitStyleProvider(s),
                new Providers.InheritedProvider(),
                new Providers.InheritedDataContextProvider(s),
                new Providers.DefaultValueProvider(),
                new Providers.AutoCreateProvider()]
            );
            return s;
        }
        CreateNode(): ControlNode { return new ControlNode(this); }
        static BackgroundProperty: DependencyProperty = DependencyProperty.RegisterCore("Background", () => Media.Brush, Control);
        static BorderBrushProperty: DependencyProperty = DependencyProperty.RegisterCore("BorderBrush", () => Media.Brush, Control);
        static BorderThicknessProperty: DependencyProperty = DependencyProperty.RegisterCore("BorderThickness", () => Thickness, Control, undefined, (d, args) => (<Control>d)._BorderThicknessChanged(args));
        static FontFamilyProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontFamily", () => String, Control, Font.DEFAULT_FAMILY, undefined, undefined, Providers._Inheritable.FontFamily);
        static FontSizeProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontSize", () => Number, Control, Font.DEFAULT_SIZE, undefined, undefined, Providers._Inheritable.FontSize);
        static FontStretchProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontStretch", () => String, Control, Font.DEFAULT_STRETCH, undefined, undefined, Providers._Inheritable.FontStretch);
        static FontStyleProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontStyle", () => String, Control, Font.DEFAULT_STYLE, undefined, undefined, Providers._Inheritable.FontStyle);
        static FontWeightProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontWeight", () => new Enum(FontWeight), Control, Font.DEFAULT_WEIGHT, undefined, undefined, Providers._Inheritable.FontWeight);
        static ForegroundProperty: DependencyProperty = DependencyProperty.RegisterInheritable("Foreground", () => Media.Brush, Control, undefined, undefined, undefined, Providers._Inheritable.Foreground);
        static HorizontalContentAlignmentProperty: DependencyProperty = DependencyProperty.RegisterCore("HorizontalContentAlignment", () => new Enum(HorizontalAlignment), Control, HorizontalAlignment.Center, (d, args) => (<Control>d)._ContentAlignmentChanged(args));
        static IsEnabledProperty: DependencyProperty = DependencyProperty.RegisterCore("IsEnabled", () => Boolean, Control, true, (d, args) => (<Control>d)._IsEnabledChanged(args));
        static IsTabStopProperty: DependencyProperty = DependencyProperty.Register("IsTabStop", () => Boolean, Control, true);
        static PaddingProperty: DependencyProperty = DependencyProperty.RegisterCore("Padding", () => Thickness, Control, undefined, (d, args) => (<Control>d)._BorderThicknessChanged(args));
        static TabIndexProperty: DependencyProperty = DependencyProperty.Register("TabIndex", () => Number, Control);
        static TabNavigationProperty: DependencyProperty = DependencyProperty.Register("TabNavigation", () => new Enum(Input.KeyboardNavigationMode), Control, Input.KeyboardNavigationMode.Local);
        static TemplateProperty: DependencyProperty = DependencyProperty.RegisterCore("Template", () => ControlTemplate, Control, undefined, (d, args) => (<Control>d)._TemplateChanged(args));
        static VerticalContentAlignmentProperty: DependencyProperty = DependencyProperty.RegisterCore("VerticalContentAlignment", () => new Enum(VerticalAlignment), Control, VerticalAlignment.Center, (d, args) => (<Control>d)._ContentAlignmentChanged(args));
        static DefaultStyleKeyProperty: DependencyProperty = DependencyProperty.Register("DefaultStyleKey", () => Function, Control);
        Background: Media.Brush;
        BorderBrush: Media.Brush;
        BorderThickness: Thickness;
        FontFamily: string;
        FontSize: number;
        FontStretch: string;
        FontStyle: string;
        FontWeight: FontWeight;
        Foreground: Media.Brush;
        HorizontalContentAlignment: HorizontalAlignment;
        IsEnabled: bool;
        IsTabStop: bool;
        Padding: Thickness;
        TabIndex: number;
        TabNavigation: Input.KeyboardNavigationMode;
        Template: ControlTemplate;
        VerticalContentAlignment: VerticalAlignment;
        DefaultStyleKey: Function;
        private _IsMouseOver: bool = false; //Defined in UIElement
        get IsFocused() { return this.XamlNode.IsFocused; }
        GetTemplateChild(childName: string): DependencyObject {
            var root = this.XamlNode.TemplateRoot;
            if (root) {
                var n = root.XamlNode.FindName(name);
                if (n) return <DependencyObject>n.XObject;
            }
        }
        ApplyTemplate(): bool {
            var error = new BError();
            var result = this.XamlNode._ApplyTemplateWithError(error);
            if (error.Message)
                error.ThrowException();
            return result;
        }
        GetDefaultStyle(): Style {
            return undefined;
        }
        IsEnabledChanged: MulticastEvent = new MulticastEvent();
        _IsEnabledChanged(args: IDependencyPropertyChangedEventArgs) {
            if (!args.NewValue) {
                this._IsMouseOver = false;
                this.XamlNode.OnIsEnabledChanged(args.NewValue);
            }
            this.OnIsEnabledChanged(args);
            this.IsEnabledChanged.RaiseAsync(this, EventArgs.Empty);
        }
        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs) { }
        OnGotFocus(e: RoutedEventArgs) { this.XamlNode.IsFocused = true; }
        OnLostFocus(e: RoutedEventArgs) { this.XamlNode.IsFocused = false; }
        OnLostMouseCapture(e: Input.MouseEventArgs) { }
        OnKeyDown(e: Input.KeyEventArgs) { }
        OnKeyUp(e: Input.KeyEventArgs) { }
        OnMouseEnter(e: Input.MouseEventArgs) { }
        OnMouseLeave(e: Input.MouseEventArgs) { }
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) { }
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs) { }
        OnMouseMove(e: Input.MouseEventArgs) { }
        OnMouseRightButtonDown(e: Input.MouseButtonEventArgs) { }
        OnMouseRightButtonUp(e: Input.MouseButtonEventArgs) { }
        OnMouseWheel(e: Input.MouseWheelEventArgs) { }
        UpdateVisualState(useTransitions?: bool) {
            useTransitions = useTransitions !== false;
            var states = this.GetVisualStateNamesToActivate();
            for (var i = 0; i < states.length; i++) {
                Media.VSM.VisualStateManager.GoToState(this, states[i], useTransitions);
            }
        }
        GetVisualStateNamesToActivate(): string[] {
            var commonState = this.GetVisualStateCommon();
            var focusedState = this.GetVisualStateFocus();
            return [commonState, focusedState];
        }
        GetVisualStateCommon() {
            if (!this.IsEnabled) {
                return "Disabled";
            } else if (this.IsMouseOver) {
                return "MouseOver";
            } else {
                return "Normal";
            }
        }
        GetVisualStateFocus() {
            if (this.IsFocused && this.IsEnabled)
                return "Focused";
            else
                return "Unfocused";
        }
        private _TemplateChanged(args: IDependencyPropertyChangedEventArgs) {
            var node = this.XamlNode;
            var subtree = node.SubtreeNode;
            if (subtree) {
                var error = new BError();
                if (!node.DetachVisualChild(<UIElement>subtree.XObject, error))
                    error.ThrowException();
            }
            node.LayoutUpdater.InvalidateMeasure();
        }
        private _PaddingChanged(args: IDependencyPropertyChangedEventArgs) {
            this.XamlNode.LayoutUpdater.InvalidateMeasure();
        }
        private _BorderThicknessChanged(args: IDependencyPropertyChangedEventArgs) {
            this.XamlNode.LayoutUpdater.InvalidateMeasure();
        }
        private _ContentAlignmentChanged(args: IDependencyPropertyChangedEventArgs) {
            this.XamlNode.LayoutUpdater.InvalidateArrange();
        }
    }
    Nullstone.RegisterType(Control, "Control");
}

module Fayde.Controls {
    function computeMatrix(width: number, height: number, sw: number, sh: number, stretch: Media.Stretch, alignX: Media.AlignmentX, alignY: Media.AlignmentY): number[] {
        var sx = width / sw;
        var sy = height / sh;
        if (width === 0)
            sx = 1.0;
        if (height === 0)
            sy = 1.0;
        if (stretch === Media.Stretch.Fill) {
            return mat3.createScale(sx, sy);
        }
        var scale = 1.0;
        var dx = 0.0;
        var dy = 0.0;
        switch (stretch) {
            case Media.Stretch.Uniform:
                scale = sx < sy ? sx : sy;
                break;
            case Media.Stretch.UniformToFill:
                scale = sx < sy ? sy : sx;
                break;
            case Media.Stretch.None:
                break;
        }
        switch (alignX) {
            case Media.AlignmentX.Left:
                dx = 0.0;
                break;
            case Media.AlignmentX.Center:
                dx = (width - (scale * sw)) / 2;
                break;
            case Media.AlignmentX.Right:
            default:
                dx = width - (scale * sw);
                break;
        }
        switch (alignY) {
            case Media.AlignmentY.Top:
                dy = 0.0;
                break;
            case Media.AlignmentY.Center:
                dy = (height - (scale * sh)) / 2;
                break;
            case Media.AlignmentY.Bottom:
            default:
                dy = height - (scale * sh);
                break;
        }
        var m = mat3.createScale(scale, scale);
        mat3.translate(m, dx, dy);
        return m;
    }
    function calculateRenderMetrics(img: Image, source: Media.Imaging.ImageSource, lu: LayoutUpdater): IImageRenderMetrics {
        var stretch = img.Stretch;
        var specified = size.fromRaw(img.ActualWidth, img.ActualHeight);
        var stretched = lu.CoerceSize(size.clone(specified));
        var adjust = !size.isEqual(specified, lu.RenderSize);
        var pixelWidth = source.PixelWidth;
        var pixelHeight = source.PixelHeight;
        if (pixelWidth === 0 || pixelHeight === 0)
            return null;
        if (stretch !== Fayde.Media.Stretch.UniformToFill)
            size.min(specified, stretched);
        var paint = rect.fromSize(specified);
        var image = new rect();
        image.Width = pixelWidth;
        image.Height = pixelHeight;
        if (stretch === Fayde.Media.Stretch.None)
            rect.union(paint, image);
        var matrix = computeMatrix(paint.Width, paint.Height, image.Width, image.Height,
            stretch, Fayde.Media.AlignmentX.Center, Fayde.Media.AlignmentY.Center);
        if (adjust) {
            (<IMeasurableHidden>img)._MeasureOverride(specified, null);
            rect.set(paint,
                (stretched.Width - specified.Width) * 0.5,
                (stretched.Height - specified.Height) * 0.5,
                specified.Width,
                specified.Height);
        }
        var overlap = RectOverlap.In;
        if (stretch === Fayde.Media.Stretch.UniformToFill || adjust) {
            var bounds = rect.clone(paint);
            rect.roundOut(bounds);
            var box = rect.clone(image);
            rect.transform(box, matrix);
            rect.roundIn(box);
            overlap = rect.rectIn(bounds, box);
        }
        return {
            Matrix: matrix,
            Overlap: overlap
        };
    }
    export interface IImageRenderMetrics {
        Matrix: number[];
        Overlap: number;
    }
    export class ImageNode extends FENode {
        XObject: Image;
        constructor(xobj: Image) {
            super(xobj);
        }
        _CanFindElement(): bool { return true; }
        _InsideObject(ctx: RenderContext, lu: LayoutUpdater, x: number, y: number): bool {
            if (!super._InsideObject(ctx, lu, x, y))
                return false;
            var img = this.XObject;
            var source = img.Source;
            if (!source)
                return false;
            var stretch = img.Stretch;
            if (stretch === Media.Stretch.Fill || stretch === Media.Stretch.UniformToFill)
                return true;
            var metrics = calculateRenderMetrics(img, source, lu);
            if (!metrics)
                return null;
            var irect = new rect();
            irect.Width = source.PixelWidth;
            irect.Height = source.PixelHeight;
            rect.transform(irect, metrics.Matrix);
            var np = new Point(x, y);
            lu.TransformPoint(np);
            return rect.containsPoint(irect, np);
        }
    }
    Nullstone.RegisterType(ImageNode, "ImageNode");
    export class Image extends FrameworkElement implements IActualSizeComputable, IMeasurableHidden, IArrangeableHidden, IRenderable, Media.Imaging.IImageChangedListener {
        XamlNode: ImageNode;
        CreateNode(): ImageNode { return new ImageNode(this); }
        static SourceProperty: DependencyProperty = DependencyProperty.RegisterFull("Source", () => Media.Imaging.ImageSource, Image, undefined, (d, args) => (<Image>d)._SourceChanged(args));
        static StretchProperty: DependencyProperty = DependencyProperty.RegisterCore("Stretch", () => new Enum(Media.Stretch), Image, Media.Stretch.Uniform);
        Source: Media.Imaging.ImageSource;
        Stretch: Media.Stretch;
        ImageOpened: MulticastEvent = new MulticastEvent();
        ImageFailed: MulticastEvent = new MulticastEvent();
        private _MeasureOverride(availableSize: size, error: BError): size {
            var desired = size.clone(availableSize);
            var shapeBounds = new rect();
            var source = this.Source;
            var sx = 0.0; 
            var sy = 0.0;
            if (source) {
                shapeBounds.Width = source.PixelWidth;
                shapeBounds.Height = source.PixelHeight;
            }
            if (!isFinite(desired.Width))
                desired.Width = shapeBounds.Width;
            if (!isFinite(desired.Height))
                desired.Height = shapeBounds.Height;
            if (shapeBounds.Width > 0)
                sx = desired.Width / shapeBounds.Width;
            if (shapeBounds.Height > 0)
                sy = desired.Height / shapeBounds.Height;
            if (!isFinite(availableSize.Width))
                sx = sy;
            if (!isFinite(availableSize.Height))
                sy = sx;
            switch (this.Stretch) {
                case Media.Stretch.Uniform:
                    sx = sy = Math.min(sx, sy);
                    break;
                case Media.Stretch.UniformToFill:
                    sx = sy = Math.max(sx, sy);
                    break;
                case Media.Stretch.Fill:
                    if (!isFinite(availableSize.Width))
                        sx = sy;
                    if (!isFinite(availableSize.Height))
                        sy = sx;
                    break;
                case Media.Stretch.None:
                    sx = sy = 1.0;
                    break;
            }
            desired.Width = shapeBounds.Width * sx;
            desired.Height = shapeBounds.Height * sy;
            return desired;
        }
        private _ArrangeOverride(finalSize: size, error: BError): size {
            var arranged = size.clone(finalSize);
            var shapeBounds = new rect();
            var source = this.Source;
            var sx = 1.0;
            var sy = 1.0;
            if (source) {
                shapeBounds.Width = source.PixelWidth;
                shapeBounds.Height = source.PixelHeight;
            }
            if (shapeBounds.Width === 0)
                shapeBounds.Width = arranged.Width;
            if (shapeBounds.Height === 0)
                shapeBounds.Height = arranged.Height;
            if (shapeBounds.Width !== arranged.Width)
                sx = arranged.Width / shapeBounds.Width;
            if (shapeBounds.Height !== arranged.Height)
                sy = arranged.Height / shapeBounds.Height;
            switch (this.Stretch) {
                case Media.Stretch.Uniform:
                    sx = sy = Math.min(sx, sy);
                    break;
                case Media.Stretch.UniformToFill:
                    sx = sy = Math.max(sx, sy);
                    break;
                case Media.Stretch.None:
                    sx = sy = 1.0;
                    break;
                default:
                    break;
            }
            arranged.Width = shapeBounds.Width * sx;
            arranged.Height = shapeBounds.Height * sy;
            return arranged;
        }
        private Render(ctx: RenderContext, lu: LayoutUpdater, region: rect) {
            var source = this.Source;
            if (!source)
                return;
            source.Lock();
            var metrics = calculateRenderMetrics(this, source, lu);
            if (!metrics) {
                source.Unlock();
                return;
            }
            ctx.Save();
            if (metrics.Overlap !== RectOverlap.In || lu._HasLayoutClip())
                lu._RenderLayoutClip(ctx);
            ctx.PreTransformMatrix(metrics.Matrix);
            ctx.CanvasContext.drawImage(source.Image, 0, 0);
            ctx.Restore();
            source.Unlock();
        }
        private ComputeActualSize(baseComputer: () => size, lu: LayoutUpdater) {
            var result = baseComputer.call(lu);
            var vpNode = this.XamlNode.VisualParentNode;
            if (parent && !(parent instanceof Canvas))
                if (lu.LayoutSlot !== undefined)
                    return result;
            var source = this.Source;
            if (source) {
                var available = lu.CoerceSize(size.createInfinite());
                result = this._MeasureOverride(available, null);
                lu.CoerceSize(result);
            }
            return result;
        }
        private _SourceChanged(args: IDependencyPropertyChangedEventArgs) {
            var lu = this.XamlNode.LayoutUpdater;
            var oldSource = <Media.Imaging.ImageSource>args.OldValue;
            var newSource = <Media.Imaging.ImageSource>args.NewValue;
            if (oldSource instanceof Media.Imaging.BitmapSource)
                (<Media.Imaging.BitmapSource>oldSource).Unlisten(this);
            if (newSource instanceof Media.Imaging.BitmapSource) {
                (<Media.Imaging.BitmapSource>newSource).Listen(this);
            } else {
                lu.UpdateBounds();
                lu.Invalidate();
            }
            lu.InvalidateMeasure();
        }
        private OnImageErrored(source: Media.Imaging.BitmapSource, e: Event) { this.ImageFailed.Raise(this, EventArgs.Empty); }
        private OnImageLoaded(source: Media.Imaging.BitmapSource, e: Event) { this.ImageOpened.Raise(this, EventArgs.Empty); }
        private ImageChanged(source: Media.Imaging.BitmapSource) {
            var lu = this.XamlNode.LayoutUpdater;
            lu.InvalidateMeasure();
            lu.Invalidate();
        }
    }
    Nullstone.RegisterType(Image, "Image");
}

module Fayde.Controls {
    export class ItemsControl extends Control {
        private _Presenter: ItemsPresenter;
        ItemContainerGenerator: ItemContainerGenerator;
        constructor() {
            super();
            var icg = new ItemContainerGenerator(this);
            Object.defineProperty(this, "ItemContainerGenerator", {
                value: icg,
                writable: false
            });
        }
        Items: XamlObjectCollection; //TODO: Implement
        ItemsPanel: ItemsPanelTemplate; //TODO: Implement
        get Panel(): Panel { return this._Presenter.ElementRoot; }
        static GetItemsOwner(uie: UIElement): ItemsControl {
            if (!(uie instanceof Panel))
                return null;
            var panel = <Panel>uie;
            if (!panel.IsItemsHost)
                return null;
            var presenter = <ItemsPresenter>panel.TemplateOwner;
            if (!(presenter instanceof ItemsPresenter))
                return null;
            var ic = <ItemsControl>presenter.TemplateOwner;
            if (ic instanceof ItemsControl)
                return ic;
            return null;
        }
        _SetItemsPresenter(presenter: ItemsPresenter) {
            if (this._Presenter)
                this._Presenter.ElementRoot.Children.Clear();
            this._Presenter = presenter;
            this.AddItemsToPresenter(-1, 1, this.Items.Count);
        }
        AddItemsToPresenter(positionIndex: number, positionOffset: number, count: number) {
        }
        PrepareContainerForItem(container: DependencyObject, item: any) {
            /*
            if (this.DisplayMemberPath != null && this.ItemTemplate != null)
                throw new InvalidOperationException("Cannot set 'DisplayMemberPath' and 'ItemTemplate' simultaenously");
            this.UpdateContentTemplateOnContainer(element, item);
            */
        }
        ClearContainerForItem(container: DependencyObject, item: any) { }
        GetContainerForItem(): DependencyObject { return new ContentPresenter(); }
        IsItemItsOwnContainer(item: any): bool { return item instanceof FrameworkElement; }
    }
    Nullstone.RegisterType(ItemsControl, "ItemsControl");
}

module Fayde.Controls {
    export class ItemsPresenterNode extends FENode {
        XObject: ItemsPresenter;
        private _ElementRoot: Panel;
        private _SPFT: ItemsPanelTemplate;
        private _VSPFT: ItemsPanelTemplate;
        constructor(xobj: ItemsPresenter) {
            super(xobj);
        }
        get ElementRoot(): Panel {
            if (!this._ElementRoot) {
                var error = new BError();
                this._DoApplyTemplateWithError(error);
                if (error.Message)
                    error.ThrowException();
            }
            return this._ElementRoot;
        }
        get StackPanelFallbackTemplate(): ItemsPanelTemplate {
            var spft = this._SPFT;
            if (!spft)
                this._SPFT = spft = new ItemsPanelTemplate({ ParseType: StackPanel });
            return spft;
        }
        get VirtualizingStackPanelFallbackTemplate(): ItemsPanelTemplate {
            var vspft = this._VSPFT;
            if (!vspft)
                this._VSPFT = vspft = new ItemsPanelTemplate({ ParseType: VirtualizingStackPanel });
            return vspft;
        }
        _GetDefaultTemplate(): UIElement {
            var xobj = this.XObject;
            var c = xobj.TemplateOwner;
            if (!(c instanceof ItemsControl))
                return null;
            if (this._ElementRoot)
                return this._ElementRoot;
            if (c.ItemsPanel) {
                var root = c.ItemsPanel.GetVisualTree(xobj);
                if (!(root instanceof Panel))
                    throw new InvalidOperationException("The root element of an ItemsPanelTemplate must be a Panel subclass");
                this._ElementRoot = <Panel>root;
            }
            if (!this._ElementRoot) {
                var template: ItemsPanelTemplate;
                if (c instanceof ListBox)
                    template = this.VirtualizingStackPanelFallbackTemplate;
                else
                    template = this.StackPanelFallbackTemplate;
                this._ElementRoot = <Panel>template.GetVisualTree(xobj);
            }
            this._ElementRoot.IsItemsHost = true;
            return this._ElementRoot;
        }
    }
    Nullstone.RegisterType(ItemsPresenterNode, "ItemsPresenterNode");
    export class ItemsPresenter extends FrameworkElement {
        TemplateOwner: ItemsControl;
        XamlNode: ItemsPresenterNode;
        CreateNode(): ItemsPresenterNode { return new ItemsPresenterNode(this); }
        get ElementRoot(): Panel { return this.XamlNode.ElementRoot; }
        OnApplyTemplate() {
            this.TemplateOwner._SetItemsPresenter(this);
            super.OnApplyTemplate();
        }
    }
    Nullstone.RegisterType(ItemsPresenter, "ItemsPresenter");
}

module Fayde.Controls {
    export class ListBox extends ItemsControl {
    }
    Nullstone.RegisterType(ListBox, "ListBox");
}

module Fayde.Controls {
    export class MENode extends FENode {
        XObject: MediaElement;
        constructor(xobj: MediaElement) {
            super(xobj);
        }
        _InsideObject(ctx: RenderContext, lu: LayoutUpdater, x: number, y: number): bool {
            return false;
        }
    }
    Nullstone.RegisterType(MENode, "MENode");
    export class MediaElement extends FrameworkElement implements IMeasurableHidden, IArrangeableHidden {
        XamlNode: MENode;
        CreateNode(): MENode { return new MENode(this); }
        private _MeasureOverride(availableSize: size, error: BError): size {
            return availableSize;
        }
        private _ArrangeOverride(finalSize: size, error: BError): size {
            return finalSize;
        }
    }
    Nullstone.RegisterType(MediaElement, "MediaElement");
}

module Fayde.Controls {
    function zIndexComparer(uin1: UINode, uin2: UINode) {
        var zi1 = Controls.Panel.GetZIndex(uin1.XObject);
        var zi2 = Controls.Panel.GetZIndex(uin2.XObject);
        if (zi1 === zi2) {
            var z1 = Controls.Panel.GetZ(uin1.XObject);
            var z2 = Controls.Panel.GetZ(uin2.XObject);
            if (isNaN(z1) || isNaN(z2))
                return 0;
            return z1 > z2 ? 1 : (z1 < z2 ? -1 : 0);
        }
        return zi1 - zi2;
    }
    class PanelChildrenNode extends XamlNode {
        ParentNode: PanelNode;
        private _Nodes: UINode[] = [];
        private _ZSorted: UINode[] = [];
        AddNode(uin: UINode) { this._Nodes.push(uin); }
        RemoveNode(uin: UINode) {
            var nodes = this._Nodes;
            var index = nodes.indexOf(uin);
            if (index > -1)
                nodes.splice(index, 1);
        }
        ResortByZIndex() {
            var zs = this._Nodes.slice(0);
            this._ZSorted = zs;
            if (zs.length > 1)
                zs.sort(zIndexComparer);
        }
        GetVisualTreeEnumerator(direction?: VisualTreeDirection): IEnumerator {
            switch (direction) {
                default:
                case VisualTreeDirection.Logical:
                    return ArrayEx.GetEnumerator(this._Nodes);
                case VisualTreeDirection.LogicalReverse:
                    return ArrayEx.GetEnumerator(this._Nodes, true);
                case VisualTreeDirection.ZFoward:
                    if (this._ZSorted.length !== this._Nodes.length)
                        this.ResortByZIndex();
                    return ArrayEx.GetEnumerator(this._ZSorted);
                case VisualTreeDirection.ZReverse:
                    if (this._ZSorted.length !== this._Nodes.length)
                        this.ResortByZIndex();
                    return ArrayEx.GetEnumerator(this._ZSorted, true);
            }
        }
    }
    Nullstone.RegisterType(PanelChildrenNode, "PanelChildrenNode");
    class PanelChildrenCollection extends XamlObjectCollection {
        XamlNode: PanelChildrenNode;
        CreateNode(): PanelChildrenNode { return new PanelChildrenNode(this); }
        AddedToCollection(value: UIElement, error: BError): bool {
            if (!super.AddedToCollection(value, error))
                return false;
            var node = this.XamlNode;
            node.AddNode(value.XamlNode);
            return node.ParentNode.AttachVisualChild(value, error);
        }
        RemovedFromCollection(value: UIElement, isValueSafe: bool) {
            super.RemovedFromCollection(value, isValueSafe);
            var node = this.XamlNode;
            node.ParentNode.DetachVisualChild(value, null);
            node.RemoveNode(value.XamlNode);
        }
    }
    Nullstone.RegisterType(PanelChildrenCollection, "PanelChildrenCollection");
    export class PanelNode extends FENode implements IBoundsComputable {
        XObject: Panel;
        constructor(xobj: Panel) {
            super(xobj);
            this.LayoutUpdater.SetContainerMode(true, true);
            var coll = new PanelChildrenCollection();
            Object.defineProperty(xobj, "Children", {
                value: coll,
                writable: false
            });
            var error = new BError();
            this.SetSubtreeNode(coll.XamlNode, error);
        }
        AttachVisualChild(uie: UIElement, error: BError): bool {
            this.OnVisualChildAttached(uie);
            uie.XamlNode.SetIsLoaded(this.IsLoaded);
            this._InvalidateChildrenZIndices();
            return true;
        }
        DetachVisualChild(uie: UIElement, error: BError): bool {
            this.OnVisualChildDetached(uie);
            uie.XamlNode.SetIsLoaded(false);
            this._InvalidateChildrenZIndices();
            return true;
        }
        _InvalidateChildrenZIndices() {
            if (this.IsAttached) {
            }
        }
        _ResortChildrenByZIndex() {
            (<PanelChildrenCollection>this.XObject.Children).XamlNode.ResortByZIndex();
        }
        OnIsAttachedChanged(newIsAttached: bool) {
            this.SetSurfaceFromVisualParent();
            this.LayoutUpdater.OnIsAttachedChanged(newIsAttached, this.VisualParentNode);
            super.OnIsAttachedChanged(newIsAttached);
        }
        _CanFindElement(): bool { return this.XObject.Background != null; }
        _InsideObject(ctx: RenderContext, lu: LayoutUpdater, x: number, y: number): bool {
            return (this.XObject.Background != null) && super._InsideObject(ctx, lu, x, y);
        }
        ComputeBounds(baseComputer: () => void , lu: LayoutUpdater) {
            rect.clear(lu.Extents);
            rect.clear(lu.ExtentsWithChildren);
            var enumerator = this.GetVisualTreeEnumerator(VisualTreeDirection.Logical);
            while (enumerator.MoveNext()) {
                var item = <UINode>enumerator.Current;
                var itemlu = item.LayoutUpdater;
                if (itemlu.TotalIsRenderVisible)
                    rect.union(lu.ExtentsWithChildren, itemlu.GlobalBoundsWithChildren);
            }
            if (this.XObject.Background) {
                rect.set(lu.Extents, 0, 0, lu.ActualWidth, lu.ActualHeight);
                rect.union(lu.ExtentsWithChildren, lu.Extents);
            }
            rect.copyGrowTransform(lu.Bounds, lu.Extents, lu.EffectPadding, lu.AbsoluteXform);
            rect.copyGrowTransform(lu.BoundsWithChildren, lu.ExtentsWithChildren, lu.EffectPadding, lu.AbsoluteXform);
            lu.ComputeGlobalBounds();
            lu.ComputeSurfaceBounds();
        }
        GetVisualTreeEnumerator(direction?: VisualTreeDirection): IEnumerator {
            return this.XObject.Children.XamlNode.GetVisualTreeEnumerator(direction);
        }
    }
    Nullstone.RegisterType(PanelNode, "PanelNode");
    function zIndexPropertyChanged(dobj: DependencyObject, args) {
        if (dobj instanceof UIElement)
          (<UIElement>dobj).XamlNode.LayoutUpdater.Invalidate();
        (<PanelNode>dobj.XamlNode.ParentNode)._InvalidateChildrenZIndices();
    }
    export class Panel extends FrameworkElement implements IMeasurableHidden {
        XamlNode: PanelNode;
        CreateNode(): PanelNode { return new PanelNode(this); }
        static BackgroundProperty: DependencyProperty = DependencyProperty.Register("Background", () => { return Media.Brush; }, Panel, undefined, (d, args) => (<Panel>d)._BackgroundChanged(args));
        static IsItemsHostProperty: DependencyProperty = DependencyProperty.Register("IsItemHost", () => { return Boolean; }, Panel, false);
        static ZIndexProperty: DependencyProperty = DependencyProperty.RegisterAttached("ZIndex", () => { return Number; }, Panel, 0, zIndexPropertyChanged);
        static ZProperty: DependencyProperty = DependencyProperty.RegisterAttached("Z", () => { return Number; }, Panel, NaN);
        Background: Media.Brush;
        IsItemsHost: bool;
        Children: XamlObjectCollection;
        static Annotations = { ContentProperty: "Children" }
        static GetZIndex(uie: UIElement): number { return uie.GetValue(ZIndexProperty); }
        static SetZIndex(uie: UIElement, value: number) { uie.SetValue(ZIndexProperty, value); }
        static GetZ(uie: UIElement): number { return uie.GetValue(ZProperty); }
        static SetZ(uie: UIElement, value: number) { uie.SetValue(ZProperty, value); }
        private _BackgroundChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldBrush = <Media.Brush>args.OldValue;
            var newBrush = <Media.Brush>args.NewValue;
            if (oldBrush)
                oldBrush.Unlisten(this);
            if (newBrush)
                newBrush.Listen(this);
            var lu = this.XamlNode.LayoutUpdater;
            lu.UpdateBounds();
            lu.Invalidate();
        }
        private BrushChanged(newBrush: Media.Brush) { this.XamlNode.LayoutUpdater.Invalidate(); }
        private _MeasureOverride(availableSize: size, error: BError): size {
            return new size();
        }
        private Render(ctx: RenderContext, lu: LayoutUpdater, region: rect) {
            var background = this.Background;
            if (!background)
                return;
            var framework = lu.CoerceSize(size.fromRaw(this.ActualWidth, this.ActualHeight));
            if (framework.Width <= 0 || framework.Height <= 0)
                return;
            var area = rect.fromSize(framework);
            ctx.Save();
            lu._RenderLayoutClip(ctx);
            ctx.FillRect(background, area);
            ctx.Restore();
        }
    }
    Nullstone.RegisterType(Panel, "Panel");
}

module Fayde.Controls {
    export class _RichTextBoxView {
    }
    Nullstone.RegisterType(_RichTextBoxView, "_RichTextBoxView");
    export class RichTextBox extends Control {
        HorizontalScrollBarVisibility: ScrollBarVisibility;
        TextWrapping: TextWrapping;
    }
    Nullstone.RegisterType(RichTextBox, "RichTextBox");
}

module Fayde.Controls {
    function validateInputOffset(offset: number) {
        if (!isNaN(offset))
            return Math.max(0, offset);
        throw new ArgumentException("Offset is not a number.");
    }
    function areNumbersClose(val1: number, val2: number): bool {
        if (val1 === val2)
            return true;
        var num1 = (Math.abs(val1) + Math.abs(val2) + 10) * 1.11022302462516E-16;
        var num2 = val1 - val2;
        return -num1 < num2 && num1 > num2;
    }
    function isNumberLessThan(val1: number, val2: number): bool {
        if (val1 >= val2)
            return false;
        return !areNumbersClose(val1, val2);
    }
    function isNumberGreaterThan(val1: number, val2: number): bool {
        if (val1 <= val2)
            return false;
        return !areNumbersClose(val1, val2);
    }
    function computeScrollOffsetWithMinimalScroll(topView, bottomView, topChild, bottomChild) {
        var flag = isNumberLessThan(topChild, topView) && isNumberLessThan(bottomChild, bottomView);
        var flag1 = isNumberGreaterThan(topChild, topView) && isNumberGreaterThan(bottomChild, bottomView);
        var flag4 = (bottomChild - topChild) > (bottomView - topView);
        if ((!flag || flag4) && (!flag1 || !flag4)) {
            if (flag || flag1)
                return bottomChild - bottomView - topView;
            return topView;
        }
        return topChild;
    }
    export class ScrollContentPresenter extends ContentPresenter implements Primitives.IScrollInfo, IMeasurableHidden, IArrangeableHidden {
        private _ScrollData: Primitives.ScrollData = new Primitives.ScrollData();
        private _IsClipPropertySet: bool = false;
        private _ClippingRectangle: Media.RectangleGeometry = null;
        get ScrollOwner(): ScrollViewer { return this._ScrollData.ScrollOwner; }
        set ScrollOwner(value: ScrollViewer) { this._ScrollData.ScrollOwner = value; }
        get CanHorizontallyScroll(): bool { return this._ScrollData.CanHorizontallyScroll;; }
        set CanHorizontallyScroll(value: bool) {
            var sd = this._ScrollData;
            if (sd.CanHorizontallyScroll !== value) {
                sd.CanHorizontallyScroll = value;
                this.XamlNode.LayoutUpdater.InvalidateMeasure();
            }
        }
        get CanVerticallyScroll(): bool { return this._ScrollData.CanVerticallyScroll; }
        set CanVerticallyScroll(value: bool) {
            var sd = this._ScrollData;
            if (sd.CanVerticallyScroll !== value) {
                sd.CanVerticallyScroll = value;
                this.XamlNode.LayoutUpdater.InvalidateMeasure();
            }
        }
        get ExtentWidth(): number { return this._ScrollData.ExtentWidth; }
        get ExtentHeight(): number { return this._ScrollData.ExtentHeight; }
        get ViewportWidth(): number { return this._ScrollData.ViewportWidth; }
        get ViewportHeight(): number { return this._ScrollData.ViewportHeight; }
        get HorizontalOffset(): number { return this._ScrollData.OffsetX; }
        get VerticalOffset(): number { return this._ScrollData.OffsetY; }
        LineUp() { this.SetVerticalOffset(this._ScrollData.OffsetY - 16); }
        LineDown() { this.SetVerticalOffset(this._ScrollData.OffsetY + 16); }
        LineLeft() { this.SetHorizontalOffset(this._ScrollData.OffsetX - 16); }
        LineRight() { this.SetHorizontalOffset(this._ScrollData.OffsetX + 16); }
        MouseWheelUp() { this.SetVerticalOffset(this._ScrollData.OffsetY - 48); }
        MouseWheelDown() { this.SetVerticalOffset(this._ScrollData.OffsetY + 48); }
        MouseWheelLeft() { this.SetHorizontalOffset(this._ScrollData.OffsetX - 48); }
        MouseWheelRight() { this.SetHorizontalOffset(this._ScrollData.OffsetX + 48); }
        PageUp() { this.SetVerticalOffset(this._ScrollData.OffsetY - this._ScrollData.ViewportHeight); }
        PageDown() { this.SetVerticalOffset(this._ScrollData.OffsetY + this._ScrollData.ViewportHeight); }
        PageLeft() { this.SetHorizontalOffset(this._ScrollData.OffsetX - this._ScrollData.ViewportWidth); }
        PageRight() { this.SetHorizontalOffset(this._ScrollData.OffsetX + this._ScrollData.ViewportWidth); }
        MakeVisible(uie: UIElement, rectangle: rect): rect {
            if (rect.isEmpty(rectangle) || !uie || uie === this || !this.XamlNode.IsAncestorOf(uie.XamlNode))
                return new rect();
            var generalTransform = uie.TranformToVisual(this);
            var point = generalTransform.Transform(new Point(rectangle.X, rectangle.Y));
            rectangle = rect.clone(rectangle);
            rectangle.X = point.X;
            rectangle.Y = point.Y;
            return rectangle;
            var irect = new rect();
            rect.set(irect, this.HorizontalOffset, this.VerticalOffset, this.ViewportWidth, this.ViewportHeight);
            rectangle.X += irect.X;
            rectangle.Y += irect.Y;
            var num = computeScrollOffsetWithMinimalScroll(irect.X, irect.X + irect.Width, rectangle.X, rectangle.X + rectangle.Width);
            var num1 = computeScrollOffsetWithMinimalScroll(irect.Y, irect.Y + irect.Height, rectangle.Y, rectangle.Y + rectangle.Height);
            this.SetHorizontalOffset(num);
            this.SetVerticalOffset(num1);
            irect.X = num;
            irect.Y = num1;
            rect.intersection(rectangle, irect);
            if (!rect.isEmpty(rectangle)) {
                rectangle.X -= irect.X;
                rectangle.Y -= irect.Y;
            }
            return rectangle;
        }
        SetHorizontalOffset(offset: number) {
            if (!this.CanHorizontallyScroll)
                return;
            var valid = validateInputOffset(offset);
            if (areNumbersClose(this._ScrollData.OffsetX, valid))
                return;
            this._ScrollData.CachedOffsetX = valid;
            this.XamlNode.LayoutUpdater.InvalidateArrange();
        }
        SetVerticalOffset(offset: number) {
            if (!this.CanVerticallyScroll)
                return;
            var valid = validateInputOffset(offset);
            if (areNumbersClose(this._ScrollData.OffsetY, valid))
                return;
            this._ScrollData.CachedOffsetY = valid;
            this.XamlNode.LayoutUpdater.InvalidateArrange();
        }
        OnApplyTemplate() {
            super.OnApplyTemplate();
            var sv: ScrollViewer;
            if (this.TemplateOwner instanceof ScrollViewer)
                sv = <ScrollViewer>this.TemplateOwner;
            else
                return;
            var content = this.Content;
            var info: Primitives.IScrollInfo;
            if (Nullstone.ImplementsInterface(content, Primitives.IScrollInfo_))
                info = content;
            if (!info) {
                if (content instanceof ItemsPresenter) {
                    var presenter = <ItemsPresenter>content;
                    var er = presenter.ElementRoot;
                    if (Nullstone.ImplementsInterface(er, Primitives.IScrollInfo_))
                        info = <Primitives.IScrollInfo><any>er;
                }
            }
            if (!info)
                info = this;
            info.CanHorizontallyScroll = sv.HorizontalScrollBarVisibility !== ScrollBarVisibility.Disabled;
            info.CanVerticallyScroll = sv.VerticalScrollBarVisibility !== ScrollBarVisibility.Disabled;
            info.ScrollOwner = sv;
            sv.ScrollInfo = info;
            sv.InvalidateScrollInfo();
        }
        private _MeasureOverride(availableSize: size, error: BError): size {
            var scrollOwner = this.ScrollOwner;
            var cr = this.XamlNode._ContentRoot;
            if (!scrollOwner || !cr)
                return (<IMeasurableHidden>super)._MeasureOverride(availableSize, error);
            var ideal = size.createInfinite();
            if (!this.CanHorizontallyScroll)
                ideal.Width = availableSize.Width;
            if (!this.CanVerticallyScroll)
                ideal.Height = availableSize.Height;
            cr.Measure(ideal);
            var crds = cr.DesiredSize;
            this._UpdateExtents(availableSize, crds.Width, crds.Height);
            var desired = size.clone(availableSize);
            var sd = this._ScrollData;
            desired.Width = Math.min(desired.Width, sd.ExtentWidth);
            desired.Height = Math.min(desired.Height, sd.ExtentHeight);
            return desired;
        }
        private _ArrangeOverride(finalSize: size, error: BError): size {
            var scrollOwner = this.ScrollOwner;
            var cr = this.XamlNode._ContentRoot;
            if (!scrollOwner || !cr)
                return (<IArrangeableHidden>super)._ArrangeOverride(finalSize, error);
            if (this._ClampOffsets())
                scrollOwner.InvalidateScrollInfo();
            var desired = cr.DesiredSize;
            var start = new Point(-this.HorizontalOffset, -this.VerticalOffset);
            var offerSize = size.clone(desired);
            size.max(offerSize, finalSize);
            var childRect = rect.fromSize(offerSize);
            childRect.X = start.X;
            childRect.Y = start.Y;
            cr.Arrange(childRect);
            this._UpdateClip(finalSize);
            var sd = this._ScrollData;
            this._UpdateExtents(finalSize, sd.ExtentWidth, sd.ExtentHeight);
            return finalSize;
        }
        private _UpdateExtents(viewport: size, extentWidth: number, extentHeight: number) {
            var sd = this._ScrollData;
            var changed = sd.ViewportWidth !== viewport.Width
                || sd.ViewportHeight !== viewport.Height
                || sd.ExtentWidth !== extentWidth
                || sd.ExtentHeight !== extentHeight;
            sd.ViewportWidth = viewport.Width;
            sd.ViewportHeight = viewport.Height;
            sd.ExtentWidth = extentWidth;
            sd.ExtentHeight = extentHeight;
            if (this._ClampOffsets())
                changed = true;
            if (changed) this.ScrollOwner.InvalidateScrollInfo();
        }
        private _ClampOffsets(): bool {
            var changed = false;
            var sd = this._ScrollData;
            var result = this.CanHorizontallyScroll ? Math.min(sd.CachedOffsetX, sd.ExtentWidth - sd.ViewportWidth) : 0;
            result = Math.max(0, result);
            if (!areNumbersClose(result, this.HorizontalOffset)) {
                sd.OffsetX = result;
                changed = true;
            }
            result = this.CanVerticallyScroll ? Math.min(sd.CachedOffsetY, sd.ExtentHeight - sd.ViewportHeight) : 0;
            result = Math.max(0, result);
            if (!areNumbersClose(result, this.VerticalOffset)) {
                sd.OffsetY = result;
                changed = true;
            }
            return changed;
        }
        private _UpdateClip(arrangeSize: size) {
            if (!this._IsClipPropertySet) {
                this._ClippingRectangle = new Media.RectangleGeometry();
                this.Clip = this._ClippingRectangle;
                this._IsClipPropertySet = true;
            }
            var content;
            if (this.TemplateOwner instanceof Controls.ScrollViewer && (content = this.Content) && (content instanceof Controls.Internal.TextBoxView || content instanceof Controls._RichTextBoxView)) {
                this._ClippingRectangle.Rect = this._CalculateTextBoxClipRect(arrangeSize);
            } else {
                this._ClippingRectangle.Rect = rect.fromSize(arrangeSize);
            }
        }
        private _CalculateTextBoxClipRect(arrangeSize: size): rect {
            var left = 0;
            var right = 0;
            var sd = this._ScrollData;
            var width = sd.ExtentWidth;
            var num = sd.ViewportWidth;
            var x = sd.OffsetX;
            var templatedParent: ScrollViewer;
            if (this.TemplateOwner instanceof ScrollViewer)
                templatedParent = <ScrollViewer>this.TemplateOwner;
            var to = templatedParent.TemplateOwner;
            var textWrapping = TextWrapping.NoWrap;
            var horizontalScrollBarVisibility = ScrollBarVisibility.Disabled;
            if (to instanceof TextBox) {
                var textbox = <TextBox>to;
                textWrapping = textbox.TextWrapping;
                horizontalScrollBarVisibility = textbox.HorizontalScrollBarVisibility;
            } else if (to instanceof RichTextBox) {
                var richtextbox = <RichTextBox>to;
                textWrapping = richtextbox.TextWrapping;
                horizontalScrollBarVisibility = richtextbox.HorizontalScrollBarVisibility;
            }
            var padding = templatedParent.Padding;
            if (textWrapping !== TextWrapping.Wrap) {
                if (num > width || x === 0)
                    left = padding.Left + 1;
                if (num > width || horizontalScrollBarVisibility !== ScrollBarVisibility.Disabled && Math.abs(width - x + num) <= 1)
                    right = padding.Right + 1;
            } else {
                left = padding.Left + 1;
                right = padding.Right + 1;
            }
            left = Math.max(0, left);
            right = Math.max(0, right);
            var r = new rect();
            rect.set(r, -left, 0, arrangeSize.Width + left + right, arrangeSize.Height);
            return r;
        }
    }
    Nullstone.RegisterType(ScrollContentPresenter, "ScrollContentPresenter", [Primitives.IScrollInfo_]);
}

module Fayde.Controls {
    export class StackPanel extends Panel implements IMeasurableHidden, IArrangeableHidden {
        static OrientationProperty: DependencyProperty = DependencyProperty.Register("Orientation", () => Orientation, StackPanel, Orientation.Vertical, (d, args) => (<StackPanel>d)._OrientationChanged(args));
        Orientation: Orientation;
        private _OrientationChanged(args: IDependencyPropertyChangedEventArgs) {
            var lu = this.XamlNode.LayoutUpdater;
            lu.InvalidateMeasure();
            lu.InvalidateArrange();
        }
        private _MeasureOverride(availableSize: size, error: BError): size {
            var childAvailable = size.createInfinite();
            var measured = new size();
            var isVertical = this.Orientation === Orientation.Vertical;
            if (isVertical) {
                childAvailable.Width = availableSize.Width;
                var width = this.Width;
                if (!isNaN(width))
                    childAvailable.Width = width;
                childAvailable.Width = Math.min(childAvailable.Width, this.MaxWidth);
                childAvailable.Width = Math.max(childAvailable.Width, this.MinWidth);
            } else {
                childAvailable.Height = availableSize.Height;
                var height = this.Height;
                if (!isNaN(height))
                    childAvailable.Height = height;
                childAvailable.Height = Math.min(childAvailable.Height, this.MaxHeight);
                childAvailable.Height = Math.max(childAvailable.Height, this.MinHeight);
            }
            var enumerator = this.Children.GetEnumerator();
            while (enumerator.MoveNext()) {
                var childLu = (<UINode>enumerator.Current).LayoutUpdater;
                childLu._Measure(childAvailable, error);
                var s = childLu.DesiredSize;
                if (isVertical) {
                    measured.Height += s.Height;
                    measured.Width = Math.max(measured.Width, s.Width);
                } else {
                    measured.Width += s.Width;
                    measured.Height = Math.max(measured.Height, s.Height);
                }
            }
            return measured;
        }
        private _ArrangeOverride(finalSize: size, error: BError): size {
            var arranged = size.clone(finalSize);
            var isVertical = this.Orientation === Orientation.Vertical;
            if (isVertical)
                arranged.Height = 0;
            else
                arranged.Width = 0;
            var enumerator = this.Children.GetEnumerator();
            while (enumerator.MoveNext()) {
                var childLu = (<UINode>enumerator.Current).LayoutUpdater;
                var s = size.clone(childLu.DesiredSize);
                if (isVertical) {
                    s.Width = finalSize.Width;
                    var childFinal = rect.fromSize(s);
                    childFinal.Y = arranged.Height;
                    if (rect.isEmpty(childFinal))
                        rect.clear(childFinal);
                    childLu._Arrange(childFinal, error);
                    arranged.Width = Math.max(arranged.Width, s.Width);
                    arranged.Height += s.Height;
                } else {
                    s.Height = finalSize.Height;
                    var childFinal = rect.fromSize(s);
                    childFinal.X = arranged.Width;
                    if (rect.isEmpty(childFinal))
                        rect.clear(childFinal);
                    childLu._Arrange(childFinal, error);
                    arranged.Width += s.Width;
                    arranged.Height = Math.max(arranged.Height, s.Height);
                }
            }
            if (isVertical)
                arranged.Height = Math.max(arranged.Height, finalSize.Height);
            else
                arranged.Width = Math.max(arranged.Width, finalSize.Width);
            return arranged;
        }
    }
    Nullstone.RegisterType(StackPanel, "StackPanel");
}

module Fayde.Controls {
    declare var NotImplemented;
    export class TextBlockNode extends FENode implements IBoundsComputable, Documents.IInlinesChangedListener {
        XObject: TextBlock;
        private _ActualWidth: number = 0.0;
        private _ActualHeight: number = 0.0;
        _Layout: Text.TextLayout = new Text.TextLayout();
        private _WasSet: bool = true;
        private _Dirty: bool = true;
        private _Font: Font = new Font();
        private _SetsValue: bool = true;
        constructor(xobj: TextBlock) {
            super(xobj);
        }
        GetInheritedWalker(): IEnumerator {
            var xobj = this.XObject;
            var inlines = xobj.Inlines;
            if (inlines)
                return inlines.GetEnumerator();
        }
        ComputeBounds(baseComputer: () => void , lu: LayoutUpdater) {
            rect.copyTo(this._Layout.RenderExtents, lu.Extents);
            var padding = this.XObject.Padding;
            if (padding) {
                lu.Extents.X += padding.Left;
                lu.Extents.Y += padding.Top;
            }
            rect.copyTo(lu.Extents, lu.ExtentsWithChildren);
            lu.IntersectBoundsWithClipPath(lu.Bounds, lu.AbsoluteXform);
            rect.copyTo(lu.Bounds, lu.BoundsWithChildren);
            lu.ComputeGlobalBounds();
            lu.ComputeSurfaceBounds();
        }
        Measure(constraint: size): size {
            this.Layout(constraint);
            return size.fromRaw(this._ActualWidth, this._ActualHeight);
        }
        Arrange(constraint: size, padding: Thickness) {
            this.Layout(constraint);
            var arranged = size.fromRaw(this._ActualWidth, this._ActualHeight);
            size.max(arranged, constraint);
            this._Layout.AvailableWidth = constraint.Width;
            if (padding) size.growByThickness(arranged, padding);
        }
        Layout(constraint: size) {
            if (this._WasSet) {
                if (false) {
                    this._ActualHeight = this._Font.GetActualHeight();
                    this._ActualWidth = 0.0;
                } else {
                    this._Layout.MaxWidth = constraint.Width;
                    this._Layout.Layout();
                    var actuals = this._Layout.ActualExtents;
                    this._ActualWidth = actuals.Width;
                    this._ActualHeight = actuals.Height;
                }
            } else {
                this._ActualHeight = 0.0;
                this._ActualWidth = 0.0;
            }
            this._Dirty = false;
        }
        ComputeActualSize(lu: LayoutUpdater, padding: Thickness): size {
            var constraint = lu.CoerceSize(size.createInfinite());
            if (lu.PreviousConstraint !== undefined || lu.LayoutSlot !== undefined) {
                this._Layout.Layout();
                var actuals = this._Layout.ActualExtents;
                this._ActualWidth = actuals.Width;
                this._ActualHeight = actuals.Height;
            } else {
                if (padding) size.shrinkByThickness(constraint, padding);
                this.Layout(constraint);
            }
            var result = size.fromRaw(this._ActualWidth, this._ActualHeight);
            if (padding) size.growByThickness(result, padding);
            return result;
        }
        _CanFindElement(): bool { return true; }
        _FontChanged(args: IDependencyPropertyChangedEventArgs) {
            this._UpdateFonts(false);
            this._InvalidateDirty();
        }
        _TextChanged(args: IDependencyPropertyChangedEventArgs) {
            if (this._SetsValue) {
                this._SetTextInternal(args.NewValue);
                this._UpdateLayoutAttributes();
                this._InvalidateDirty(true);
            } else {
                this._UpdateLayoutAttributes();
            }
        }
        _LineStackingStrategyChanged(args: IDependencyPropertyChangedEventArgs) {
            this._Dirty = this._Layout.SetLineStackingStategy(args.NewValue);
            this._InvalidateDirty();
        }
        _LineHeightChanged(args: IDependencyPropertyChangedEventArgs) {
            this._Dirty = this._Layout.SetLineHeight(args.NewValue);
            this._InvalidateDirty();
        }
        _TextAlignmentChanged(args: IDependencyPropertyChangedEventArgs) {
            this._Dirty = this._Layout.SetTextAlignment(args.NewValue);
            this._InvalidateDirty();
        }
        _TextTrimmingChanged(args: IDependencyPropertyChangedEventArgs) {
            this._Dirty = this._Layout.SetTextTrimming(args.NewValue);
            this._InvalidateDirty();
        }
        _TextWrappingChanged(args: IDependencyPropertyChangedEventArgs) {
            this._Dirty = this._Layout.SetTextWrapping(args.NewValue);
            this._InvalidateDirty();
        }
        _InvalidateDirty(setDirty?: bool) {
            if (setDirty) this._Dirty = true;
            var lu = this.LayoutUpdater;
            if (this._Dirty) {
                lu.InvalidateMeasure();
                lu.InvalidateArrange();
                lu.UpdateBounds(true);
            }
            lu.Invalidate();
        }
        private _UpdateFont(force?: bool) {
            var f = this._Font;
            var xobj = this.XObject;
            f.Family = xobj.FontFamily;
            f.Stretch = xobj.FontStretch;
            f.Style = xobj.FontStyle;
            f.Weight = xobj.FontWeight;
            f.Size = xobj.FontSize;
            return f.IsChanged || force;
        }
        private _UpdateFonts(force?: bool): bool {
            if (!this._UpdateFont(force))
                return false;
            var lu = this.LayoutUpdater;
            lu.InvalidateMeasure();
            lu.InvalidateArrange();
            lu.UpdateBounds(true);
            this._Dirty = true;
            return true;
        }
        private _UpdateLayoutAttributes() {
            var xobj = this.XObject;
            var inlines = xobj.Inlines;
            var lu = this.LayoutUpdater;
            lu.InvalidateMeasure();
            lu.InvalidateArrange();
            this._UpdateFont(false);
            var length = 0;
            var runs: Text.ITextAttributes[] = [];
            var count = inlines.Count;
            var enumerator = inlines.GetEnumerator();
            while (enumerator.MoveNext()) {
                length = this._UpdateLayoutAttributesForInline(<Documents.Inline>enumerator.Current, length, runs);
            }
            if (count > 0)
                this._WasSet = true;
            this._Layout.Text = xobj.Text;
            this._Layout.TextAttributes = runs;
        }
        private _UpdateLayoutAttributesForInline(item: Documents.Inline, length: number, runs: Text.ITextAttributes[]): number {
            if (item instanceof Documents.Run) {
                var text = (<Documents.Run>item).Text;
                if (text && text.length) {
                    runs.push(new Text.TextLayoutAttributes(item, length));
                    length += text.length;
                }
            } else if (item instanceof Documents.LineBreak) {
                runs.push(new Text.TextLayoutAttributes(item, length));
                length += 1; //line break length
            } else if (item instanceof Documents.Span) {
                var inlines = (<Documents.Span>item).Inlines;
                var enumerator = inlines.GetEnumerator();
                while (enumerator.MoveNext()) {
                    length = this._UpdateLayoutAttributesForInline(<Documents.Inline>enumerator.Current, length, runs);
                }
            }
            return length;
        }
        private _GetTextInternal(inlines: XamlObjectCollection) {
            if (!inlines)
                return "";
            var block = "";
            var enumerator = inlines.GetEnumerator();
            while (enumerator.MoveNext()) {
                block += (<Documents.Inline>enumerator.Current)._SerializeText();
            }
            return block;
        }
        private _SetTextInternal(text: string) {
            this._SetsValue = false;
            var value: Documents.Inline = null;
            var xobj = this.XObject;
            var inlines = xobj.Inlines;
            if (text) {
                var count = inlines.Count;
                var run: Documents.Run = null;
                if (count > 0 && (value = <Documents.Inline>inlines.GetValueAt(0)) && value instanceof Documents.Run) {
                    run = <Documents.Run>value;
                    if (run.Autogen) {
                        while (count > 1) {
                            inlines.RemoveAt(count - 1);
                            count--;
                        }
                    } else {
                        run = null;
                    }
                }
                if (!run) {
                    inlines.Clear();
                    run = new Documents.Run();
                    run.Autogen = true;
                    inlines.Add(run);
                }
                run.Text = text;
                xobj._Store.PropagateInheritedOnAdd(run.XamlNode);
            } else {
                inlines.Clear();
                xobj.Text = "";
            }
            this._SetsValue = true;
        }
        private InlinesChanged(newInline: Documents.Inline, isAdd: bool) {
            if (!this._SetsValue)
                return;
            var xobj = this.XObject;
            if (isAdd)
                xobj._Store.PropagateInheritedOnAdd(newInline.XamlNode);
            var inlines = xobj.Inlines;
            this._SetsValue = false;
            xobj._Store.SetValue(TextBlock.TextProperty, this._GetTextInternal(inlines));
            this._SetsValue = true;
            this._UpdateLayoutAttributes();
            var lu = this.LayoutUpdater;
            lu.InvalidateMeasure();
            lu.InvalidateArrange();
            lu.UpdateBounds(true);
            lu.Invalidate();
        }
    }
    Nullstone.RegisterType(TextBlockNode, "TextBlockNode");
    export class TextBlock extends FrameworkElement implements IMeasurableHidden, IArrangeableHidden, IRenderable, IActualSizeComputable, Media.IBrushChangedListener {
        XamlNode: TextBlockNode;
        CreateNode(): TextBlockNode { return new TextBlockNode(this); }
        static PaddingProperty: DependencyProperty = DependencyProperty.RegisterCore("Padding", () => Thickness, TextBlock, undefined, (d, args) => (<TextBlock>d).XamlNode._InvalidateDirty(true));
        static ForegroundProperty: DependencyProperty = DependencyProperty.RegisterInheritable("Foreground", () => Media.Brush, TextBlock, undefined, undefined, undefined, Providers._Inheritable.Foreground);
        static FontFamilyProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontFamily", () => String, TextBlock, Font.DEFAULT_FAMILY, (d, args) => (<TextBlock>d).XamlNode._FontChanged(args), undefined, Providers._Inheritable.FontFamily);
        static FontStretchProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontStretch", () => String, TextBlock, Font.DEFAULT_STRETCH, (d, args) => (<TextBlock>d).XamlNode._FontChanged(args), undefined, Providers._Inheritable.FontStretch);
        static FontStyleProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontStyle", () => String, TextBlock, Font.DEFAULT_STYLE, (d, args) => (<TextBlock>d).XamlNode._FontChanged(args), undefined, Providers._Inheritable.FontStyle);
        static FontWeightProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontWeight", () => new Enum(FontWeight), TextBlock, Font.DEFAULT_WEIGHT, (d, args) => (<TextBlock>d).XamlNode._FontChanged(args), undefined, Providers._Inheritable.FontWeight);
        static FontSizeProperty: DependencyProperty = DependencyProperty.RegisterInheritable("FontSize", () => Number, TextBlock, Font.DEFAULT_SIZE, (d, args) => (<TextBlock>d).XamlNode._FontChanged(args), undefined, Providers._Inheritable.FontSize);
        static TextDecorationsProperty: DependencyProperty = DependencyProperty.RegisterInheritable("TextDecorations", () => new Enum(TextDecorations), TextBlock, TextDecorations.None, (d, args) => (<TextBlock>d).XamlNode._InvalidateDirty(true), undefined, Providers._Inheritable.TextDecorations);
        static TextProperty: DependencyProperty = DependencyProperty.Register("Text", () => String, TextBlock, "", (d, args) => (<TextBlock>d).XamlNode._TextChanged(args));
        static LineStackingStrategyProperty: DependencyProperty = DependencyProperty.RegisterCore("LineStackingStrategy", () => new Enum(LineStackingStrategy), TextBlock, LineStackingStrategy.MaxHeight, (d, args) => (<TextBlock>d).XamlNode._LineStackingStrategyChanged(args));
        static LineHeightProperty: DependencyProperty = DependencyProperty.RegisterCore("LineHeight", () => Number, TextBlock, NaN, (d, args) => (<TextBlock>d).XamlNode._LineHeightChanged(args));
        static TextAlignmentProperty: DependencyProperty = DependencyProperty.RegisterCore("TextAlignment", () => new Enum(TextAlignment), TextBlock, TextAlignment.Left, (d, args) => (<TextBlock>d).XamlNode._TextAlignmentChanged(args));
        static TextTrimmingProperty: DependencyProperty = DependencyProperty.RegisterCore("TextTrimming", () => new Enum(TextTrimming), TextBlock, TextTrimming.None, (d, args) => (<TextBlock>d).XamlNode._TextTrimmingChanged(args));
        static TextWrappingProperty: DependencyProperty = DependencyProperty.RegisterCore("TextWrapping", () => new Enum(TextWrapping), TextBlock, TextWrapping.NoWrap, (d, args) => (<TextBlock>d).XamlNode._TextWrappingChanged(args));
        Padding: Thickness;
        Foreground: Media.Brush;
        FontFamily: string;
        FontStretch: string;
        FontStyle: string;
        FontWeight: FontWeight;
        FontSize: number;
        TextDecorations: TextDecorations;
        Text: string;
        Inlines: Documents.InlineCollection;
        LineStackingStrategy: LineStackingStrategy;
        LineHeight: number;
        TextAlignment: TextAlignment;
        TextTrimming: TextTrimming;
        TextWrapping: TextWrapping;
        static Annotations = { ContentProperty: "Inlines" }
        constructor() {
            super();
            var inlines = new Documents.InlineCollection();
            Object.defineProperty(this, "Inlines", {
                value: inlines,
                writable: false
            });
            inlines.Listen(this.XamlNode);
        }
        private _MeasureOverride(availableSize: size, error: BError): size {
            var constraint = size.clone(availableSize);
            var padding = this.Padding;
            if (padding) size.shrinkByThickness(constraint, padding);
            var desired = this.XamlNode.Measure(constraint);
            if (padding) size.growByThickness(desired, padding);
            return desired;
        }
        private _ArrangeOverride(finalSize: size, error: BError): size {
            var constraint = size.clone(finalSize);
            var padding = this.Padding;
            if (padding) size.shrinkByThickness(constraint, padding);
            this.XamlNode.Arrange(constraint, padding);
            return finalSize;
        }
        private Render(ctx: RenderContext, lu: LayoutUpdater, region: rect) {
            ctx.Save();
            lu._RenderLayoutClip(ctx);
            var padding = this.Padding;
            var offset: Point = null;
            if (padding) offset = new Point(padding.Left, padding.Top);
            if (this.FlowDirection === Fayde.FlowDirection.RightToLeft) {
                NotImplemented("TextBlock._Render: Right to left");
            }
            this.XamlNode._Layout.Render(ctx, null, offset);
            ctx.Restore();
        }
        private ComputeActualSize(baseComputer: () => size, lu: LayoutUpdater): size {
            return this.XamlNode.ComputeActualSize(lu, this.Padding);
        }
        private _ForegroundChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldBrush = <Media.Brush>args.OldValue;
            var newBrush = <Media.Brush>args.NewValue;
            if (oldBrush) oldBrush.Unlisten(this);
            if (newBrush) newBrush.Listen(this);
        }
        private BrushChanged(newBrush: Media.Brush) {
            this.XamlNode.LayoutUpdater.Invalidate();
        }
    }
    Nullstone.RegisterType(TextBlock, "TextBlock");
}

module Fayde.Controls {
    export enum TextBoxModelChangedType {
        Nothing = 0,
        TextAlignment = 1,
        TextWrapping = 2,
        Selection = 3,
        Brush = 4,
        Font = 5,
        Text = 6,
    }
    export interface ITextModelArgs {
        Changed: TextBoxModelChangedType;
        PropArgs: IDependencyPropertyChangedEventArgs;
    }
    export interface ITextModelListener {
        OnTextModelChanged(args: ITextModelArgs);
    }
    export class TextBoxBase extends Control implements Text.ITextAttributesSource {
        private _SelectionCursor: number = 0;
        private _SelectionAnchor: number = 0;
        get SelectionCursor(): number { return this._SelectionCursor; }
        get HasSelectedText(): bool { return this._SelectionCursor !== this._SelectionAnchor; }
        get CaretBrush(): Media.Brush { return undefined; }
        get TextAlignment(): TextAlignment { return undefined; }
        get TextWrapping(): TextWrapping { return undefined; }
        get SelectionStart(): number { return undefined; }
        get SelectionLength(): number { return undefined; }
        get DisplayText(): string { return undefined; }
        get SelectionBackground(): Media.Brush { return undefined; }
        get Background(): Media.Brush { return undefined; }
        get SelectionForeground(): Media.Brush { return undefined; }
        get Foreground(): Media.Brush { return undefined; }
        get Font(): Font { return undefined; }
        get Direction(): FlowDirection { return undefined; }
        get TextDecorations(): TextDecorations { return undefined; }
        Listen(listener: ITextModelListener) { }
        Unlisten(listener: ITextModelListener) { }
        _EmitCursorPositionChanged(height: number, x: number, y: number) {
        }
    }
    Nullstone.RegisterType(TextBoxBase, "TextBoxBase");
}

module Fayde.Controls.Internal {
    var CURSOR_BLINK_DIVIDER = 3;
    var CURSOR_BLINK_OFF_MULTIPLIER = 2;
    var CURSOR_BLINK_DELAY_MULTIPLIER = 3;
    var CURSOR_BLINK_ON_MULTIPLIER = 4;
    var CURSOR_BLINK_TIMEOUT_DEFAULT = 900;
    export class TextBoxViewNode extends FENode {
        XObject: TextBoxView;
        constructor(xobj: TextBoxView) {
            super(xobj);
        }
    }
    Nullstone.RegisterType(TextBoxViewNode, "TextBoxViewNode");
    export class TextBoxView extends FrameworkElement implements IMeasurableHidden, IArrangeableHidden, IRenderable, IActualSizeComputable, ITextModelListener {
        XamlNode: TextBoxViewNode;
        CreateNode(): TextBoxViewNode { return new TextBoxViewNode(this); }
        private _Cursor: rect = new rect();
        private _Layout: Text.TextLayout = new Text.TextLayout();
        private _SelectionChanged: bool = false;
        private _HadSelectedText: bool = false;
        private _CursorVisible: bool = false;
        private _EnableCursor: bool = true;
        private _BlinkTimeout: number = 0;
        private _TextBox: TextBoxBase = null;
        private _Dirty: bool = false;
        private Cursor: string = CursorType.IBeam;
        SetTextBox(textBox: TextBoxBase) {
            if (this._TextBox === textBox)
                return;
            if (this._TextBox)
                this._TextBox.Unlisten(this);
            this._TextBox = textBox;
            if (textBox) {
                textBox.Listen(this);
                this._Layout.TextAttributes = [new Text.TextLayoutAttributes(textBox)];
                this._Layout.TextAlignment = textBox.TextAlignment;
                this._Layout.TextWrapping = textBox.TextWrapping;
                this._HadSelectedText = textBox.HasSelectedText;
                this._SelectionChanged = true;
                this._UpdateText();
            } else {
                this._Layout.TextAttributes = null;
                this._Layout.Text = null;
            }
            var lu = this.XamlNode.LayoutUpdater;
            lu.UpdateBounds(true);
            lu.InvalidateMeasure();
            lu.Invalidate();
            this._Dirty = true;
        }
        SetEnableCursor(value: bool) {
            if (this._EnableCursor === value)
                return;
            this._EnableCursor = value;
            if (value)
                this._ResetCursorBlink(false);
            else
                this._EndCursorBlink();
        }
        _Blink() {
            var multiplier;
            if (this._CursorVisible) {
                multiplier = CURSOR_BLINK_OFF_MULTIPLIER;
                this._HideCursor();
            } else {
                multiplier = CURSOR_BLINK_ON_MULTIPLIER;
                this._ShowCursor();
            }
            this._ConnectBlinkTimeout(multiplier);
            return false;
        }
        _ConnectBlinkTimeout(multiplier) {
            if (!this.XamlNode.IsAttached)
                return;
            var timeout = this._GetCursorBlinkTimeout() * multiplier / CURSOR_BLINK_DIVIDER;
            this._BlinkTimeout = setTimeout(() => this._Blink(), timeout);
        }
        _DisconnectBlinkTimeout() {
            if (this._BlinkTimeout !== 0) {
                if (!this.XamlNode.IsAttached)
                    return;
                clearTimeout(this._BlinkTimeout);
                this._BlinkTimeout = 0;
            }
        }
        _GetCursorBlinkTimeout() { return CURSOR_BLINK_TIMEOUT_DEFAULT; }
        _ResetCursorBlink(delay: bool) {
            if (this._TextBox.XamlNode.IsFocused && !this._TextBox.HasSelectedText) {
                if (this._EnableCursor) {
                    if (delay)
                        this._DelayCursorBlink();
                    else
                        this._BeginCursorBlink();
                } else {
                    this._UpdateCursor(false);
                }
            } else {
                this._EndCursorBlink();
            }
        }
        private _DelayCursorBlink() {
            this._DisconnectBlinkTimeout();
            this._ConnectBlinkTimeout(CURSOR_BLINK_DELAY_MULTIPLIER);
            this._UpdateCursor(true);
            this._ShowCursor();
        }
        private _BeginCursorBlink() {
            if (this._BlinkTimeout === 0) {
                this._ConnectBlinkTimeout(CURSOR_BLINK_ON_MULTIPLIER);
                this._UpdateCursor(true);
                this._ShowCursor();
            }
        }
        private _EndCursorBlink() {
            this._DisconnectBlinkTimeout();
            if (this._CursorVisible)
                this._HideCursor();
        }
        private _InvalidateCursor() {
            var lu = this.XamlNode.LayoutUpdater;
            lu.Invalidate(rect.transform(this._Cursor, lu.AbsoluteXform));
        }
        private _ShowCursor() {
            this._CursorVisible = true;
            this._InvalidateCursor();
        }
        private _HideCursor() {
            this._CursorVisible = false;
            this._InvalidateCursor();
        }
        private _UpdateCursor(invalidate: bool) {
            var cur = this._TextBox.SelectionCursor;
            var current = this._Cursor;
            if (invalidate && this._CursorVisible)
                this._InvalidateCursor();
            this._Cursor = this._Layout.GetSelectionCursor(null, cur);
            if (!rect.isEqual(this._Cursor, current))
                this._TextBox._EmitCursorPositionChanged(this._Cursor.Height, this._Cursor.X, this._Cursor.Y);
            if (invalidate && this._CursorVisible)
                this._InvalidateCursor();
        }
        private _UpdateText() {
            var text = this._TextBox.DisplayText;
            this._Layout.Text = text ? text : "", -1;
        }
        ComputeActualSize(baseComputer: () => size, lu: LayoutUpdater) {
            if (lu.LayoutSlot !== undefined)
                return baseComputer.call(lu);
            this.Layout(size.createInfinite());
            return this._Layout.ActualExtents;
        }
        private _MeasureOverride(availableSize: size, error: BError) {
            this.Layout(availableSize);
            var desired = size.clone(this._Layout.ActualExtents);
            if (!isFinite(availableSize.Width))
                desired.Width = Math.max(desired.Width, 11);
            size.min(desired, availableSize);
            return desired;
        }
        private _ArrangeOverride(finalSize: size, error: BError) {
            this.Layout(finalSize);
            var arranged = size.clone(this._Layout.ActualExtents);
            size.max(arranged, finalSize);
            return arranged;
        }
        Layout(constraint: size) {
            this._Layout.MaxWidth = constraint.Width;
            this._Layout.Layout();
            this._Dirty = false;
        }
        GetBaselineOffset(): number {
            return this._Layout.GetBaselineOffset();
        }
        GetLineFromY(y: number): Text.TextLayoutLine { return this._Layout.GetLineFromY(null, y); }
        GetLineFromIndex(index: number): Text.TextLayoutLine { return this._Layout.GetLineFromIndex(index); }
        GetCursorFromXY(x: number, y: number): number { return this._Layout.GetCursorFromXY(null, x, y); }
        Render(ctx: RenderContext, lu: LayoutUpdater, region: rect) {
            var renderSize = lu.RenderSize;
            this._UpdateCursor(false);
            if (this._SelectionChanged) {
                this._Layout.Select(this._TextBox.SelectionStart, this._TextBox.SelectionLength);
                this._SelectionChanged = false;
            }
            ctx.Save();
            lu._RenderLayoutClip(ctx);
            this._Layout.AvailableWidth = renderSize.Width;
            this._RenderImpl(ctx, region);
            ctx.Restore();
        }
        private _RenderImpl(ctx: RenderContext, region: rect) {
            ctx.Save();
            if (this.FlowDirection === Fayde.FlowDirection.RightToLeft) {
            }
            this._Layout.Render(ctx);
            if (this._CursorVisible) {
                var caretBrush = this._TextBox.CaretBrush;
                var canvasCtx = ctx.CanvasContext;
                var rect = this._Cursor;
                canvasCtx.beginPath();
                canvasCtx.moveTo(rect.X + 0.5, rect.Y);
                canvasCtx.lineTo(rect.X + 0.5, rect.Y + rect.Height);
                canvasCtx.lineWidth = 1.0;
                if (caretBrush) {
                    caretBrush.SetupBrush(canvasCtx, rect);
                    canvasCtx.strokeStyle = caretBrush.ToHtml5Object();
                } else {
                    canvasCtx.strokeStyle = "#000000";
                }
                canvasCtx.stroke();
            }
            ctx.Restore();
        }
        OnLostFocus(e) { this._EndCursorBlink(); }
        OnGotFocus(e) { this._ResetCursorBlink(false); }
        OnMouseLeftButtonDown(e) { this._TextBox.OnMouseLeftButtonDown(e); }
        OnMouseLeftButtonUp(e) { this._TextBox.OnMouseLeftButtonUp(e); }
        OnTextModelChanged(args: ITextModelArgs) {
            var lu = this.XamlNode.LayoutUpdater;
            switch (args.Changed) {
                case TextBoxModelChangedType.TextAlignment:
                    if (this._Layout.SetTextAlignment(args.PropArgs.NewValue))
                        this._Dirty = true;
                    break;
                case TextBoxModelChangedType.TextWrapping:
                    if (this._Layout.SetTextWrapping(args.PropArgs.NewValue))
                        this._Dirty = true;
                    break;
                case TextBoxModelChangedType.Selection:
                    if (this._HadSelectedText || this._TextBox.HasSelectedText) {
                        this._HadSelectedText = this._TextBox.HasSelectedText;
                        this._SelectionChanged = true;
                        this._ResetCursorBlink(false);
                    } else {
                        this._ResetCursorBlink(true);
                        return;
                    }
                    break;
                case TextBoxModelChangedType.Brush:
                    break;
                case TextBoxModelChangedType.Font:
                    this._Layout.ResetState();
                    this._Dirty = true;
                    break;
                case TextBoxModelChangedType.Text:
                    this._UpdateText();
                    this._Dirty = true;
                    break;
                default:
                    return;
            }
            if (this._Dirty) {
                lu.InvalidateMeasure();
                lu.UpdateBounds(true);
            }
            lu.Invalidate();
        }
    }
    Nullstone.RegisterType(TextBoxView, "TextBoxView");
}

module Fayde.Controls {
    export class UCNode extends ControlNode {
        _IsParsing: bool = false;
        XObject: UserControl;
        constructor(xobj: UserControl) {
            super(xobj);
            this.LayoutUpdater.BreaksLayoutClipRender = true;
            this.LayoutUpdater.SetContainerMode(true);
        }
        _GetDefaultTemplate(): UIElement {
            var xobj = this.XObject;
            var type = (<any>xobj).constructor;
            var json = type.__TemplateJson;
            if (json) {
                this._IsParsing = true;
                return JsonParser.ParseUserControl(json, this);
                this._IsParsing = false;
            }
        }
    }
    Nullstone.RegisterType(UCNode, "UCNode");
    export class UserControl extends Control implements IMeasurableHidden, IArrangeableHidden {
        XamlNode: UCNode;
        static ContentProperty: DependencyProperty = DependencyProperty.Register("Content", () => Object, UserControl, undefined, (d, args) => (<UserControl>d)._InvalidateContent(args));
        Content: any;
        static Annotations = { ContentProperty: UserControl.ContentProperty }
        CreateNode(): UCNode { return new UCNode(this); }
        InitializeComponent() {
            this.ApplyTemplate();
        }
        private _InvalidateContent(args: IDependencyPropertyChangedEventArgs) {
            var node = this.XamlNode;
            if (node._IsParsing)
                return;
            var error = new BError();
            if (args.OldValue instanceof UIElement)
                node.DetachVisualChild(<UIElement>args.OldValue, error);
            if (args.NewValue instanceof UIElement)
                node.AttachVisualChild(<UIElement>args.NewValue, error);
            if (error.Message)
                error.ThrowException();
            node.LayoutUpdater.UpdateBounds();
        }
        private _MeasureOverride(availableSize: size, error: BError): size {
            var desired: size;
            availableSize = size.clone(availableSize);
            var border = this.Padding.Plus(this.BorderThickness);
            size.shrinkByThickness(availableSize, border);
            var enumerator = this.XamlNode.GetVisualTreeEnumerator();
            while (enumerator.MoveNext()) {
                var childLu = (<UINode>enumerator.Current).LayoutUpdater;
                childLu._Measure(availableSize, error);
                desired = size.clone(childLu.DesiredSize);
            }
            if (!desired)
                desired = new size();
            size.growByThickness(desired, border);
            return desired;
        }
        private _ArrangeOverride(finalSize: size, error: BError): size {
            var border = this.Padding.Plus(this.BorderThickness);
            var arranged;
            var enumerator = this.XamlNode.GetVisualTreeEnumerator();
            while (enumerator.MoveNext()) {
                var childLu = (<UINode>enumerator.Current).LayoutUpdater;
                var childRect = rect.fromSize(finalSize);
                rect.shrinkByThickness(childRect, border);
                childLu._Arrange(childRect, error);
                arranged = size.fromRect(childRect);
                size.growByThickness(arranged, border);
            }
            if (!arranged)
                return finalSize;
            return arranged;
        }
    }
    Nullstone.RegisterType(UserControl, "UserControl");
}

module Fayde.Controls {
    export class VirtualizingPanel extends Panel implements IItemsChangedListener {
        private _ICG: ItemContainerGenerator = null;
        get ItemContainerGenerator(): ItemContainerGenerator {
            if (!this._ICG) {
                var icOwner = ItemsControl.GetItemsOwner(this);
                if (!icOwner)
                    throw new InvalidOperationException("VirtualizingPanels must be in the Template of an ItemsControl in order to generate items");
                var icg = this._ICG = icOwner.ItemContainerGenerator;
                icg.Listen(this);
            }
            return this._ICG;
        }
        AddInternalChild(child) {
            this.Children.Add(child);
        }
        InsertInternalChild(index: number, child) {
            this.Children.Insert(index, child);
        }
        RemoveInternalChildRange(index: number, range: number) {
            var children = this.Children;
            for (var i = 0; i < range; i++) {
                children.RemoveAt(index);
            }
        }
        BringIndexIntoView(index) { }
        OnClearChildren() { }
        OnItemsChanged(action: ItemsChangedAction, itemCount: number, itemUICount: number, oldPosition: IGeneratorPosition, position: IGeneratorPosition) {
            this.XamlNode.LayoutUpdater.InvalidateMeasure();
            if (action === ItemsChangedAction.Reset) {
                this.Children.Clear();
                this.ItemContainerGenerator.RemoveAll();
                this.OnClearChildren();
            }
        }
    }
    Nullstone.RegisterType(VirtualizingPanel, "VirtualizingPanel");
}

module Fayde.Controls {
    var LineDelta = 14.7;
    var Wheelitude = 3;
    export enum VirtualizationMode {
        Standard = 0,
        Recycling = 1,
    }
    export interface ICancelable {
        Cancel: bool;
    }
    export class CleanUpVirtualizedItemEventArgs extends RoutedEventArgs implements ICancelable {
        Cancel: bool = false;
        constructor(public UIElement: UIElement, public Value: any) {
            super();
        }
    }
    export class VirtualizingStackPanel extends VirtualizingPanel implements Primitives.IScrollInfo, IMeasurableHidden, IArrangeableHidden {
        private _CanHorizontallyScroll: bool = false;
        private _CanVerticallyScroll: bool = false;
        private _HorizontalOffset: number = 0;
        private _VerticalOffset: number = 0;
        private _ExtentWidth: number = 0;
        private _ExtentHeight: number = 0;
        private _ViewportWidth: number = 0;
        private _ViewportHeight: number = 0;
        ScrollOwner: ScrollViewer;
        get CanHorizontallyScroll() { return this._CanHorizontallyScroll; }
        set CanHorizontallyScroll(value: bool) { this._CanHorizontallyScroll = value; this.XamlNode.LayoutUpdater.InvalidateMeasure(); }
        get CanVerticallyScroll() { return this._CanVerticallyScroll; }
        set CanVerticallyScroll(value: bool) { this._CanVerticallyScroll = value; this.XamlNode.LayoutUpdater.InvalidateMeasure(); }
        get ExtentWidth() { return this._ExtentWidth; }
        get ExtentHeight() { return this._ExtentHeight; }
        get ViewportWidth() { return this._ViewportWidth; }
        get ViewportHeight() { return this._ViewportHeight; }
        get HorizontalOffset() { return this._HorizontalOffset; }
        get VerticalOffset() { return this._VerticalOffset; }
        LineUp() {
            if (this.Orientation === Fayde.Orientation.Horizontal)
                this.SetVerticalOffset(this._VerticalOffset - LineDelta);
            else
                this.SetVerticalOffset(this._VerticalOffset - 1);
        }
        LineDown() {
            if (this.Orientation === Fayde.Orientation.Horizontal)
                this.SetVerticalOffset(this._VerticalOffset + LineDelta);
            else
                this.SetVerticalOffset(this._VerticalOffset + 1);
        }
        LineLeft() {
            if (this.Orientation === Fayde.Orientation.Vertical)
                this.SetHorizontalOffset(this._HorizontalOffset - LineDelta);
            else
                this.SetHorizontalOffset(this._HorizontalOffset - 1);
        }
        LineRight() {
            if (this.Orientation === Fayde.Orientation.Vertical)
                this.SetHorizontalOffset(this._HorizontalOffset + LineDelta);
            else
                this.SetHorizontalOffset(this._HorizontalOffset + 1);
        }
        MouseWheelUp() {
            if (this.Orientation === Fayde.Orientation.Horizontal)
                this.SetVerticalOffset(this._VerticalOffset - LineDelta * Wheelitude);
            else
                this.SetVerticalOffset(this._VerticalOffset - Wheelitude);
        }
        MouseWheelDown() {
            if (this.Orientation === Fayde.Orientation.Horizontal)
                this.SetVerticalOffset(this._VerticalOffset + LineDelta * Wheelitude);
            else
                this.SetVerticalOffset(this._VerticalOffset + Wheelitude);
        }
        MouseWheelLeft() {
            if (this.Orientation === Fayde.Orientation.Vertical)
                this.SetHorizontalOffset(this._HorizontalOffset - LineDelta * Wheelitude);
            else
                this.SetHorizontalOffset(this._HorizontalOffset - Wheelitude);
        }
        MouseWheelRight() {
            if (this.Orientation === Fayde.Orientation.Vertical)
                this.SetHorizontalOffset(this._HorizontalOffset + LineDelta * Wheelitude);
            else
                this.SetHorizontalOffset(this._HorizontalOffset + Wheelitude);
        }
        PageUp() { this.SetVerticalOffset(this._VerticalOffset - this._ViewportHeight); }
        PageDown() { this.SetVerticalOffset(this._VerticalOffset + this._ViewportHeight); }
        PageLeft() { this.SetHorizontalOffset(this._HorizontalOffset - this._ViewportWidth); }
        PageRight() { this.SetHorizontalOffset(this._HorizontalOffset + this._ViewportWidth); }
        MakeVisible(uie: UIElement, rectangle: rect): rect {
            var exposed = new rect();
            var uin = uie.XamlNode;
            var isVertical = this.Orientation === Orientation.Vertical;
            var enumerator = this.Children.GetEnumerator();
            while (enumerator.MoveNext()) {
                var childNode = <UINode>enumerator.Current;
                var childRenderSize = childNode.LayoutUpdater.RenderSize;
                if (uin === childNode) {
                    if (isVertical) {
                        if (rectangle.X !== this._HorizontalOffset)
                            this.SetHorizontalOffset(rectangle.X);
                        exposed.Width = Math.min(childRenderSize.Width, this._ViewportWidth);
                        exposed.Height = childRenderSize.Height;
                        exposed.X = this._HorizontalOffset;
                    } else {
                        if (rectangle.Y !== this._VerticalOffset)
                            this.SetVerticalOffset(rectangle.Y);
                        exposed.Height = Math.min(childRenderSize.Height, this._ViewportHeight);
                        exposed.Width = childRenderSize.Width;
                        exposed.Y = this._VerticalOffset;
                    }
                    return exposed;
                }
                if (isVertical)
                    exposed.Y += childRenderSize.Height;
                else
                    exposed.X += childRenderSize.Width;
            }
            throw new ArgumentException("Visual is not a child of this Panel");
        }
        SetHorizontalOffset(offset: number) {
            if (offset < 0 || this._ViewportWidth >= this._ExtentWidth)
                offset = 0;
            else if ((offset + this._ViewportWidth) >= this._ExtentWidth)
                offset = this._ExtentWidth - this._ViewportWidth;
            if (this._HorizontalOffset === offset)
                return;
            this._HorizontalOffset = offset;
            if (this.Orientation === Fayde.Orientation.Horizontal)
                this.XamlNode.LayoutUpdater.InvalidateMeasure();
            else
                this.XamlNode.LayoutUpdater.InvalidateArrange();
            var scrollOwner = this.ScrollOwner;
            if (scrollOwner) scrollOwner.InvalidateScrollInfo();
        }
        SetVerticalOffset(offset: number) {
            if (offset < 0 || this._ViewportHeight >= this._ExtentHeight)
                offset = 0;
            else if ((offset + this._ViewportHeight) >= this._ExtentHeight)
                offset = this._ExtentHeight - this._ViewportHeight;
            if (this._VerticalOffset == offset)
                return;
            this._VerticalOffset = offset;
            if (this.Orientation === Fayde.Orientation.Vertical)
                this.XamlNode.LayoutUpdater.InvalidateMeasure();
            else
                this.XamlNode.LayoutUpdater.InvalidateArrange();
            var scrollOwner = this.ScrollOwner;
            if (scrollOwner) scrollOwner.InvalidateScrollInfo();
        }
        CleanUpVirtualizedItemEvent: RoutedEvent = new RoutedEvent();
        static OrientationProperty: DependencyProperty = DependencyProperty.Register("Orientation", () => new Enum(Orientation), VirtualizingStackPanel, Orientation.Vertical, (d, args) => (<UIElement>d).XamlNode.LayoutUpdater.InvalidateMeasure());
        Orientation: Orientation;
        static IsVirtualizingProperty: DependencyProperty = DependencyProperty.RegisterAttached("IsVirtualizing", () => new Boolean, VirtualizingStackPanel, false);
        static GetIsVirtualizing(d: DependencyObject): bool { return d.GetValue(IsVirtualizingProperty); }
        static SetIsVirtualizing(d: DependencyObject, value: bool) { d.SetValue(IsVirtualizingProperty, value); }
        static VirtualizationModeProperty: DependencyProperty = DependencyProperty.RegisterAttached("VirtualizationMode", () => new Enum(VirtualizationMode), VirtualizingStackPanel, VirtualizationMode.Recycling);
        static GetVirtualizationMode(d: DependencyObject): VirtualizationMode { return d.GetValue(VirtualizationModeProperty); }
        static SetVirtualizationMode(d: DependencyObject, value: VirtualizationMode) { d.SetValue(VirtualizationModeProperty, value); }
        private _MeasureOverride(availableSize: size, error: BError): size {
            var owner = ItemsControl.GetItemsOwner(this);
            var measured = new size();
            var invalidate = false;
            var nvisible = 0;
            var beyond = 0;
            var index: number;
            var isHorizontal = this.Orientation === Orientation.Horizontal;
            if (isHorizontal)
                index = Math.floor(this._HorizontalOffset);
            else
                index = Math.floor(this._VerticalOffset);
            var itemCount = owner.Items.Count;
            var generator = this.ItemContainerGenerator;
            if (itemCount > 0) {
                var children = this.Children;
                var childAvailable = size.clone(availableSize);
                if (this._CanHorizontallyScroll || isHorizontal)
                    childAvailable.Width = Number.POSITIVE_INFINITY;
                if (this._CanVerticallyScroll || !isHorizontal)
                    childAvailable.Height = Number.POSITIVE_INFINITY;
                var start = generator.GeneratorPositionFromIndex(index);
                var insertAt = (start.offset === 0) ? start.index : start.index + 1;
                var state = generator.StartAt(start, 0, true);
                try {
                    var isNewlyRealized = { Value: false };
                    var child: UIElement;
                    var childlu: LayoutUpdater;
                    for (var i = 0; i < itemCount && beyond < 2; i++, insertAt++) {
                        child = <UIElement>generator.GenerateNext(isNewlyRealized);
                        childlu = child.XamlNode.LayoutUpdater;
                        if (isNewlyRealized.Value || insertAt >= children.Count || children.GetValueAt(insertAt) !== child) {
                            if (insertAt < children.Count)
                                this.InsertInternalChild(insertAt, child)
                            else
                                this.AddInternalChild(child);
                            generator.PrepareItemContainer(child);
                        }
                        child.Measure(childAvailable);
                        var s = childlu.DesiredSize;
                        nvisible++;
                        if (!isHorizontal) {
                            measured.Width = Math.max(measured.Width, s.Width);
                            measured.Height += s.Height;
                            if (measured.Height > availableSize.Height)
                                beyond++;
                        } else {
                            measured.Height = Math.max(measured.Height, s.Height);
                            measured.Width += s.Width;
                            if (measured.Width > availableSize.Width)
                                beyond++;
                        }
                    }
                } finally {
                    generator.StopGeneration();
                }
            }
            VirtualizingStackPanel.SetIsVirtualizing(owner, true);
            if (nvisible > 0)
                this.RemoveUnusedContainers(index, nvisible);
            nvisible -= beyond;
            if (!isHorizontal) {
                if (this._ExtentHeight !== itemCount) {
                    this._ExtentHeight = itemCount;
                    invalidate = true;
                }
                if (this._ExtentWidth !== measured.Width) {
                    this._ExtentWidth = measured.Width;
                    invalidate = true;
                }
                if (this._ViewportHeight !== nvisible) {
                    this._ViewportHeight = nvisible;
                    invalidate = true;
                }
                if (this._ViewportWidth != availableSize.Width) {
                    this._ViewportWidth = availableSize.Width;
                    invalidate = true;
                }
            } else {
                if (this._ExtentHeight !== measured.Height) {
                    this._ExtentHeight = measured.Height;
                    invalidate = true;
                }
                if (this._ExtentWidth !== itemCount) {
                    this._ExtentWidth = itemCount;
                    invalidate = true;
                }
                if (this._ViewportHeight !== availableSize.Height) {
                    this._ViewportHeight = availableSize.Height;
                    invalidate = true;
                }
                if (this._ViewportWidth !== nvisible) {
                    this._ViewportWidth = nvisible;
                    invalidate = true;
                }
            }
            var scrollOwner = this.ScrollOwner;
            if (invalidate && scrollOwner != null)
                scrollOwner.InvalidateScrollInfo();
            return measured;
        }
        private _ArrangeOverride(finalSize: size, error: BError): size {
            var arranged = size.clone(finalSize);
            var isHorizontal = this.Orientation === Orientation.Horizontal;
            if (!isHorizontal)
                arranged.Height = 0;
            else
                arranged.Width = 0;
            var enumerator = this.Children.GetEnumerator();
            while (enumerator.MoveNext()) {
                var childNode = <UINode>enumerator.Current;
                var childLu = childNode.LayoutUpdater;
                var s = childLu.DesiredSize;
                if (!isHorizontal) {
                    s.Width = finalSize.Width;
                    var childFinal = rect.fromSize(s);
                    if (rect.isEmpty(childFinal)) {
                        rect.clear(childFinal);
                    } else {
                        childFinal.X = -this._HorizontalOffset;
                        childFinal.Y = arranged.Height;
                    }
                    childLu._Arrange(childFinal, error);
                    arranged.Width = Math.max(arranged.Width, s.Width);
                    arranged.Height += s.Height;
                } else {
                    s.Height = finalSize.Height;
                    var childFinal = rect.fromSize(s);
                    if (rect.isEmpty(childFinal)) {
                        rect.clear(childFinal);
                    } else {
                        childFinal.X = arranged.Width;
                        childFinal.Y = -this._VerticalOffset;
                    }
                    childNode.XObject.Arrange(childFinal);
                    arranged.Width += s.Width;
                    arranged.Height = Math.max(arranged.Height, s.Height);
                }
            }
            if (!isHorizontal)
                arranged.Height = Math.max(arranged.Height, finalSize.Height);
            else
                arranged.Width = Math.max(arranged.Width, finalSize.Width);
            return arranged;
        }
        RemoveUnusedContainers(first: number, count: number) {
            var generator = this.ItemContainerGenerator;
            var owner = ItemsControl.GetItemsOwner(this);
            var mode = VirtualizingStackPanel.GetVirtualizationMode(this);
            var last = first + count - 1;
            var item: number;
            var args: ICancelable;
            var children = this.Children;
            var pos = { index: children.Count - 1, offset: 0 };
            while (pos.index >= 0) {
                item = generator.IndexFromGeneratorPosition(pos);
                if (item < first || item > last) {
                    var args = this.OnCleanUpVirtualizedItem(<UIElement>children.GetValueAt(pos.index), owner.Items.GetValueAt(item));
                    if (!args.Cancel) {
                        this.RemoveInternalChildRange(pos.index, 1);
                        if (mode === VirtualizationMode.Recycling)
                            generator.Recycle(pos, 1);
                        else
                            generator.Remove(pos, 1);
                    }
                }
                pos.index--;
            }
        }
        OnCleanUpVirtualizedItem(uie: UIElement, value): ICancelable {
            var args = new CleanUpVirtualizedItemEventArgs(uie, value);
            this.CleanUpVirtualizedItemEvent.Raise(this, args);
            return args;
        }
        OnClearChildren() {
            super.OnClearChildren();
            this._HorizontalOffset = 0;
            this._VerticalOffset = 0;
            this.XamlNode.LayoutUpdater.InvalidateMeasure();
            var scrollOwner = this.ScrollOwner;
            if (scrollOwner) scrollOwner.InvalidateScrollInfo();
        }
        OnItemsChanged(action: ItemsChangedAction, itemCount: number, itemUICount: number, oldPosition: IGeneratorPosition, position: IGeneratorPosition) {
            super.OnItemsChanged(action, itemCount, itemUICount, oldPosition, position);
            var generator = this.ItemContainerGenerator;
            var owner = ItemsControl.GetItemsOwner(this);
            var orientation = this.Orientation;
            var index;
            var offset;
            var viewable
            switch (action) {
                case ItemsChangedAction.Add:
                    var index = generator.IndexFromGeneratorPosition(position);
                    if (orientation === Fayde.Orientation.Horizontal)
                        offset = this.HorizontalOffset;
                    else
                        offset = this.VerticalOffset;
                    if (index <= offset) {
                        offset += itemCount;
                    }
                    if (orientation === Fayde.Orientation.Horizontal)
                        this.SetHorizontalOffset(offset);
                    else
                        this.SetVerticalOffset(offset);
                    break;
                case ItemsChangedAction.Remove:
                    index = generator.IndexFromGeneratorPosition(position);
                    if (orientation === Fayde.Orientation.Horizontal) {
                        offset = this.HorizontalOffset;
                        viewable = this.ViewportWidth;
                    } else {
                        offset = this.VerticalOffset;
                        viewable = this.ViewportHeight;
                    }
                    if (index < offset) {
                        offset = Math.max(offset - itemCount, 0);
                    }
                    offset = Math.min(offset, owner.Items.Count - viewable);
                    offset = Math.max(offset, 0);
                    if (orientation === Fayde.Orientation.Horizontal)
                        this.SetHorizontalOffset(offset);
                    else
                        this.SetVerticalOffset(offset);
                    this.RemoveInternalChildRange(position.index, itemUICount);
                    break;
                case ItemsChangedAction.Replace:
                    this.RemoveInternalChildRange(position.index, itemUICount);
                    break;
                case ItemsChangedAction.Reset:
                    break;
            }
            this.XamlNode.LayoutUpdater.InvalidateMeasure();
            var scrollOwner = this.ScrollOwner;
            if (scrollOwner) scrollOwner.InvalidateScrollInfo();
        }
    }
    Nullstone.RegisterType(VirtualizingStackPanel, "VirtualizingStackPanel", [Primitives.IScrollInfo_]);
}

module Fayde.Controls.Primitives {
    export class PopupNode extends FENode implements IBoundsComputable {
        XObject: Popup;
        GetInheritedWalker(): IEnumerator {
            var popup = (<Popup>this.XObject);
            if (!popup)
                return;
            var index = -1;
            return {
                MoveNext: function () {
                    index++;
                    return index === 0;
                },
                Current: popup.Child
            };
        }
        ComputeBounds(baseComputer: () => void , lu: LayoutUpdater) { }
    }
    Nullstone.RegisterType(PopupNode, "PopupNode");
    export class Popup extends FrameworkElement {
        CreateNode(): PopupNode {
            return new PopupNode(this);
        }
        Child: UIElement;
        HorizontalOffset: number;
        VerticalOffset: number;
    }
    Nullstone.RegisterType(Popup, "Popup");
}

module Fayde.Data {
    declare var Warn;
    interface IParseData {
        index: number;
        i: number;
        end: number;
        path: string;
        parenOpen: bool;
        tickOpen: bool;
        prop: string;
        res: DependencyProperty;
        cloned: bool;
        expressionFound: bool;
        lu: DependencyObject;
        collection: XamlObjectCollection;
        promotedValues: any[];
        explicitType: bool;
        type: Function;
    }
    var lookupNamespaces;
    function lookupType(name: string) {
        lookupNamespaces.push(Fayde);
        lookupNamespaces.push(Fayde.Controls);
        lookupNamespaces.push(Fayde.Media);
        lookupNamespaces.push(Fayde.Controls.Primitives);
        lookupNamespaces.push(Fayde.Shapes);
        lookupNamespaces.push(window);
        var len = lookupNamespaces.length;
        for (var i = 0; i < len; i++) {
            var potentialType = lookupNamespaces[i][name];
            if (potentialType)
                return potentialType;
        }
        return eval(name);
    }
    function handlePeriod(data: IParseData): bool {
        if (data.tickOpen)
            return true;
        if (data.res != null) {
            var value = null;
            if ((value = data.lu._Store.GetValue(data.res)) == null)
                return false;
            if (!(value instanceof DependencyObject))
                return false;
            var newLu = value;
            if (data.promotedValues && data.promotedValues[value._ID] == null && !(value instanceof UIElement)) {
                var clonedValue = Fayde.Clone(value);
                if (clonedValue instanceof DependencyObject) {
                    newLu = clonedValue;
                    data.lu._Store.SetValue(data.res, clonedValue);
                    clonedValue = data.lu._Store.GetValue(data.res);
                    data.promotedValues[clonedValue._ID] = clonedValue;
                }
            }
            data.lu = newLu;
        }
        data.expressionFound = false;
        data.prop = data.path.substr(data.index);
        return true;
    }
    function handleLeftBracket (data: IParseData): bool {
        if (data.index >= data.end)
            return;
        var hasLeadingZeroes = false;
        while (data.path.charAt(data.index) === '0') {
            hasLeadingZeroes = true;
            data.index++;
        }
        data.i = parseInt(data.path.substr(data.index), 10);
        if (!isNaN(data.i))
            data.index += data.i.toString().length;
        if (isNaN(data.i) && hasLeadingZeroes)
            data.i = 0;
        if (data.path.charAt(data.index) !== ']' || data.path.charAt(data.index + 1) !== '.')
            return true;
        data.prop = data.path = data.path.substr(data.index + 2);
        data.index = 0;
        data.end = data.path.length;
        var value = null;
        if (data.expressionFound) {
            data.expressionFound = false;
            if ((value = data.lu.GetValue(data.res)) == null)
                return false;
        }
        if (value instanceof XamlObjectCollection) {
            data.collection = <XamlObjectCollection>value;
        } else {
            data.collection = null;
            return false;
        }
        if ((value = (<XamlObjectCollection>data.collection).GetValueAt(data.i)) == null)
            return false;
        if (value instanceof DependencyObject) {
            data.lu = <DependencyObject>value;
        } else {
            data.lu = null;
            return false;
        }
        return true;
    }
    function handleDefault(data: IParseData): bool {
        var explicitType = false;
        data.expressionFound = true;
        var start = data.index - 1;
        var c;
        while (data.index < data.end) {
            c = data.path.charAt(data.index);
            if (!((c !== '.' || data.tickOpen) && (!data.parenOpen || c !== ')') && c !== '['))
                break;
            data.index++;
            if (c === '\'') {
                data.tickOpen = !data.tickOpen;
                if (!data.tickOpen)
                    break;
            }
        }
        if (data.index === data.end) {
            data.type = (<any>data.lu).constructor;
        } else {
            c = data.path.charAt(data.index);
            if (c === '.') {
                if ((data.index - start) === 11 && data.path.substr(start, 11).toLowerCase() === "textelement") { //bug workaround from Blend
                    data.type = Controls.TextBlock;
                    data.explicitType = true;
                } else {
                    var s = data.index;
                    if (data.path.charAt(data.index - 1) === '\'' && !data.tickOpen) {
                        s = data.index - 1;
                    }
                    var name = data.path.slice(start, s);
                    data.type = lookupType(name);
                    data.explicitType = true;
                    if (!data.type)
                        data.type = (<any>data.lu).constructor;
                }
                data.index++;
                start = data.index;
                while (data.index < data.end) {
                    c = data.path.charAt(data.index);
                    if (!((!data.parenOpen || c !== ')') && (c !== '.' || data.tickOpen)))
                        break;
                    data.index++;
                    if (c === '\'') {
                        data.tickOpen = !data.tickOpen;
                        if (!data.tickOpen)
                            break;
                    }
                }
                if (data.index === start)
                    return false;
            } else {
                data.type = (<any>data.lu).constructor;
                data.explicitType = false;
            }
            c = data.path.charAt(data.index);
            if ((c !== ')' && data.parenOpen) || data.type == null)
                return false;
        }
        name = data.path.slice(start, data.index);
        if ((data.res = DependencyProperty.GetDependencyProperty(data.type, name)) == null && data.lu)
            data.res = DependencyProperty.GetDependencyProperty((<any>data.lu).constructor, name);
        if (data.res == null)
            return false;
        if (!data.res._IsAttached && !(data.lu instanceof data.type)) {
            if ((data.res = DependencyProperty.GetDependencyProperty((<any>data.lu).constructor, name)) == null)
                return false;
        }
        if (data.res._IsAttached && data.explicitType && !data.parenOpen)
            return false;
        return true;
    }
    export class PropertyPath implements ICloneable {
        private _Path: string;
        private _ExpandedPath: string;
        private _Propd: DependencyProperty = null;
        constructor(path?: string, expandedPath?: string) {
            this._Path = path;
            this._ExpandedPath = expandedPath;
        }
        static CreateFromParameter(parameter) {
            var p = new PropertyPath();
            if (parameter instanceof DependencyProperty)
                p._Propd = <DependencyProperty>parameter;
            p._Path = null;
            if (parameter instanceof String)
                p._Path = parameter;
            return p;
        }
        TryResolveDependencyProperty(dobj: DependencyObject) {
            if (this.HasDependencyProperty)
                return;
            if (dobj)
                this._Propd = DependencyProperty.GetDependencyProperty((<any>dobj).constructor, this.Path);
        }
        get Path(): string { return !this._Propd ? this._Path : "(0)"; }
        get ExpandedPath(): string { return !this._Propd ? this._ExpandedPath : "(0)"; }
        get ParsePath(): string {
            if (this._Propd)
                return "(0)";
            if (this._ExpandedPath)
                return this._ExpandedPath;
            return this._Path;
        }
        get HasDependencyProperty() { return this._Propd != null; }
        get DependencyProperty() { return this._Propd; }
        static ResolvePropertyPath(refobj: IOutValue, propertyPath: PropertyPath, promotedValues: any[]): DependencyProperty {
            if (propertyPath.HasDependencyProperty)
                return propertyPath.DependencyProperty;
            var path = propertyPath.Path;
            if (propertyPath.ExpandedPath != null)
                path = propertyPath.ExpandedPath;
            var data: IParseData = {
                index: 0,
                i: 0,
                end: path.length,
                path: path,
                parenOpen: false,
                tickOpen: false,
                prop: path,
                res: null,
                cloned: false,
                expressionFound: false,
                lu: refobj.Value,
                collection: null,
                promotedValues: promotedValues,
                explicitType: false,
                type: null
            };
            var success;
            while (data.index < data.end) {
                success = true;
                var c = data.path.charAt(data.index);
                data.index++;
                if (c === '(') {
                    data.parenOpen = true;
                } else if (c === ')') {
                    data.parenOpen = false;
                } else if (c === '\'') {//Ticks only legal in expanded path
                    if (propertyPath.ExpandedPath == null)
                        Warn("The ' character is not legal in property paths.");
                    else
                        data.tickOpen = !data.tickOpen;
                } else if (c === '.') {
                    success = handlePeriod(data);
                } else if (c === '[') {
                    success = handleLeftBracket(data);
                } else {
                    success = handleDefault(data);
                }
                if (!success) {
                    refobj.Value = null;
                    return null;
                }
            }
            refobj.Value = data.lu;
            return data.res;
        }
        Clone(): PropertyPath {
            return new PropertyPath(this._Path, this._ExpandedPath);
        }
    }
    Nullstone.RegisterType(PropertyPath, "PropertyPath");
}

module Fayde.Shapes {
    export class Ellipse extends Shape {
        private _Path: RawPath; //defined in Shape
        private _ShapeFlags: ShapeFlags; //defined in Shape
        private _Stroke: Media.Brush; //defined in Shape
        constructor() {
            super();
            this.Stretch = Media.Stretch.Fill;
        }
        private _DrawPath(ctx: RenderContext) {
            if (!this._Path)
                this._BuildPath();
            super._DrawPath(ctx);
        }
        private _BuildPath() {
            var stretch = this.Stretch;
            var t = this._Stroke != null ? this.StrokeThickness : 0.0;
            var irect = new rect();
            irect.Width = this.ActualWidth;
            irect.Height = this.ActualHeight;
            switch (stretch) {
                case Fayde.Media.Stretch.None:
                    irect.Width = irect.Height = 0;
                    break;
                case Fayde.Media.Stretch.Uniform:
                    irect.Width = irect.Height = Math.min(irect.Width, irect.Height);
                    break;
                case Fayde.Media.Stretch.UniformToFill:
                    irect.Width = irect.Height = Math.max(irect.Width, irect.Height);
                    break;
                case Fayde.Media.Stretch.Fill:
                    break;
            }
            if (t >= irect.Width || t >= irect.Height) {
                irect.Width = Math.max(irect.Width, t + t * 0.001);
                irect.Height = Math.max(irect.Height, t + t * 0.001);
                this._ShapeFlags = ShapeFlags.Degenerate;
            } else {
                this._ShapeFlags = ShapeFlags.Normal;
            }
            var ht = -t / 2;
            rect.growBy(irect, ht, ht, ht, ht);
            var path = new Fayde.Shapes.RawPath();
            path.Ellipse(irect.X, irect.Y, irect.Width, irect.Height);
            this._Path = path;
        }
        private _ComputeStretchBounds(): rect { return this._ComputeShapeBounds(false); }
        private _ComputeShapeBounds(logical: bool): rect {
            var irect = new rect();
            irect.Width = this.ActualWidth;
            irect.Height = this.ActualHeight;
            this._ShapeFlags = ShapeFlags.Normal;
            var width = this.Width;
            var height = this.Height;
            if (irect.Width < 0.0 || irect.Height < 0.0 || width <= 0.0 || height <= 0.0) {
                this._ShapeFlags = ShapeFlags.Empty;
                return new rect();
            }
            var node = this.XamlNode;
            var vpNode = node.VisualParentNode;
            if (vpNode instanceof Controls.CanvasNode) {
                if (isNaN(width) !== isNaN(height)) {
                    this._ShapeFlags = ShapeFlags.Empty;
                    return new rect();
                }
            }
            var t = this._Stroke != null ? this.StrokeThickness : 0.0;
            switch (this.Stretch) {
                case Fayde.Media.Stretch.None:
                    irect.Width = irect.Height = 0.0;
                    break;
                case Fayde.Media.Stretch.Uniform:
                    irect.Width = irect.Height = Math.min(irect.Width, irect.Height);
                    break;
                case Fayde.Media.Stretch.UniformToFill:
                    irect.Width = irect.Height = Math.max(irect.Width, irect.Height);
                    break;
                case Fayde.Media.Stretch.Fill:
                    break;
            }
            if (t >= irect.Width || t >= irect.Height) {
                irect.Width = Math.max(irect.Width, t + t * 0.001);
                irect.Height = Math.max(irect.Height, t + t * 0.001);
                this._ShapeFlags = ShapeFlags.Degenerate;
            } else {
                this._ShapeFlags = ShapeFlags.Normal;
            }
            return irect;
        }
        private _ComputeShapeBoundsImpl(logical: bool, matrix): rect {
            var r = new rect();
            if (logical) {
                r.Width = 1.0;
                r.Height = 1.0;
            }
            return r;
        }
    }
    Nullstone.RegisterType(Ellipse, "Ellipse");
}

module Fayde.Shapes {
    export class Line extends Shape {
        private _Path: RawPath; //defined in Shape
        private _ShapeFlags: ShapeFlags; //defined in Shape
        static X1Property: DependencyProperty = DependencyProperty.Register("X1", () => Number, Line, 0.0, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        static Y1Property: DependencyProperty = DependencyProperty.Register("Y1", () => Number, Line, 0.0, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        static X2Property: DependencyProperty = DependencyProperty.Register("X2", () => Number, Line, 0.0, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        static Y2Property: DependencyProperty = DependencyProperty.Register("Y2", () => Number, Line, 0.0, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        X1: number;
        Y1: number;
        X2: number;
        Y2: number;
        private _DrawPath(ctx: RenderContext) {
            if (!this._Path)
                this._BuildPath();
            super._DrawPath(ctx);
        }
        private _BuildPath() {
            this._ShapeFlags = ShapeFlags.Normal;
            var path = new RawPath();
            this._Path = path;
            var x1 = this.X1;
            var y1 = this.Y1;
            var x2 = this.X2;
            var y2 = this.Y2;
            path.Move(x1, y1);
            path.Line(x2, y2);
        }
        private _ComputeShapeBounds(logical: bool): rect {
            var shapeBounds = new rect();
            var thickness = 0;
            if (!logical)
                thickness = this.StrokeThickness;
            if (thickness <= 0.0 && !logical)
                return shapeBounds;
            var x1 = this.X1;
            var y1 = this.Y1;
            var x2 = this.X2;
            var y2 = this.Y2;
            rect.set(shapeBounds,
                Math.min(x1, x2),
                Math.min(y1, y2),
                Math.abs(x2 - x1),
                Math.abs(y2 - y1)
            );
            return shapeBounds;
        }
    }
    Nullstone.RegisterType(Line, "Line");
}

module Fayde.Shapes {
    export class Path extends Shape {
        private _ShapeFlags: ShapeFlags; //defined in Shape
        private _Stroke: Media.Brush; //defined in Shape
        static DataProperty: DependencyProperty = DependencyProperty.RegisterCore("Data", () => Media.Geometry, Path, undefined, (d, args) => (<Shape>d)._InvalidateNaturalBounds());
        Data: Media.Geometry;
        private _GetFillRule(): FillRule {
            var geom = this.Data;
            if (!geom)
                return super._GetFillRule();
            return (<Media.PathGeometry>geom).FillRule;
        }
        private _DrawPath(ctx: RenderContext) {
            var geom = this.Data;
            if (!geom)
                return;
            geom.Draw(ctx);
        }
        private _ComputeShapeBoundsImpl(logical: bool, matrix: number[]): rect {
            var geom = this.Data;
            if (geom == null) {
                this._ShapeFlags = ShapeFlags.Empty;
                return new rect();
            }
            if (logical)
                return geom.GetBounds();
            var thickness = (logical || this._Stroke != null) ? 0.0 : this.StrokeThickness;
            return geom.GetBounds(thickness);
        }
    }
    Nullstone.RegisterType(Path, "Path");
}

module Fayde.Shapes {
    function extendLine(p1: Point, p2: Point, thickness: number) {
        var t5 = thickness * 5.0;
        var dx = p1.X - p2.X;
        var dy = p1.Y - p2.Y;
        if (dy === 0.0) {
            t5 -= thickness / 2.0;
            if (dx > 0.0) {
                p1.X += t5;
                p2.X -= t5;
            } else {
                p1.X -= t5;
                p2.X += t5;
            }
        } else if (dx === 0.0) {
            t5 -= thickness / 2.0;
            if (dy > 0.0) {
                p1.Y += t5;
                p2.Y -= t5;
            } else {
                p1.Y -= t5;
                p2.Y += t5;
            }
        } else {
            var angle = Math.atan2(dy, dx);
            var ax = Math.abs(Math.sin(angle) * t5);
            if (dx > 0.0) {
                p1.X += ax;
                p2.X -= ax;
            } else {
                p1.X -= ax;
                p2.X += ax;
            }
            var ay = Math.abs(Math.sin(Math.PI / 2 - angle)) * t5;
            if (dy > 0.0) {
                p1.Y += ay;
                p2.Y -= ay;
            } else {
                p1.Y -= ay;
                p2.Y += ay;
            }
        }
    }
    export class Polygon extends Shape {
        private _Path: RawPath; //defined in Shape
        private _ShapeFlags: ShapeFlags; //defined in Shape
        private _Stroke: Media.Brush; //defined in Shape
        static FillRuleProperty: DependencyProperty = DependencyProperty.RegisterCore("FillRule", () => new Enum(FillRule), Polygon, FillRule.EvenOdd, (d, args) => (<Polygon>d)._FillRuleChanged(args));
        static PointsProperty: DependencyProperty = DependencyProperty.RegisterFull("Points", () => PointCollection, Polygon, undefined, (d, args) => (<Polygon>d)._PointsChanged(args));
        FillRule: FillRule;
        get Points(): PointCollection { return this.GetValue(Polygon.PointsProperty); }
        set Points(value) {
            if (typeof value === "string")
                value = PointCollection.FromData(<string>value);
            this.SetValue(Polygon.PointsProperty, value);
        }
        private _PointsChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldColl = args.OldValue;
            var newColl = args.NewValue;
            if (oldColl instanceof PointCollection)
                (<PointCollection>oldColl).Owner = null;
            if (newColl instanceof PointCollection)
                (<PointCollection>newColl).Owner = this;
            this._InvalidateNaturalBounds();
        }
        private _BuildPath() {
            var points = this.Points;
            var count;
            if (!points || (count = points.Count) < 2) {
                this._ShapeFlags = ShapeFlags.Empty;
                return;
            }
            this._ShapeFlags = ShapeFlags.Normal;
            var path = new RawPath();
            var enumerator = points.GetEnumerator();
            enumerator.MoveNext();
            var p = <Point>enumerator.Current;
            if (count === 2) {
                enumerator.MoveNext();
                var p2 = enumerator.Current;
                extendLine(p, p2, this.StrokeThickness);
                path.Move(p.X, p.Y);
                path.Line(p2.X, p2.Y);
            } else {
                path.Move(p.X, p.Y);
                while (enumerator.MoveNext()) {
                    p = enumerator.Current;
                    path.Line(p.X, p.Y);
                }
            }
            path.Close();
            this._Path = path;
        }
        private _FillRuleChanged(args: IDependencyPropertyChangedEventArgs) {
            this.XamlNode.LayoutUpdater.Invalidate();
        }
    }
    Nullstone.RegisterType(Polygon, "Polygon");
}

module Fayde.Shapes {
    function extendLine(p1: Point, p2: Point, thickness: number) {
        var t5 = thickness * 5.0;
        var dx = p1.X - p2.X;
        var dy = p1.Y - p2.Y;
        if (dy === 0.0) {
            t5 -= thickness / 2.0;
            if (dx > 0.0) {
                p1.X += t5;
                p2.X -= t5;
            } else {
                p1.X -= t5;
                p2.X += t5;
            }
        } else if (dx === 0.0) {
            t5 -= thickness / 2.0;
            if (dy > 0.0) {
                p1.Y += t5;
                p2.Y -= t5;
            } else {
                p1.Y -= t5;
                p2.Y += t5;
            }
        } else {
            var angle = Math.atan2(dy, dx);
            var ax = Math.abs(Math.sin(angle) * t5);
            if (dx > 0.0) {
                p1.X += ax;
                p2.X -= ax;
            } else {
                p1.X -= ax;
                p2.X += ax;
            }
            var ay = Math.abs(Math.sin(Math.PI / 2 - angle)) * t5;
            if (dy > 0.0) {
                p1.Y += ay;
                p2.Y -= ay;
            } else {
                p1.Y -= ay;
                p2.Y += ay;
            }
        }
    }
    export class Polyline extends Shape {
        private _Path: RawPath; //defined in Shape
        private _ShapeFlags: ShapeFlags; //defined in Shape
        private _Stroke: Media.Brush; //defined in Shape
        static FillRuleProperty: DependencyProperty = DependencyProperty.RegisterCore("FillRule", () => new Enum(FillRule), Polyline, FillRule.EvenOdd, (d, args) => (<Polyline>d)._FillRuleChanged(args));
        static PointsProperty: DependencyProperty = DependencyProperty.RegisterFull("Points", () => PointCollection, Polyline, undefined, (d, args) => (<Polyline>d)._PointsChanged(args));
        FillRule: FillRule;
        get Points(): PointCollection { return this.GetValue(Polyline.PointsProperty); }
        set Points(value) {
            if (typeof value === "string")
                value = PointCollection.FromData(<string>value);
            this.SetValue(Polyline.PointsProperty, value);
        }
        private _PointsChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldColl = args.OldValue;
            var newColl = args.NewValue;
            if (oldColl instanceof PointCollection)
                (<PointCollection>oldColl).Owner = null;
            if (newColl instanceof PointCollection)
                (<PointCollection>newColl).Owner = this;
            this._InvalidateNaturalBounds();
        }
        private _BuildPath() {
            var points = this.Points;
            var count;
            if (!points || (count = points.Count) < 2) {
                this._ShapeFlags = ShapeFlags.Empty;
                return;
            }
            this._ShapeFlags = ShapeFlags.Normal;
            var path = new RawPath();
            var enumerator = points.GetEnumerator();
            enumerator.MoveNext();
            var p = <Point>enumerator.Current;
            path.Move(p.X, p.Y);
            while (enumerator.MoveNext()) {
                p = enumerator.Current;
                path.Line(p.X, p.Y);
            }
            path.Close();
            this._Path = path;
        }
        private _FillRuleChanged(args: IDependencyPropertyChangedEventArgs) {
            this.XamlNode.LayoutUpdater.Invalidate();
        }
    }
    Nullstone.RegisterType(Polyline, "Polyline");
}

module Fayde.Shapes {
    declare var NotImplemented;
    export class Rectangle extends Shape {
        private _Path: RawPath; //defined in Shape
        private _ShapeFlags: ShapeFlags; //defined in Shape
        private _Stroke: Media.Brush; //defined in Shape
        static RadiusXProperty: DependencyProperty = DependencyProperty.Register("RadiusX", () => Number, Rectangle, 0.0, (d, args) => (<Rectangle>d)._RadiusChanged(args));
        static RadiusYProperty: DependencyProperty = DependencyProperty.Register("RadiusY", () => Number, Rectangle, 0.0, (d, args) => (<Rectangle>d)._RadiusChanged(args));
        RadiusX: number;
        RadiusY: number;
        constructor() {
            super();
            this.Stretch = Media.Stretch.Fill;
        }
        private _DrawPath(ctx: RenderContext) {
            if (!this._Path)
                this._BuildPath();
            super._DrawPath(ctx);
        }
        private _BuildPath() {
            var stretch = this.Stretch;
            var t = this._Stroke != null ? this.StrokeThickness : 0.0;
            var irect = new rect();
            irect.Width = this.ActualWidth;
            irect.Height = this.ActualHeight;
            var radiusX = this.RadiusX;
            var radiusY = this.RadiusY;
            switch (stretch) {
                case Media.Stretch.None:
                    irect.Width = irect.Height = 0;
                    break;
                case Media.Stretch.Uniform:
                    irect.Width = irect.Height = Math.min(irect.Width, irect.Height);
                    break;
                case Media.Stretch.UniformToFill:
                    irect.Width = irect.Height = Math.max(irect.Width, irect.Height);
                    break;
                case Media.Stretch.Fill:
                    break;
            }
            if (irect.Width === 0)
                irect.X = t * 0.5;
            if (irect.Height === 0)
                irect.Y = t * 0.5;
            var ta;
            if (t >= irect.Width || t >= irect.Height) {
                ta = t * 0.001;
                rect.growBy(irect, ta, ta, ta, ta);
                this._ShapeFlags = ShapeFlags.Degenerate;
            } else {
                ta = -t * 0.5;
                rect.growBy(irect, ta, ta, ta, ta);
                this._ShapeFlags = ShapeFlags.Normal;
            }
            var path = new RawPath();
            if ((radiusX === 0.0 && radiusY === 0.0) || (radiusX === radiusY))
                path.RoundedRect(irect.X, irect.Y, irect.Width, irect.Height, radiusX, radiusY);
            else
                NotImplemented("Rectangle._BuildPath with RadiusX !== RadiusY");
            this._Path = path;
        }
        private _ComputeShapeBounds(logical: bool): rect {
            var irect = new rect();
            irect.Width = this.ActualWidth;
            irect.Height = this.ActualHeight;
            this._ShapeFlags = ShapeFlags.Normal;
            var width = this.Width;
            var height = this.Height;
            if (irect.Width < 0.0 || irect.Height < 0.0 || width <= 0.0 || height <= 0.0) {
                this._ShapeFlags = ShapeFlags.Empty;
                return new rect();
            }
            var node = this.XamlNode;
            var vpNode = node.VisualParentNode;
            if (vpNode instanceof Controls.CanvasNode) {
                if (isNaN(width) !== isNaN(height)) {
                    this._ShapeFlags = ShapeFlags.Empty;
                    return new rect();
                }
            }
            var t = this._Stroke != null ? this.StrokeThickness : 0.0;
            switch (this.Stretch) {
                case Media.Stretch.None:
                    irect.Width = irect.Height = 0.0;
                    break;
                case Media.Stretch.Uniform:
                    irect.Width = irect.Height = Math.min(irect.Width, irect.Height);
                    break;
                case Media.Stretch.UniformToFill:
                    irect.Width = irect.Height = Math.max(irect.Width, irect.Height);
                    break;
                case Media.Stretch.Fill:
                    break;
            }
            if (irect.Width === 0)
                irect.X = t * 0.5;
            if (irect.Height === 0)
                irect.Y = t * 0.5;
            if (t >= irect.Width || t >= irect.Height) {
                var g = t * 0.5005;
                rect.growBy(irect, g, g, g, g);
                this._ShapeFlags = ShapeFlags.Degenerate;
            } else {
                this._ShapeFlags = ShapeFlags.Normal;
            }
            return irect;
        }
        private _ComputeShapeBoundsImpl(logical: bool, matrix?): rect {
            var r = new rect();
            if (logical) {
                r.Width = 1.0;
                r.Height = 1.0;
            }
            return r;
        }
        private _ComputeStretchBounds(): rect { return this._ComputeShapeBounds(false); }
        private _RadiusChanged(args: IDependencyPropertyChangedEventArgs) {
            var lu = this.XamlNode.LayoutUpdater;
            lu.InvalidateMeasure();
            this._InvalidatePathCache();
            lu.Invalidate();
        }
    }
    Nullstone.RegisterType(Rectangle, "Rectangle");
}

module Fayde.Controls {
    export class CanvasNode extends PanelNode {
        private _Surface: Surface;
        XObject: Canvas;
        constructor(xobj: Canvas) {
            super(xobj);
            this.LayoutUpdater.BreaksLayoutClipRender = true;
        }
        AttachVisualChild(uie: UIElement, error: BError): bool {
            if (!super.AttachVisualChild(uie, error))
                return false;
            this._UpdateIsLayoutContainerOnAdd(uie);
        }
        DetachVisualChild(uie: UIElement, error: BError): bool {
            if (!super.DetachVisualChild(uie, error))
                return false;
            this._UpdateIsLayoutContainerOnRemove(uie);
        }
        private _UpdateIsLayoutContainerOnAdd(uie: UIElement) {
            var lu = this.LayoutUpdater;
            if (lu.IsLayoutContainer)
                return;
            var walker = DeepTreeWalker(uie.XamlNode);
            var childNode: UINode;
            while (childNode = walker.Step()) {
                if (!(childNode instanceof CanvasNode) && childNode.LayoutUpdater.IsLayoutContainer) {
                    lu.IsLayoutContainer = true;
                    break;
                }
            }
        }
        private _UpdateIsLayoutContainerOnRemove(uie: UIElement) {
            var lu = this.LayoutUpdater;
            if (!lu.IsLayoutContainer)
                return;
            var walker = DeepTreeWalker(this);
            var childNode: UINode;
            while (childNode = walker.Step()) {
                if (!(childNode instanceof CanvasNode) && childNode.LayoutUpdater.IsLayoutContainer) {
                    lu.IsLayoutContainer = true;
                    break;
                }
            }
            lu.IsLayoutContainer = false;
        }
        ComputeBounds(baseComputer: () => void , lu: LayoutUpdater) {
            var surface = this._Surface;
            if (surface && this.IsAttached && this.IsTopLevel) {
                var surfaceSize = surface.Extents;
                rect.set(lu.Extents, 0, 0, surfaceSize.Width, surfaceSize.Height);
                rect.copyTo(lu.Extents, lu.ExtentsWithChildren);
                rect.copyTo(lu.Extents, lu.Bounds);
                rect.copyTo(lu.Bounds, lu.BoundsWithChildren);
                lu.ComputeGlobalBounds();
                lu.ComputeSurfaceBounds();
            } else {
                super.ComputeBounds(baseComputer, lu);
            }
        }
    }
    Nullstone.RegisterType(CanvasNode, "CanvasNode");
    function invalidateTopLeft(d: DependencyObject, args: IDependencyPropertyChangedEventArgs) {
        if (!(d instanceof UIElement))
            return;
        var n: UINode;
        var lu: LayoutUpdater;
        var uie = <UIElement>d;
        if (uie instanceof Canvas) {
            n = uie.XamlNode;
            if (n.VisualParentNode == null) {
                lu = n.LayoutUpdater;
                lu.UpdateTransform();
                lu.InvalidateArrange();
            }
        }
        var vpNode = uie.XamlNode.VisualParentNode;
        if (!(vpNode instanceof CanvasNode))
            return;
        n = uie.XamlNode;
        lu = n.LayoutUpdater;
        var childFinal = rect.fromSize(lu.DesiredSize);
        childFinal.X = Canvas.GetLeft(uie);
        childFinal.Y = Canvas.GetTop(uie);
        if (uie.UseLayoutRounding) {
            childFinal.X = Math.round(childFinal.X);
            childFinal.Y = Math.round(childFinal.Y);
            childFinal.Width = Math.round(childFinal.Width);
            childFinal.Height = Math.round(childFinal.Height);
        }
        lu.LayoutSlot = childFinal;
        lu.InvalidateArrange();
    }
    export class Canvas extends Panel implements IMeasurableHidden, IArrangeableHidden {
        static TopProperty: DependencyProperty = DependencyProperty.RegisterAttached("Top", () => Number, Canvas, 0.0, invalidateTopLeft);
        static GetTop(d: DependencyObject): number { return d.GetValue(TopProperty); }
        static SetTop(d: DependencyObject, value: number) { d.SetValue(TopProperty, value); }
        static LeftProperty: DependencyProperty = DependencyProperty.RegisterAttached("Left", () => Number, Canvas, 0.0, invalidateTopLeft);
        static GetLeft(d: DependencyObject): number { return d.GetValue(LeftProperty); }
        static SetLeft(d: DependencyObject, value: number) { d.SetValue(LeftProperty, value); }
        private _MeasureOverride(availableSize: size, error: BError): size {
            var childSize = size.createInfinite();
            var enumerator = this.XamlNode.GetVisualTreeEnumerator();
            while (enumerator.MoveNext()) {
                var childNode = <FENode>enumerator.Current;
                childNode.LayoutUpdater._Measure(childSize, error);
            }
            return new size();
        }
        private _ArrangeOverride(finalSize: size, error: BError): size {
            var enumerator = this.XamlNode.GetVisualTreeEnumerator();
            while (enumerator.MoveNext()) {
                var childNode = <FENode>enumerator.Current;
                var lu = childNode.LayoutUpdater;
                var childFinal = rect.fromSize(lu.DesiredSize);
                childFinal.X = Canvas.GetLeft(childNode.XObject);
                childFinal.Y = Canvas.GetTop(childNode.XObject);
                lu._Arrange(childFinal, error);
            }
            return finalSize;
        }
    }
    Nullstone.RegisterType(Canvas, "Canvas");
}

module Fayde.Controls {
    export class ContentControlNode extends ControlNode {
        XObject: ContentControl;
        constructor(xobj: ContentControl) {
            super(xobj);
        }
        _GetDefaultTemplate(): UIElement {
            var xobj = this.XObject;
            var content = xobj.Content;
            if (content instanceof UIElement)
                return <UIElement>content;
            if (content) {
                var fr = this.FallbackRoot;
                fr.XamlNode.DataContext = content;
                return fr;
            }
        }
        OnContentChanged(newContent: any) {
            if (this._FallbackRoot)
                this._FallbackRoot.XamlNode.DataContext = newContent;
        }
        private _FallbackRoot: UIElement;
        get FallbackRoot(): UIElement {
            var fr = this._FallbackRoot;
            if (!fr) {
                var ft = ContentControlNode._FallbackTemplate;
                if (!ft)
                    ft = ContentControlNode._CreateFallbackTemplate();
                fr = this._FallbackRoot = <UIElement>ft.GetVisualTree(this.XObject);
            }
            return fr;
        }
        private static _FallbackTemplate: ControlTemplate;
        private static _CreateFallbackTemplate(): ControlTemplate {
            return new ControlTemplate(ContentControl, {
                ParseType: Grid,
                Children: [
                    {
                        ParseType: TextBlock,
                        Props: { Text: new BindingMarkup({}) }
                    }
                ]
            });
        }
    }
    Nullstone.RegisterType(ContentControlNode, "ContentControlNode");
    export class ContentControl extends Control {
        XamlNode: ContentControlNode;
        CreateNode(): ContentControlNode { return new ContentControlNode(this); }
        _ContentSetsParent: bool = true;
        static ContentProperty: DependencyProperty = DependencyProperty.RegisterCore("Content", () => Object, ContentControl, undefined, (d, args) => (<ContentControl>d)._ContentChanged(args));
        static ContentTemplateProperty = DependencyProperty.RegisterCore("ContentTemplate", () => ControlTemplate, ContentControl, undefined, (d, args) => (<ContentControl>d)._ContentTemplateChanged(args));
        Content: any;
        ContentTemplate: ControlTemplate;
        static Annotations = { ContentProperty: ContentControl.ContentProperty }
        OnContentChanged(oldContent: any, newContent: any) { }
        OnContentTemplateChanged(oldContentTemplate: ControlTemplate, newContentTemplate: ControlTemplate) { }
        _ContentChanged(args: IDependencyPropertyChangedEventArgs) {
            if (args.OldValue instanceof UIElement)
                this.XamlNode.DetachVisualChild(<UIElement>args.OldValue, null);
            this.XamlNode.OnContentChanged(args.NewValue);
            this.OnContentChanged(args.OldValue, args.NewValue);
            this.XamlNode.LayoutUpdater.InvalidateMeasure();
        }
        _ContentTemplateChanged(args: IDependencyPropertyChangedEventArgs) {
            this.OnContentTemplateChanged(args.OldValue, args.NewValue);
            this.XamlNode.LayoutUpdater.InvalidateMeasure();
        }
    }
    Nullstone.RegisterType(ContentControl, "ContentControl");
}

module Fayde.Controls {
    export class Frame extends ContentControl {
        static IsDeepLinkedProperty: DependencyProperty = DependencyProperty.Register("IsDeepLinked", () => Boolean, Frame, true);
        static CurrentSourceProperty: DependencyProperty = DependencyProperty.RegisterReadOnly("CurrentSource", () => Uri, Frame);
        static SourceProperty: DependencyProperty = DependencyProperty.Register("Source", () => Uri, Frame, undefined, (d, args) => (<Frame>d).SourcePropertyChanged(args));
        IsDeepLinked: bool;
        CurrentSource: Uri;
        Source: Uri;
        private _Request: AjaxJsonRequest;
        private _Resolver: XamlResolver;
        private _NavService: Navigation.NavService;
        constructor() {
            super();
            this.Loaded.Subscribe(this._FrameLoaded, this);
        }
        Navigate(uri: Uri) {
            this._Request = new AjaxJsonRequest(
                (result) => this._HandleSuccessfulResponse(result),
                (error) => this._HandleErrorResponse(error));
            this._Request.Get(uri.toString());
        }
        GoForward() {
        }
        GoBackward() {
        }
        StopLoading() {
            if (this._Request) {
                this._Request.Cancel();
                this._Request = null;
            }
        }
        private _FrameLoaded(sender, e: RoutedEventArgs) {
            this._NavService = App.Instance.NavService;
            if (this.IsDeepLinked) {
                this._NavService.LocationChanged.Subscribe(this._HandleDeepLink, this);
                this._HandleDeepLink();
            }
        }
        private _HandleDeepLink() {
            var source = this._NavService.Href + "#" + this._NavService.Hash;
            this.SetValueInternal(Frame.CurrentSourceProperty, source);
            this._LoadContent(this._NavService.Href, this._NavService.Hash);
        }
        private _LoadContent(href: string, hash: string) {
            this.StopLoading();
            var that = this;
            this._Resolver = new XamlResolver(
                (xamlResult, scriptResult) => this._HandleSuccessfulResponse(xamlResult),
                (xamlResult, scriptResult) => this._HandleSuccessfulSubResponse(xamlResult),
                (error) => this._HandleErrorResponse(error));
            this._Resolver.Load(href, hash);
        }
        private _HandleSuccessfulResponse(ajaxJsonResult: AjaxJsonResult) {
            var response = JsonParser.Parse(ajaxJsonResult.CreateJson());
            if (response instanceof Page) {
                var page = <Page>response;
                document.title = page.Title;
                this.Content = page;
            }
            this._Request = null;
        }
        private _HandleSuccessfulSubResponse(ajaxJsonResult: AjaxJsonResult) {
            var json = ajaxJsonResult.CreateJson();
            var jsType = json.ParseType;
            jsType.__TemplateJson = json;
        }
        private _HandleErrorResponse(error: string) {
            this._Resolver = null;
        }
        private SourcePropertyChanged(args: IDependencyPropertyChangedEventArgs) {
            if (true)//if loaded and not updating source from nav service
                this.Navigate(args.NewValue);
        }
    }
    Nullstone.RegisterType(Frame, "Frame");
}

module Fayde.Controls {
    export class GridNode extends PanelNode {
        XObject: Grid;
        constructor(xobj: Grid) {
            super(xobj);
        }
        ComputeBounds(baseComputer: () => void , lu: LayoutUpdater) {
            super.ComputeBounds(baseComputer, lu);
            if (this.XObject.ShowGridLines) {
                rect.set(lu.Extents, 0, 0, lu.ActualWidth, lu.ActualHeight);
                rect.union(lu.ExtentsWithChildren, lu.Extents);
                lu.IntersectBoundsWithClipPath(lu.Bounds, lu.AbsoluteXform);
                rect.union(lu.BoundsWithChildren, lu.Bounds);
                lu.ComputeGlobalBounds();
                lu.ComputeSurfaceBounds();
            }
        }
    }
    Nullstone.RegisterType(GridNode, "GridNode");
    export interface ISegment {
        DesiredSize: number;
        OfferedSize: number;
        OriginalSize: number;
        Min: number;
        Max: number;
        Stars: number;
        Type: GridUnitType;
        Clamp: (value: number) => number;
        SetOfferedToDesired: () => number;
        SetDesiredToOffered: () => number;
    }
    function createSegment(offered?: number, min?: number, max?: number, unitType?: GridUnitType): ISegment {
        if (offered == null) offered = 0.0;
        if (min == null) min = 0.0;
        if (max == null) max = Number.POSITIVE_INFINITY;
        if (unitType == null) unitType = GridUnitType.Pixel;
        if (offered < min)
            offered = min;
        else if (offered > max)
            offered = max;
        return {
            DesiredSize: 0,
            OfferedSize: offered,
            OriginalSize: offered,
            Min: min,
            Max: max,
            Stars: 0,
            Type: unitType,
            Clamp: function (value: number): number {
                if (value < this.Min)
                    return this.Min;
                if (value > this.Max)
                    return this.Max;
                return value;
            },
            SetOfferedToDesired: function (): number { return this._OfferedSize = this._DesiredSize; },
            SetDesiredToOffered: function (): number { return this._DesiredSize = this._OfferedSize; }
        };
    }
    interface IGridStates {
        HasAutoAuto: bool;
        HasStarAuto: bool;
        HasAutoStar: bool;
    }
    interface IGridChildPlacement {
        Matrix: ISegment[][];
        Row: number;
        Col: number;
        Size: number;
    }
    function createGridChildPlacement(matrix: ISegment[][], row: number, col: number, size: number): IGridChildPlacement {
        return {
            Matrix: matrix,
            Row: row,
            Col: col,
            Size: size
        };
    }
    function walkGrid(grid: Grid, rowMatrix: ISegment[][], colMatrix: ISegment[][]): IGridStates {
        var haa: bool = false;
        var hsa: bool = false;
        var has: bool = false;
        var starCol = false;
        var starRow = false;
        var autoCol = false;
        var autoRow = false;
        var col: number = 0;
        var row: number = 0;
        var colspan: number = 1;
        var rowspan: number = 1;
        var rowCount = rowMatrix.length;
        var colCount = colMatrix.length;
        var childNode: UINode = null;
        var child: UIElement;
        var enumerator = grid.XamlNode.GetVisualTreeEnumerator(VisualTreeDirection.Logical);
        while (enumerator.MoveNext()) {
            childNode = enumerator.Current;
            child = childNode.XObject;
            starCol = false;
            starRow = false;
            autoCol = false;
            autoRow = false;
            col = Math.min(Grid.GetColumn(child), colCount - 1);
            row = Math.min(Grid.GetRow(child), rowCount - 1);
            colspan = Math.min(Grid.GetColumnSpan(child), colCount - col);
            rowspan = Math.min(Grid.GetRowSpan(child), rowCount - row);
            for (var r = row; r < row + rowspan; r++) {
                starRow = starRow || (rowMatrix[r][r].Type === GridUnitType.Star);
                autoRow = autoRow || (rowMatrix[r][r].Type === GridUnitType.Auto);
            }
            for (var c = col; c < col + colspan; c++) {
                starCol = starCol || (colMatrix[c][c].Type === GridUnitType.Star);
                autoCol = autoCol || (colMatrix[c][c].Type === GridUnitType.Auto);
            }
            haa = haa || (autoRow && autoCol && !starRow && !starCol);
            hsa = hsa || (starRow && autoCol);
            has = has || (autoRow && starCol);
        }
        return {
            HasAutoAuto: haa,
            HasStarAuto: hsa,
            HasAutoStar: has
        };
    }
    export class Grid extends Panel implements IMeasurableHidden, IArrangeableHidden, IRowDefinitionsListener, IColumnDefinitionsListener {
        CreateNode(): GridNode { return new GridNode(this); }
        private static _AttachedPropChanged(d: DependencyObject, args: IDependencyPropertyChangedEventArgs) {
            var dNode = <UINode>d.XamlNode;
            var gridNode = dNode.VisualParentNode;
            gridNode.LayoutUpdater.InvalidateMeasure();
            dNode.LayoutUpdater.InvalidateMeasure();
        }
        static ColumnProperty: DependencyProperty = DependencyProperty.RegisterAttached("Column", () => Number, Grid, 0, Grid._AttachedPropChanged);
        static GetColumn(d: DependencyObject): number { return d.GetValue(Grid.ColumnProperty); }
        static SetColumn(d: DependencyObject, value: number) { d.SetValue(Grid.ColumnProperty, value); }
        static ColumnSpanProperty: DependencyProperty = DependencyProperty.RegisterAttached("ColumnSpan", () => Number, Grid, 1, Grid._AttachedPropChanged);
        static GetColumnSpan(d: DependencyObject): number { return d.GetValue(Grid.ColumnSpanProperty); }
        static SetColumnSpan(d: DependencyObject, value: number) { d.SetValue(Grid.ColumnSpanProperty, value); }
        static RowProperty: DependencyProperty = DependencyProperty.RegisterAttached("Row", () => Number, Grid, 0, Grid._AttachedPropChanged);
        static GetRow(d: DependencyObject): number { return d.GetValue(Grid.RowProperty); }
        static SetRow(d: DependencyObject, value: number) { d.SetValue(Grid.RowProperty, value); }
        static RowSpanProperty: DependencyProperty = DependencyProperty.RegisterAttached("RowSpan", () => Number, Grid, 1, Grid._AttachedPropChanged);
        static GetRowSpan(d: DependencyObject): number { return d.GetValue(Grid.RowSpanProperty); }
        static SetRowSpan(d: DependencyObject, value: number) { d.SetValue(Grid.RowSpanProperty, value); }
        static ShowGridLinesProperty: DependencyProperty = DependencyProperty.Register("ShowGridLines", () => Boolean, Grid, false, (d, args) => (<Grid>d)._ShowGridLinesChanged(args));
        ShowGridLines: bool;
        ColumnDefinitions: ColumnDefinitionCollection;
        RowDefinitions: RowDefinitionCollection;
        constructor() {
            super();
            var cds = new ColumnDefinitionCollection();
            cds.Listen(this);
            Object.defineProperty(this, "ColumnDefinitions", {
                value: cds,
                writable: false
            });
            var rds = new RowDefinitionCollection();
            rds.Listen(this);
            Object.defineProperty(this, "RowDefinitions", {
                value: rds,
                writable: false
            });
        }
        private _MeasureOverride(availableSize: size, error: BError): size {
            var totalSize = size.clone(availableSize);
            var cols = this.ColumnDefinitions;
            var rows = this.RowDefinitions;
            var colCount = cols ? cols.Count : 0;
            var rowCount = rows ? rows.Count : 0;
            var totalStars = new size();
            var emptyRows = rowCount === 0;
            var emptyCols = colCount === 0;
            var hasChildren = this.Children.Count > 0;
            if (emptyRows) rowCount = 1;
            if (emptyCols) colCount = 1;
            this._CreateMatrices(rowCount, colCount);
            var rm = this._RowMatrix;
            var cm = this._ColMatrix;
            var defaultGridLength: GridLength = new GridLength(1.0, GridUnitType.Star);
            var i: number = 0;
            var cell: ISegment = null;
            var enumerator: IEnumerator;
            if (emptyRows) {
                cell = createSegment(0.0, 0, Number.POSITIVE_INFINITY, GridUnitType.Star);
                cell.Stars = 1.0;
                rm[0][0] = cell;
                totalStars.Height += 1.0;
            } else {
                i = 0;
                enumerator = rows.GetEnumerator();
                var rowdef: RowDefinition = null;
                var height: GridLength = null;
                while (enumerator.MoveNext()) {
                    rowdef = enumerator.Current;
                    height = rowdef.Height;
                    if (!height) height = defaultGridLength;
                    rowdef.SetValueInternal(RowDefinition.ActualHeightProperty, Number.POSITIVE_INFINITY);
                    cell = createSegment(0.0, rowdef.MinHeight, rowdef.MaxHeight, height.Type);
                    if (height.Type === GridUnitType.Pixel) {
                        cell.OfferedSize = cell.Clamp(height.Value);
                        rowdef.SetValueInternal(RowDefinition.ActualHeightProperty, cell.SetDesiredToOffered());
                    } else if (height.Type === GridUnitType.Star) {
                        cell.Stars = height.Value;
                        totalStars.Height += height.Value;
                    } else if (height.Type === GridUnitType.Auto) {
                        cell.OfferedSize = cell.Clamp(0);
                        cell.SetDesiredToOffered();
                    }
                    rm[i][i] = cell;
                    i++;
                }
            }
            if (emptyCols) {
                cell = createSegment(0.0, 0, Number.POSITIVE_INFINITY, GridUnitType.Star);
                cell.Stars = 1.0;
                cm[0][0] = cell;
                totalStars.Width += 1.0;
            } else {
                i = 0;
                enumerator = cols.GetEnumerator();
                var coldef: ColumnDefinition = null;
                var width: GridLength = null;
                while (enumerator.MoveNext()) {
                    coldef = enumerator.Current;
                    var width = coldef.Width;
                    if (!width) width = defaultGridLength;
                    coldef.SetValueInternal(ColumnDefinition.ActualWidthProperty, Number.POSITIVE_INFINITY);
                    cell = createSegment(0.0, coldef.MinWidth, coldef.MaxWidth, width.Type);
                    if (width.Type === GridUnitType.Pixel) {
                        cell.OfferedSize = cell.Clamp(width.Value);
                        coldef.SetValueInternal(ColumnDefinition.ActualWidthProperty, cell.SetDesiredToOffered());
                    } else if (width.Type === GridUnitType.Star) {
                        cell.Stars = width.Value;
                        totalStars.Width += width.Value;
                    } else if (width.Type === GridUnitType.Auto) {
                        cell.OfferedSize = cell.Clamp(0);
                        cell.SetDesiredToOffered();
                    }
                    cm[i][i] = cell;
                    i++;
                }
            }
            var sizes: IGridChildPlacement[] = [];
            var separator: IGridChildPlacement = {
                Matrix: null,
                Row: 0,
                Col: 0,
                Size: 0,
                Cell: null
            };
            sizes.push(separator);
            var separatorIndex: number = 0;
            var c: number = 0;
            var r: number = 0;
            var childNode: UINode = null;
            var child: UIElement = null;
            var childLu: LayoutUpdater = null;
            var childSize = new size();
            var starCol = false;
            var starRow = false;
            var autoCol = false;
            var autoRow = false;
            var col = 0;
            var row = 0;
            var colspan = 0;
            var rowspan = 0;
            var node: IGridChildPlacement = null;
            var gridState = walkGrid(this, rm, cm);
            for (i = 0; i < 6; i++) {
                var autoAuto = i === 0;
                var starAuto = i === 1;
                var autoStar = i === 2;
                var starAutoAgain = i === 3;
                var nonStar = i === 4;
                var remainingStar = i === 5;
                if (hasChildren) {
                    this._ExpandStarCols(totalSize);
                    this._ExpandStarRows(totalSize);
                }
                enumerator = this.XamlNode.GetVisualTreeEnumerator();
                while (enumerator.MoveNext()) {
                    childNode = enumerator.Current;
                    child = childNode.XObject;
                    childLu = childNode.LayoutUpdater;
                    childSize = new size();
                    starCol = false;
                    starRow = false;
                    autoCol = false;
                    autoRow = false;
                    col = Math.min(Grid.GetColumn(child), colCount - 1);
                    row = Math.min(Grid.GetRow(child), rowCount - 1);
                    colspan = Math.min(Grid.GetColumnSpan(child), colCount - col);
                    rowspan = Math.min(Grid.GetRowSpan(child), rowCount - row);
                    for (r = row; r < row + rowspan; r++) {
                        starRow = starRow || (rm[r][r].Type === GridUnitType.Star);
                        autoRow = autoRow || (rm[r][r].Type === GridUnitType.Auto);
                    }
                    for (c = col; c < col + colspan; c++) {
                        starCol = starCol || (cm[c][c].Type === GridUnitType.Star);
                        autoCol = autoCol || (cm[c][c].Type === GridUnitType.Auto);
                    }
                    if (autoRow && autoCol && !starRow && !starCol) {
                        if (!autoAuto)
                            continue;
                        childSize.Width = Number.POSITIVE_INFINITY;
                        childSize.Height = Number.POSITIVE_INFINITY;
                    } else if (starRow && autoCol && !starCol) {
                        if (!(starAuto || starAutoAgain))
                            continue;
                        if (starAuto && gridState.HasAutoStar)
                            childSize.Height = Number.POSITIVE_INFINITY;
                        childSize.Width = Number.POSITIVE_INFINITY;
                    } else if (autoRow && starCol && !starRow) {
                        if (!autoStar)
                            continue;
                        childSize.Height = Number.POSITIVE_INFINITY;
                    } else if ((autoRow || autoCol) && !(starRow || starCol)) {
                        if (!nonStar)
                            continue;
                        if (autoRow)
                            childSize.Height = Number.POSITIVE_INFINITY;
                        if (autoCol)
                            childSize.Width = Number.POSITIVE_INFINITY;
                    } else if (!(starRow || starCol)) {
                        if (!nonStar)
                            continue;
                    } else {
                        if (!remainingStar)
                            continue;
                    }
                    for (r = row; r < row + rowspan; r++) {
                        childSize.Height += rm[r][r].OfferedSize;
                    }
                    for (c = col; c < col + colspan; c++) {
                        childSize.Width += cm[c][c].OfferedSize;
                    }
                    childLu._Measure(childSize, error);
                    if (!starAuto) {
                        node = createGridChildPlacement(rm, row + rowspan - 1, row, childLu.DesiredSize.Height);
                        if (node.Row === node.Col) {
                            sizes.splice(separatorIndex + 1, 0, node);
                        } else {
                            sizes.splice(separatorIndex, 0, node);
                            separatorIndex++;
                        }
                    }
                    node = createGridChildPlacement(cm, col + colspan - 1, col, childLu.DesiredSize.Width);
                    if (node.Row === node.Col) {
                        sizes.splice(separatorIndex + 1, 0, node);
                    } else {
                        sizes.splice(separatorIndex, 0, node);
                        separatorIndex++;
                    }
                }
                sizes.splice(separatorIndex, 1);
                separatorIndex = -1;
                while (node = sizes.pop()) {
                    cell = node.Matrix[node.Row][node.Col];
                    cell.DesiredSize = Math.max(cell.DesiredSize, node.Size);
                    this._AllocateDesiredSize(rowCount, colCount);
                }
                separatorIndex = sizes.push(separator) - 1;
            }
            this._SaveMeasureResults();
            var gridSize = new size();
            for (c = 0; c < colCount; c++) {
                gridSize.Width += cm[c][c].DesiredSize;
            }
            for (r = 0; r < rowCount; r++) {
                gridSize.Height += rm[r][r].DesiredSize;
            }
            return gridSize;
        }
        private _ArrangeOverride(finalSize: size, error: BError): size {
            var cols = this.ColumnDefinitions;
            var rows = this.RowDefinitions;
            this._RestoreMeasureResults();
            var c: number = 0;
            var r: number = 0;
            var totalConsumed = new size();
            var cm = this._ColMatrix;
            for (c = 0; c < cm.length; c++) {
                totalConsumed.Width += cm[c][c].SetOfferedToDesired();
            }
            var rm = this._RowMatrix;
            for (r = 0; r < rm.length; r++) {
                totalConsumed.Height += rm[r][r].SetOfferedToDesired();
            }
            if (totalConsumed.Width !== finalSize.Width)
                this._ExpandStarCols(finalSize);
            if (totalConsumed.Height !== finalSize.Height)
                this._ExpandStarRows(finalSize);
            var i: number = 0;
            var enumerator = cols.GetEnumerator();
            while (enumerator.MoveNext()) {
                (<ColumnDefinition>enumerator.Current).SetValueInternal(ColumnDefinition.ActualWidthProperty, cm[i][i].OfferedSize);
                i++;
            }
            i = 0;
            enumerator = cols.GetEnumerator();
            while (enumerator.MoveNext()) {
                (<RowDefinition>enumerator.Current).SetValueInternal(RowDefinition.ActualHeightProperty, rm[i][i].OfferedSize);
                i++;
            }
            enumerator = this.XamlNode.GetVisualTreeEnumerator();
            var childNode: UINode;
            var child: UIElement;
            while (enumerator.MoveNext()) {
                childNode = <UINode>enumerator.Current;
                child = childNode.XObject;
                var col = Math.min(Grid.GetColumn(child), cm.length - 1);
                var row = Math.min(Grid.GetRow(child), rm.length - 1);
                var colspan = Math.min(Grid.GetColumnSpan(child), cm.length - col);
                var rowspan = Math.min(Grid.GetRowSpan(child), rm.length - row);
                var childFinal = new rect();
                for (c = 0; c < col; c++) {
                    childFinal.X += cm[c][c].OfferedSize;
                }
                for (c = col; c < col + colspan; c++) {
                    childFinal.Width += cm[c][c].OfferedSize;
                }
                for (r = 0; r < row; r++) {
                    childFinal.Y += rm[r][r].OfferedSize;
                }
                for (r = row; r < row + rowspan; r++) {
                    childFinal.Height += rm[r][r].OfferedSize;
                }
                childNode.LayoutUpdater._Arrange(childFinal, error);
            }
            return finalSize;
        }
        private _ExpandStarRows(availableSize: size) {
            availableSize = size.clone(availableSize);
            var rows = this.RowDefinitions;
            var rowsCount = rows ? rows.Count : 0;
            var rm = this._RowMatrix;
            var i: number = 0;
            var cur: ISegment = null;
            for (i = 0; i < rm.length; i++) {
                cur = rm[i][i];
                if (cur.Type === GridUnitType.Star)
                    cur.OfferedSize = 0;
                else
                    availableSize.Height = Math.max(availableSize.Height - cur.OfferedSize, 0);
            }
            availableSize.Height = this._AssignSize(rm, 0, rm.length - 1, availableSize.Height, GridUnitType.Star, false);
            var row: RowDefinition = null;
            i = 0;
            var enumerator = rows.GetEnumerator();
            while (enumerator.MoveNext()) {
                row = enumerator.Current;
                cur = rm[i][i];
                if (cur.Type === GridUnitType.Star)
                    row.SetValueInternal(RowDefinition.ActualHeightProperty, cur.OfferedSize);
                i++;
            }
        }
        private _ExpandStarCols(availableSize: size) {
            availableSize = size.clone(availableSize);
            var cols = this.ColumnDefinitions;
            var columnsCount = cols ? cols.Count : 0;
            var i: number = 0;
            var cur: ISegment = null;
            var cm = this._ColMatrix;
            for (i = 0; i < cm.length; i++) {
                cur = cm[i][i];
                if (cur.Type === GridUnitType.Star)
                    cur.OfferedSize = 0;
                else
                    availableSize.Width = Math.max(availableSize.Width - cur.OfferedSize, 0);
            }
            availableSize.Width = this._AssignSize(cm, 0, cm.length - 1, availableSize.Width, GridUnitType.Star, false);
            var col: ColumnDefinition = null;
            i = 0;
            var enumerator = cols.GetEnumerator();
            while (enumerator.MoveNext()) {
                col = enumerator.Current;
                cur = cm[i][i];
                if (cur.Type === GridUnitType.Star)
                    col.SetValueInternal(ColumnDefinition.ActualWidthProperty, cur.OfferedSize);
                i++;
            }
        }
        private _AllocateDesiredSize(rowCount:number, colCount:number) {
            var matrix: ISegment[][];
            for (var i = 0; i < 2; i++) {
                matrix = i === 0 ? this._RowMatrix : this._ColMatrix;
                var count = i === 0 ? rowCount : colCount;
                for (var row = count - 1; row >= 0; row--) {
                    for (var col = row; col >= 0; col--) {
                        var spansStar = false;
                        for (var j = row; j >= col; j--) {
                            spansStar = spansStar || (matrix[j][j].Type === GridUnitType.Star);
                        }
                        var current = matrix[row][col].DesiredSize;
                        var totalAllocated = 0;
                        for (var a = row; a >= col; a--) {
                            totalAllocated += matrix[a][a].DesiredSize;
                        }
                        if (totalAllocated < current) {
                            var additional = current - totalAllocated;
                            if (spansStar) {
                                additional = this._AssignSize(matrix, col, row, additional, GridUnitType.Star, true);
                            } else {
                                additional = this._AssignSize(matrix, col, row, additional, GridUnitType.Pixel, true);
                                additional = this._AssignSize(matrix, col, row, additional, GridUnitType.Auto, true);
                            }
                        }
                    }
                }
            }
            matrix = this._RowMatrix;
            for (var r = 0; r < matrix.length; r++) {
                matrix[r][r].OfferedSize = matrix[r][r].DesiredSize;
            }
            matrix = this._ColMatrix;
            for (var c = 0; c < matrix.length; c++) {
                matrix[c][c].OfferedSize = matrix[c][c].DesiredSize;
            }
        }
        private _AssignSize(matrix: ISegment[][], start: number, end: number, size: number, unitType: GridUnitType, desiredSize: bool): number {
            var count: number = 0;
            var assigned: bool = false;
            var segmentSize: number = 0;
            var i: number = 0;
            var cur: ISegment = null;
            for (i = start; i <= end; i++) {
                cur = matrix[i][i];
                segmentSize = desiredSize ? cur.DesiredSize : cur.OfferedSize;
                if (segmentSize < cur.Max)
                    count += (unitType === GridUnitType.Star) ? cur.Stars : 1;
            }
            do {
                assigned = false;
                var contribution = size / count;
                for (i = start; i <= end; i++) {
                    cur = matrix[i][i];
                    segmentSize = desiredSize ? cur.DesiredSize : cur.OfferedSize;
                    if (!(cur.Type === unitType && segmentSize < cur.Max))
                        continue;
                    var newSize = segmentSize;
                    newSize += contribution * (unitType === GridUnitType.Star ? cur.Stars : 1);
                    newSize = Math.min(newSize, cur.Max);
                    assigned = assigned || (newSize > segmentSize);
                    size -= newSize - segmentSize;
                    if (desiredSize)
                        cur.DesiredSize = newSize;
                    else
                        cur.OfferedSize = newSize;
                }
            } while (assigned);
            return size;
        }
        private _RowMatrix: ISegment[][];
        private _ColMatrix: ISegment[][];
        private _CreateMatrices(rowCount: number, colCount: number) {
            var rm = this._RowMatrix = [];
            for (var r = 0; r < rowCount; r++) {
                rm.push([]);
                for (var rr = 0; rr <= r; rr++) {
                    rm[r].push(createSegment());
                }
            }
            var cm = this._ColMatrix = [];
            for (var c = 0; c < colCount; c++) {
                cm.push([]);
                for (var cc = 0; cc <= c; cc++) {
                    cm[c].push(createSegment());
                }
            }
        }
        private _SaveMeasureResults() {
            var i: number;
            var j: number;
            var rm = this._RowMatrix;
            for (i = 0; i < rm.length; i++) {
                for (j = 0; j <= i; j++) {
                    rm[i][j].OriginalSize = rm[i][j].OfferedSize;
                }
            }
            var cm = this._ColMatrix;
            for (i = 0; i < cm.length; i++) {
                for (j = 0; j <= i; j++) {
                    cm[i][j].OriginalSize = cm[i][j].OfferedSize;
                }
            }
        }
        private _RestoreMeasureResults() {
            var i: number;
            var j: number;
            var rm = this._RowMatrix;
            for (i = 0; i < rm.length; i++) {
                for (j = 0; j <= i; j++) {
                    rm[i][j].OfferedSize = rm[i][j].OriginalSize;
                }
            }
            var cm = this._ColMatrix;
            for (i = 0; i < cm.length; i++) {
                for (j = 0; j <= i; j++) {
                    cm[i][j].OfferedSize = cm[i][j].OriginalSize;
                }
            }
        }
        private _ShowGridLinesChanged(args: IDependencyPropertyChangedEventArgs) {
            var lu = this.XamlNode.LayoutUpdater;
            lu.Invalidate();
            lu.InvalidateMeasure();
        }
        private RowDefinitionsChanged(rowDefinitions: RowDefinitionCollection) {
            this.XamlNode.LayoutUpdater.InvalidateMeasure();
        }
        private ColumnDefinitionsChanged(colDefinitions: ColumnDefinitionCollection) {
            this.XamlNode.LayoutUpdater.InvalidateMeasure();
        }
    }
    Nullstone.RegisterType(Grid, "Grid");
}

module Fayde.Controls {
    export class Page extends UserControl {
        static TitleProperty: DependencyProperty = DependencyProperty.Register("Title", () => String, Page);
        Title: string;
    }
    Nullstone.RegisterType(Page, "Page");
}

module Fayde.Controls {
    export class ScrollViewer extends ContentControl {
        HorizontalScrollBarVisibility: ScrollBarVisibility;
        VerticalScrollBarVisibility: ScrollBarVisibility;
        private _ScrollInfo: Primitives.IScrollInfo;
        get ScrollInfo(): Primitives.IScrollInfo { return this._ScrollInfo; }
        set ScrollInfo(value: Primitives.IScrollInfo) {
            this._ScrollInfo = value;
            if (value) {
                value.CanHorizontallyScroll = this.HorizontalScrollBarVisibility !== ScrollBarVisibility.Disabled;
                value.CanVerticallyScroll = this.VerticalScrollBarVisibility !== ScrollBarVisibility.Disabled;
            }
        }
        InvalidateScrollInfo() {
        }
    }
    Nullstone.RegisterType(ScrollViewer, "ScrollViewer");
}

module Fayde.Controls {
    export class TextBox extends TextBoxBase {
        HorizontalScrollBarVisibility: ScrollBarVisibility;
        TextWrapping: TextWrapping;
    }
    Nullstone.RegisterType(TextBox, "TextBox");
}

module Fayde.Controls.Primitives {
    export class ButtonBase extends ContentControl {
        static ClickModeProperty: DependencyProperty = DependencyProperty.Register("ClickMode", () => new Enum(ClickMode), ButtonBase, ClickMode.Release);
        static IsPressedProperty: DependencyProperty = DependencyProperty.RegisterReadOnly("IsPressed", () => Boolean, ButtonBase, false, (d, args) => (<ButtonBase>d).OnIsPressedChanged(args));
        static IsFocusedProperty: DependencyProperty = DependencyProperty.RegisterReadOnly("IsFocused", () => Boolean, ButtonBase, false);
        static CommandProperty: DependencyProperty = DependencyProperty.RegisterCore("Command", () => Input.ICommand_, ButtonBase, undefined, (d, args) => (<ButtonBase>d).OnCommandChanged(args));
        static CommandParameterProperty: DependencyProperty = DependencyProperty.RegisterCore("CommandParameter", () => Object, ButtonBase, undefined, (d, args) => (<ButtonBase>d).OnCommandParameterChanged(args));
        ClickMode: ClickMode;
        IsPressed: bool;
        IsFocused: bool;
        Command: Input.ICommand;
        CommandParameter: any;
        Click: RoutedEvent = new RoutedEvent();
        private _IsMouseCaptured: bool = false;
        private _IsMouseLeftButtonDown: bool = false;
        private _IsSpaceKeyDown: bool = false;
        private _MousePosition: Point = new Point();
        private _SuspendStateChanges: bool = false;
        constructor() {
            super();
            this.IsTabStop = true;
        }
        OnIsPressedChanged(args: IDependencyPropertyChangedEventArgs) {
            this.UpdateVisualState();
        }
        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs) {
            var isEnabled = e.NewValue;
            this._SuspendStateChanges = true;
            try {
                if (!isEnabled) {
                    this.SetValueInternal(ButtonBase.IsFocusedProperty, false);
                    this.SetValueInternal(ButtonBase.IsPressedProperty, false);
                    this._IsMouseCaptured = false;
                    this._IsSpaceKeyDown = false;
                    this._IsMouseLeftButtonDown = false;
                }
            } finally {
                this._SuspendStateChanges = false;
                this.UpdateVisualState();
            }
        }
        OnMouseEnter(e: Input.MouseEventArgs) {
            super.OnMouseEnter(e);
            this._SuspendStateChanges = true;
            try {
                if (this.ClickMode === ClickMode.Hover && this.IsEnabled) {
                    this.SetValueInternal(ButtonBase.IsPressedProperty, true);
                    this.OnClick();
                }
            } finally {
                this._SuspendStateChanges = false;
                this.UpdateVisualState();
            }
        }
        OnMouseLeave(e: Input.MouseEventArgs) {
            super.OnMouseLeave(e);
            this._SuspendStateChanges = true;
            try {
                if (this.ClickMode === ClickMode.Hover && this.IsEnabled)
                    this.SetValueInternal(ButtonBase.IsPressedProperty, false);
            } finally {
                this._SuspendStateChanges = false;
                this.UpdateVisualState();
            }
        }
        OnMouseMove(e: Input.MouseEventArgs) {
            super.OnMouseMove(e);
            this._MousePosition = e.GetPosition(this);
            if (this._IsMouseLeftButtonDown && this.IsEnabled && this.ClickMode !== ClickMode.Hover && this._IsMouseCaptured && !this._IsSpaceKeyDown) {
                this.SetValueInternal(ButtonBase.IsPressedProperty, this._IsValidMousePosition());
            }
        }
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonDown(e);
            this._IsMouseLeftButtonDown = true;
            if (!this.IsEnabled)
                return;
            var clickMode = this.ClickMode;
            if (clickMode === ClickMode.Hover)
                return;
            e.Handled = true;
            this._SuspendStateChanges = true;
            try {
                this.Focus();
                this._CaptureMouseInternal();
                if (this._IsMouseCaptured)
                    this.SetValueInternal(ButtonBase.IsPressedProperty, true);
            } finally {
                this._SuspendStateChanges = false;
                this.UpdateVisualState();
            }
            if (clickMode === ClickMode.Press)
                this.OnClick();
        }
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonDown(e);
            this._IsMouseLeftButtonDown = false;
            if (!this.IsEnabled)
                return;
            var clickMode = this.ClickMode;
            if (clickMode === ClickMode.Hover)
                return;
            e.Handled = true;
            if (!this._IsSpaceKeyDown && this.IsPressed && clickMode === ClickMode.Release)
                this.OnClick();
            if (!this._IsSpaceKeyDown) {
                this._ReleaseMouseCaptureInternal();
                this.SetValueInternal(ButtonBase.IsPressedProperty, false);
            }
        }
        OnGotFocus(e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.SetValueInternal(ButtonBase.IsFocusedProperty, true);
            this.UpdateVisualState();
        }
        OnLostFocus(e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.SetValueInternal(ButtonBase.IsFocusedProperty, false);
            this._SuspendStateChanges = true;
            try {
                if (this.ClickMode !== ClickMode.Hover) {
                    this.SetValueInternal(ButtonBase.IsPressedProperty, false);
                    this._ReleaseMouseCaptureInternal();
                    this._IsSpaceKeyDown = false;
                }
            } finally {
                this._SuspendStateChanges = false;
                this.UpdateVisualState();
            }
        }
        OnClick() {
            var cmd = this.Command;
            var par = this.CommandParameter;
            if (cmd != null && cmd.CanExecute(par))
                cmd.Execute(par);
            this.Click.Raise(this, new RoutedEventArgs());
        }
        UpdateVisualState(useTransitions?: bool) {
            if (this._SuspendStateChanges)
                return;
            super.UpdateVisualState(useTransitions);
        }
        GetVisualStateCommon(): string {
            if (!this.IsEnabled) {
                return "Disabled";
            } else if (this.IsPressed) {
                return "Pressed";
            } else if (this.IsMouseOver) {
                return "MouseOver";
            } else {
                return "Normal";
            }
        }
        private _CaptureMouseInternal() {
            if (!this._IsMouseCaptured)
                this._IsMouseCaptured = this.CaptureMouse();
        }
        private _ReleaseMouseCaptureInternal() {
            this.ReleaseMouseCapture();
            this._IsMouseCaptured = false;
        }
        private _IsValidMousePosition(): bool {
            var pos = this._MousePosition;
            return pos.X >= 0.0 && pos.X <= this.ActualWidth
                && pos.Y >= 0.0 && pos.Y <= this.ActualHeight;
        }
        private OnCommandChanged(args: IDependencyPropertyChangedEventArgs) {
            var cmd: Input.ICommand;
            if (Nullstone.ImplementsInterface(args.OldValue, Input.ICommand_)) {
                cmd = args.OldValue;
                cmd.CanExecuteChanged.Unsubscribe(this.OnCommandCanExecuteChanged, this);
            }
            if (Nullstone.ImplementsInterface(args.NewValue, Input.ICommand_)) {
                cmd = args.NewValue;
                cmd.CanExecuteChanged.Subscribe(this.OnCommandCanExecuteChanged, this);
                this.IsEnabled = cmd.CanExecute(this.CommandParameter);
            }
        }
        private OnCommandCanExecuteChanged(sender, e) {
            this.IsEnabled = this.Command.CanExecute(this.CommandParameter);
        }
        private OnCommandParameterChanged(args: IDependencyPropertyChangedEventArgs) {
            var cmd = this.Command;
            if (cmd)
                this.IsEnabled = cmd.CanExecute(args.NewValue);
        }
    }
    Nullstone.RegisterType(ButtonBase, "ButtonBase");
}

module Fayde.Controls.Primitives {
    export class RepeatButton extends ButtonBase {
        static DelayProperty: DependencyProperty = DependencyProperty.Register("Delay", () => Number, RepeatButton, 500, (d, args) => (<RepeatButton>d).OnDelayChanged(args));
        static IntervalProperty: DependencyProperty = DependencyProperty.Register("Interval", () => Number, RepeatButton, 33, (d, args) => (<RepeatButton>d).OnIntervalChanged(args));
        Delay: number;
        Interval: number;
        private _KeyboardCausingRepeat: bool = false;
        private _MouseCausingRepeat: bool = false;
        private _MousePosition: Point = null;
        private _IntervalID: number = null;
        private _NewInterval: number = null;
        private _ElementRoot: FrameworkElement = null;
        constructor() {
            super();
            this.ClickMode = ClickMode.Press;
            this.DefaultStyleKey = (<any>this).constructor;
        }
        OnApplyTemplate() {
            super.OnApplyTemplate();
            var er = this.GetTemplateChild("Root");
            if (er instanceof FrameworkElement)
                this._ElementRoot = <FrameworkElement>er;
            this.UpdateVisualState(false);
        }
        OnDelayChanged(args: IDependencyPropertyChangedEventArgs) {
            if (args.NewValue < 0)
                throw new ArgumentException("Delay Property cannot be negative.");
        }
        OnIntervalChanged(args: IDependencyPropertyChangedEventArgs) {
            if (args.NewValue < 0)
                throw new ArgumentException("Interval Property cannot be negative.");
            this._NewInterval = args.NewValue;
        }
        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs) {
            super.OnIsEnabledChanged(e);
            this._KeyboardCausingRepeat = false;
            this._MouseCausingRepeat = false;
            this._UpdateRepeatState();
        }
        OnKeyDown(e: Input.KeyEventArgs) {
            if (e.Key === Input.Key.Space && this.ClickMode !== ClickMode.Hover) {
                this._KeyboardCausingRepeat = true;
                this._UpdateRepeatState();
            }
            super.OnKeyDown(e);
        }
        OnKeyUp(e: Input.KeyEventArgs) {
            super.OnKeyUp(e);
            if (e.Key === Input.Key.Space && this.ClickMode !== ClickMode.Hover) {
                this._KeyboardCausingRepeat = false;
                this._UpdateRepeatState();
            }
            this.UpdateVisualState();
        }
        OnLostFocus(e: RoutedEventArgs) {
            super.OnLostFocus(e);
            if (this.ClickMode !== ClickMode.Hover) {
                this._KeyboardCausingRepeat = false;
                this._MouseCausingRepeat = false;
                this._UpdateRepeatState();
            }
        }
        OnMouseEnter(e: Input.MouseEventArgs) {
            super.OnMouseEnter(e);
            if (this.ClickMode === ClickMode.Hover) {
                this._MouseCausingRepeat = true;
                this._UpdateRepeatState();
            }
            this.UpdateVisualState();
            this._UpdateMousePosition(e);
        }
        OnMouseLeave(e: Input.MouseEventArgs) {
            super.OnMouseLeave(e);
            if (this.ClickMode === ClickMode.Hover) {
                this._MouseCausingRepeat = false;
                this._UpdateRepeatState();
            }
            this.UpdateVisualState();
        }
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) {
            if (e.Handled)
                return;
            super.OnMouseLeftButtonDown(e);
            if (this.ClickMode !== ClickMode.Hover) {
                this._MouseCausingRepeat = true;
                this._UpdateRepeatState();
            }
        }
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs) {
            if (e.Handled)
                return;
            super.OnMouseLeftButtonUp(e);
            if (this.ClickMode !== ClickMode.Hover) {
                this._MouseCausingRepeat = false;
                this._UpdateRepeatState();
            }
            this.UpdateVisualState();
        }
        OnMouseMove(e: Input.MouseEventArgs) {
            this._UpdateMousePosition(e);
        }
        private _UpdateMousePosition(e: Input.MouseEventArgs) {
            var curNode: XamlNode = this.XamlNode;
            var parentNode: FENode = <FENode>curNode;
            while (curNode instanceof FENode) {
                parentNode = <FENode>curNode;
                curNode = curNode.ParentNode;
            }
            this._MousePosition = e.GetPosition(parentNode.XObject);
        }
        private _UpdateRepeatState() {
            if (this._MouseCausingRepeat || this._KeyboardCausingRepeat) {
                if (this._IntervalID == null)
                    this._IntervalID = window.setInterval(() => this._OnTimeout(), this.Interval);
            } else {
                if (this._IntervalID != null)
                    window.clearInterval(this._IntervalID);
                this._IntervalID = null;
            }
        }
        private _OnTimeout() {
            if (this._NewInterval != null) {
                window.clearInterval(this._IntervalID);
                this._IntervalID = window.setInterval(() => this._OnTimeout(), this._NewInterval);
                this._NewInterval = null;
            }
            if (!this.IsPressed)
                return;
            if (this._KeyboardCausingRepeat) {
                this.OnClick();
                return;
            }
            var er = this._ElementRoot;
            var els = VisualTreeHelper.FindElementsInHostCoordinates(this._MousePosition, this);
            for (var i = 0; i < els.length; i++) {
                if (els[i] === er)
                    this.OnClick();
            }
        }
    }
    Nullstone.RegisterType(RepeatButton, "RepeatButton");
}

module Fayde.Controls.Primitives {
    export class ToggleButton extends ButtonBase {
        Checked: RoutedEvent = new RoutedEvent();
        Indeterminate: RoutedEvent = new RoutedEvent();
        Unchecked: RoutedEvent = new RoutedEvent();
        static IsCheckedProperty: DependencyProperty = DependencyProperty.RegisterCore("IsChecked", () => Boolean, ToggleButton, false, (d, args) => (<ToggleButton>d).OnIsCheckedChanged(args));
        static IsThreeStateProperty: DependencyProperty = DependencyProperty.RegisterCore("IsThreeState", () => Boolean, ToggleButton, false);
        IsChecked: bool;
        IsThreeState: bool;
        constructor() {
            super();
            this.DefaultStyleKey = (<any>this).constructor;
        }
        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.UpdateVisualState(false);
        }
        OnContentChanged(oldContent: any, newContent: any) {
            super.OnContentChanged(oldContent, newContent);
            this.UpdateVisualState();
        }
        OnClick() {
            this.OnToggle();
            super.OnClick();
        }
        UpdateVisualState(useTransitions?: bool) {
            useTransitions = useTransitions !== false;
            super.UpdateVisualState(useTransitions);
            var isChecked = this.IsChecked;
            var vsm = Fayde.Media.VSM.VisualStateManager;
            if (isChecked === true) {
                vsm.GoToState(this, "Checked", useTransitions);
            } else if (isChecked === false) {
                vsm.GoToState(this, "Unchecked", useTransitions);
            } else {
                if (!vsm.GoToState(this, "Indeterminate", useTransitions)) {
                    vsm.GoToState(this, "Unchecked", useTransitions)
                }
            }
        }
        OnIsCheckedChanged(args: IDependencyPropertyChangedEventArgs) {
            var isChecked = args.NewValue;
            this.UpdateVisualState();
            if (isChecked === true) {
                this.Checked.Raise(this, new RoutedEventArgs());
            } else if (isChecked === false) {
                this.Unchecked.Raise(this, new RoutedEventArgs());
            } else {
                this.Indeterminate.Raise(this, new RoutedEventArgs());
            }
        }
        OnToggle() {
            var isChecked = this.IsChecked;
            if (isChecked === true) {
                this.IsChecked = this.IsThreeState ? null : false;
            } else {
                this.IsChecked = isChecked != null;
            }
        }
    }
    Nullstone.RegisterType(ToggleButton, "ToggleButton");
}

module Fayde.Controls {
    export class Button extends Primitives.ButtonBase {
        constructor() {
            super();
            this.DefaultStyleKey = (<any>this).constructor;
        }
        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.UpdateVisualState(false);
        }
        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs) {
            super.OnIsEnabledChanged(e);
            this.IsTabStop = e.NewValue;
        }
    }
    Nullstone.RegisterType(Button, "Button");
}

module Fayde.Controls {
    export class HyperlinkButton extends Primitives.ButtonBase {
        static NavigateUriProperty: DependencyProperty = DependencyProperty.Register("NavigateUri", () => Uri, HyperlinkButton);
        static TargetNameProperty: DependencyProperty = DependencyProperty.Register("TargetName", () => String, HyperlinkButton);
        NavigateUri: Uri;
        TargetName: string;
        constructor() {
            super();
            this.DefaultStyleKey = (<any>this).constructor;
        }
        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.UpdateVisualState(false);
        }
        OnClick() {
            super.OnClick();
            if (this.NavigateUri != null)
                this._Navigate();
        }
        /*
        private _GetAbsoluteUri(): Uri {
            var destination = this.NavigateUri;
            if (!destination.IsAbsoluteUri) {
                var original = destination.OriginalString;
                if (original && original.charAt(0) !== '/')
                    throw new NotSupportedException();
                destination = new Uri(App.Instance.GetHost().GetSource(), destination);
            }
            return destination;
        }
        */
        private _Navigate() {
            var targetName = this.TargetName;
            if (!targetName) {
                window.location.href = this.NavigateUri.toString();
                return;
            }
            var targetUie: XamlObject = this.FindName(targetName);
            if (targetUie instanceof Frame) {
                window.location.href = this.NavigateUri.toString();
            } else {
                window.open(this.NavigateUri.toString(), targetName);
            }
        }
    }
    Nullstone.RegisterType(HyperlinkButton, "HyperlinkButton");
}

