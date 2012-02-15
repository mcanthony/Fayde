﻿/// CODE
/// <reference path="../Runtime/LinkedList.js"/>
/// <reference path="Enums.js"/>
/// <reference path="UIElementNode.js"/>

//#region _DeepTreeWalker

function _DeepTreeWalker(top, direction) {
    /// <param name="top" type="UIElement"></param>
    /// <param name="direction" type="Number">_VisualTreeWalkerDirection</param>
    RefObject.call(this);

    if (!top)
        return;

    this._WalkList = new LinkedList();
    this._WalkList.Append(new UIElementNode(top));
    this._Last = null;
    this._Direction = _VisualTreeWalkerDirection.Logical;
    if (direction)
        this._Direction = direction;
}
_DeepTreeWalker.InheritFrom(RefObject);

_DeepTreeWalker.prototype.Step = function () {
    if (this._Last) {
        var walker = new _VisualTreeWalker(this._Last, this._Direction);
        var prepend = this._WalkList.First();
        var child;
        while (child = walker.Step()) {
            this._WalkList.InsertBefore(new UIElementNode(child), prepend);
        }
    }

    var next = this._WalkList.First();
    if (!next) {
        this._Last = null;
        return null;
    }

    var current = next.UIElement;
    this._WalkList.Remove(next);
    this._Last = current;

    return current;
};
_DeepTreeWalker.prototype.SkipBranch = function () {
    this._Last = null;
};

//#endregion