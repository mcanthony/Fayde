﻿/// <reference path="UIElementMetrics.js"/>

var Fayde;
(function (Fayde) {
    FrameworkElementMetrics.prototype = new Fayde.UIElementMetrics();
    FrameworkElementMetrics.prototype.constructor = FrameworkElementMetrics;
    function FrameworkElementMetrics() {
        Fayde.UIElementMetrics.call(this);
        this.ExtentsWithChildren = new rect();
        this.BoundsWithChildren = new rect();
        this.GlobalWithChildren = new rect();
        this.SurfaceWithChildren = new rect();
        this.LayoutClipBounds = new rect();

        this.SubtreeExtents = this.ExtentsWithChildren;
        this.SubtreeBounds = this.SurfaceWithChildren;
        this.GlobalBounds = this.GlobalWithChildren;
    }
    FrameworkElementMetrics.prototype.ComputeBounds = function (fe) {
        var size = new Size(fe.ActualWidth, fe.ActualHeight);
        size = fe._ApplySizeConstraints(size);

        rect.set(this.Extents, 0, 0, size.Width, size.Height);
        rect.copyTo(this.Extents, this.ExtentsWithChildren);

        var walker = new Fayde._VisualTreeWalker(fe);
        var item;
        while (item = walker.Step()) {
            if (item._GetRenderVisible())
                rect.union(this.ExtentsWithChildren, item._GetGlobalBounds());
        }

        this._IntersectBoundsWithClipPath(this.Bounds, fe, fe._AbsoluteXform);
        rect.copyGrowTransform(this.BoundsWithChildren, this.ExtentsWithChildren, this.EffectPadding, fe._AbsoluteXform);

        this.ComputeGlobalBounds(fe);
        this.ComputeSurfaceBounds(fe);
    };
    FrameworkElementMetrics.prototype.ComputeSurfaceBounds = function (fe) {
        this._IntersectBoundsWithClipPath(this.Surface, fe, fe._AbsoluteXform);
        rect.copyGrowTransform4(this.SurfaceWithChildren, this.ExtentsWithChildren, this.EffectPadding, fe._AbsoluteProjection);
    };
    FrameworkElementMetrics.prototype.ComputeGlobalBounds = function (fe) {
        this._IntersectBoundsWithClipPath(this.Global, fe, fe._LocalXform);
        rect.copyGrowTransform4(this.GlobalWithChildren, this.ExtentsWithChildren, this.EffectPadding, fe._LocalProjection);
    };
    FrameworkElementMetrics.prototype._IntersectBoundsWithClipPath = function (dest, fe, xform) {
        var isClipEmpty = rect.isEmpty(this.ClipBounds);
        var isLayoutClipEmpty = rect.isEmpty(this.LayoutClipBounds);

        if ((!isClipEmpty || !isLayoutClipEmpty) && !fe._GetRenderVisible()) {
            rect.clear(dest);
            return;
        }

        rect.copyGrowTransform(dest, this.Extents, this.EffectPadding, xform);

        if (!isClipEmpty)
            rect.intersection(dest, this.ClipBounds);
        if (!isLayoutClipEmpty)
            rect.intersection(dest, this.LayoutClipBounds);
    };
    FrameworkElementMetrics.prototype.UpdateLayoutClipBounds = function (layoutClip) {
        if (!layoutClip) {
            rect.clear(this.LayoutClipBounds);
            return;
        }
        rect.copyTo(layoutClip.GetBounds(), this.LayoutClipBounds);
    };
    Fayde.FrameworkElementMetrics = FrameworkElementMetrics;
})(Fayde || (Fayde = {}));