
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

    // add touch/drag scroll support
    events.mousedown = this._onmousedown;
    events.touchstart = this._ontouchstart;

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
  
  // converts touches into old mouse event
  _ontouchmove = (e) => {
    this._onmousedrag(e.changedTouches[0], true);
    e.preventDefault();
    e.stopPropagation();
  }

  // start the dragging mode
  _onmousedown = (e) => {
    this.dragStart = mouse.abs(e.originalEvent);
    this.dragStartScroll = [this.g.zoomer.get('_alignmentScrollLeft'), this.g.zoomer.get('_alignmentScrollTop')];
    jbone(document.body).on('mousemove.overmove', (e) => this._onmousedrag(e));
    jbone(window).on('mouseup.overup', () => this._cleanup());
    //jbone(document.body).on 'mouseout.overout', (e) => @_onmousewinout(e)
    return e.preventDefault();
  }

  // starts the touch mode
  _ontouchstart = (e) => {
    this.dragStart = mouse.abs(e.originalEvent.changedTouches[0]);
    this.dragStartScroll = [this.g.zoomer.get('_alignmentScrollLeft'), this.g.zoomer.get('_alignmentScrollTop')];
    jbone(document.body).on('touchmove.overtmove', (e) => this._ontouchmove(e));
      return jbone(document.body).on( 'touchend.overtend touchleave.overtleave touchcancel.overtcanel', (e) => this._touchCleanup(e)
    );
  }

  // terminates touching
  _touchCleanup = (e) => {
    if (e.changedTouches.length > 0) {
      // maybe we can send a final event
      this._onmousedrag(e.changedTouches[0], true);
    }

    this.dragStart = [];
    // remove all listeners
    jbone(document.body).off('.overtmove');
    jbone(document.body).off('.overtend');
    jbone(document.body).off('.overtleave');
    return jbone(document.body).off('.overtcancel');
  }

  _onmousedrag = (e, reversed) => {
    if (this.dragStart.length === 0) { return; }

    const dragEnd = mouse.abs(e.originalEvent);
    // relative to first click
    const relEnd = [dragEnd[0] - this.dragStart[0], dragEnd[1] - this.dragStart[1]];
    // relative to initial scroll status

    // scale events
    let scaleFactor = this.g.zoomer.get("canvasEventScale");
    if (reversed) {
      scaleFactor = 3;
    }
    for (let i = 0; i <= 1; i++) {
      relEnd[i] = relEnd[i] * scaleFactor;
    }

    // calculate new scrolling vals
    const relDist = [this.dragStartScroll[0] - relEnd[0], this.dragStartScroll[1] - relEnd[1]];

    // round values
    for (let i = 0; i <= 1; i++) {
      relDist[i] = Math.round(relDist[i]);
    }

    // update scrollbar
    const scrollCorrected = this._checkScrolling( relDist);
    this.g.zoomer.set("_alignmentScrollLeft", scrollCorrected[0]);
    this.g.zoomer.set("_alignmentScrollTop", scrollCorrected[1]);

    // reset start if use scrolls out of bounds
    for (let i = 0; i <= 1; i++) {
      if (scrollCorrected[i] !== relDist[i]) {
        if (scrollCorrected[i] === 0) {
          // reset of left, top
          this.dragStart[i] = dragEnd[i];
          this.dragStartScroll[i] = 0;
        } else {
          // recalibrate on right, bottom
          this.dragStart[i] = dragEnd[i] - scrollCorrected[i];
        }
      }
    }

    this.onScrollCallback();

    // abort selection events of the browser (mouse only)
    if ((e.preventDefault != null)) {
      e.preventDefault();
      return e.stopPropagation();
    }
  }

  // terminates dragging
  _cleanup = () => {
    this.dragStart = [];
    // remove all listeners
    jbone(document.body).off('.overmove');
    jbone(document.body).off('.overup');
    return jbone(document.body).off('.overout');
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
