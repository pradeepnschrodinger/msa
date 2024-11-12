
const mouse = require("mouse-pos");
const jbone = require("jbone");

import { get, noop } from "lodash";

class ScrollBody {
  constructor(g, backboneView, onScrollCallback) {
    this.g = g;
    this.backboneView = backboneView;
    this.onScrollCallback = () => ((onScrollCallback || noop).call(this.backboneView, arguments));

    this.dragStart = [];
    this.dragStartScroll = [];

    this._fixCurrentScroll();
  }

  getScrollEvents() {
    const events = {};

    // add scroll support
    events.mousewheel = this._onScroll;
    events.DOMMouseScroll = this._onScroll;
    events.wheel = this._onScroll;

    // call the callback function for scrolls whenever scroll offsets change
    this.backboneView.listenTo(this.g.zoomer, "change:_alignmentScrollLeft change:_alignmentScrollTop", this.onScrollCallback);

    return events;
  }

  /**
   * @param {*} e 
   * @returns 
   */
  _onScroll = (e) => {
    const delta = mouse.wheelDelta(e);
    const scrollCorrected = this._checkScrolling([
      this.g.zoomer.get('_alignmentScrollLeft') + delta[0],
      this.g.zoomer.get('_alignmentScrollTop') + delta[1]
    ]);
    this.g.zoomer.set('_alignmentScrollLeft', scrollCorrected[0]);
    this.g.zoomer.set('_alignmentScrollTop', scrollCorrected[1]);
    e.preventDefault();
    e.stopPropagation();
  }

  // checks whether the scrolling coordinates are valid
  // @returns: [xScroll,yScroll] valid coordinates
  _checkScrolling = (scrollObj) => {

    // These calculations are taken from src/views/canvas/CanvasCoordsCache.js:
    const maxScrollHeight = this.g.zoomer.getMaxAlignmentHeight() - this.g.zoomer.get('alignmentHeight');
    const maxScrollWidth = this.g.zoomer.getMaxAlignmentWidth() - this.g.zoomer.getAlignmentWidth();

    // 0: maxLeft, 1: maxTop
    const max = [maxScrollWidth, maxScrollHeight];

    for (let i = 0; i <= 1; i++) {
      if (scrollObj[i] > max[i]) {
        scrollObj[i] = max[i];
      }

      if (scrollObj[i] < 0) {
        scrollObj[i] = 0;
      }
    }

    return scrollObj;
  }

  // Helper to fix the scrolling position
  _fixCurrentScroll = () => {
    const oldScrollLeft = this.g.zoomer.get('_alignmentScrollLeft');
    const oldScrollTop = this.g.zoomer.get('_alignmentScrollTop');
    const scrollCorrected = this._checkScrolling([
      oldScrollLeft,
      oldScrollTop
    ]);

    // only update if scroll values have changed
    if (oldScrollLeft !== scrollCorrected[0]) {
      this.g.zoomer.set('_alignmentScrollLeft', scrollCorrected[0]);
    }
    if (oldScrollTop !== scrollCorrected[1]) {
      this.g.zoomer.set('_alignmentScrollTop', scrollCorrected[1]);
    }
  }
}

export default ScrollBody
