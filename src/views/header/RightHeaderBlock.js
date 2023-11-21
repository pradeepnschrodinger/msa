const boneView = require("backbone-childs");
const mouse = require("mouse-pos");
const jbone = require("jbone");

import MarkerView from "./MarkerView";
import ConservationView from "./ConservationView";
import SeqLogoWrapper from "./SeqLogoWrapper";
import GapView from "./GapView";
import PinnedBlock from "../canvas/CanvasPinnedBlock";
import { get } from "lodash";

const View = boneView.extend({

  initialize: function(data) {
    this.g = data.g;
    this.blockEvents = false;

    this.listenTo(this.g.vis,"change:header", function() {
      this.draw();
      return this.render();
    });
    this.listenTo(this.g.vis,"change", this._setSpacer);
    this.listenTo(this.g.zoomer,"change:alignmentWidth", this._setWidth);
    this.listenTo(this.g.zoomer, "change:_alignmentScrollLeft", function (model, value, options) {
      // no need to render if the event was triggered by this view
      if (get(options, 'origin') === "rightheaderblock") {
        console.log("skip", options)
        return
      }
      console.log("render", model, value, options)
      this._adjustScrollingLeft();
    });

    // TODO: duplicate rendering
    this.listenTo(this.g.columns, "change:hidden", function() {
      this.draw();
      return this.render();
    });

    this.manageEvents();

    // collection view for all the headers
    this.addView("headers", new (boneView.extend({
      className: 'biojs_msa_rheaders',
      events: { 
        "scroll": () => this._sendScrollEvent(),
      },
    })));

    const pinnedBlock = new PinnedBlock({
      model: this.g.pinnedFeatures,
      g: this.g,
    });
    // NOTE (pradeep): Hacky! Required for pinning the block
    pinnedBlock.el.style.position = 'absolute';
    pinnedBlock.el.style.bottom = 0;

    this.addView("pinnedSeqBlock", pinnedBlock);

    this.draw();

    return this.g.vis.once('change:loaded', this._adjustScrollingLeft, this);
  },

  manageEvents: function() {
    const events = {};

    // add scroll support
    events.mousewheel = "_onScroll";
    events.DOMMouseScroll = "_onScroll";
    events.wheel = "_onScroll";

    // add touch/drag scroll support
    events.mousedown = "_onmousedown";
    events.touchstart = "_ontouchstart";
    
    this.delegateEvents(events);
  },

  draw: function() {
    const headerView = this.getView('headers');
    headerView.removeViews();

    if (this.g.vis.get("conserv")) {
      var conserv = new ConservationView({model: this.model, g: this.g});
      conserv.ordering = -20;
      headerView.addView("conserv",conserv);
    }

    if (this.g.vis.get("markers")) {
      var marker = new MarkerView({model: this.model, g: this.g});
      marker.ordering = -10;
      headerView.addView("marker",marker);
    }

    if (this.g.vis.get("seqlogo")) {
      var seqlogo = new SeqLogoWrapper({model: this.model, g: this.g});
      seqlogo.ordering = -30;
      headerView.addView("seqlogo",seqlogo);
    }

    if (this.g.vis.get("gapHeader")) {
      var gapview = new GapView({model: this.model, g: this.g});
      gapview.ordering = -25;
      return headerView.addView("gapview",gapview);
    }
  },

  render: function() {
    this.renderSubviews();
    this.getView('headers').renderSubviews();

    this._setSpacer();

    this.el.className = "biojs_msa_rheader";
    //@el.style.height = @g.zoomer.get("markerHeight") + "px"
    this._setWidth();
    this._adjustScrollingLeft();
    return this;
  },

  // scrollLeft triggers a reflow of the whole area (even only get)
  _sendScrollEvent: function() {
    if (!this.blockEvents) {
      this.g.zoomer.set("_alignmentScrollLeft", this.getView('headers').el.scrollLeft, {origin: "header"});
    }
    return this.blockEvents = false;
  },

  _adjustScrollingLeft: function(model,value,options) {
    if ((!(((typeof options !== "undefined" && options !== null) ? options.origin : undefined) != null)) || options.origin !== "header") {
      var scrollLeft = this.g.zoomer.get("_alignmentScrollLeft");
      this.blockEvents = true;
      this.getView('headers').el.scrollLeft = scrollLeft;
    }
  },

  _setSpacer: function() {
    // spacer / padding element
    return this.el.style.marginLeft = this._getLabelWidth() + "px";
  },

  _getLabelWidth: function() {
    var paddingLeft = 0;
    if (!this.g.vis.get("leftHeader")) {
      paddingLeft += this.g.zoomer.getLeftBlockWidth();
    }
    return paddingLeft;
  },

  /**
   * @param {*} e 
   * @returns 
   */
  _onScroll: function(e) {
    const delta = mouse.wheelDelta(e);
    this.g.zoomer.set('_alignmentScrollLeft', this.g.zoomer.get('_alignmentScrollLeft') + delta[0]);
    this.g.zoomer.set('_alignmentScrollTop', this.g.zoomer.get('_alignmentScrollTop') + delta[1]);
    e.preventDefault();
  },
  
  // converts touches into old mouse event
  _ontouchmove: function(e) {
    this._onmousedrag(e.changedTouches[0], true);
    e.preventDefault();
    e.stopPropagation();
  },

  // start the dragging mode
  _onmousedown: function(e) {
    this.dragStart = mouse.abs(e);
    this.dragStartScroll = [this.g.zoomer.get('_alignmentScrollLeft'), this.g.zoomer.get('_alignmentScrollTop')];
    jbone(document.body).on('mousemove.overmove', (e) => this._onmousedrag(e));
    jbone(document.body).on('mouseup.overup', () => this._cleanup());
    //jbone(document.body).on 'mouseout.overout', (e) => @_onmousewinout(e)
    return e.preventDefault();
  },

  // starts the touch mode
  _ontouchstart: function(e) {
    this.dragStart = mouse.abs(e.changedTouches[0]);
    this.dragStartScroll = [this.g.zoomer.get('_alignmentScrollLeft'), this.g.zoomer.get('_alignmentScrollTop')];
    jbone(document.body).on('touchmove.overtmove', (e) => this._ontouchmove(e));
      return jbone(document.body).on( 'touchend.overtend touchleave.overtleave touchcancel.overtcanel', (e) => this._touchCleanup(e)
    );
  },

  // terminates touching
  _touchCleanup: function(e) {
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
  },

  _onmousedrag: function(e, reversed) {
    if (this.dragStart.length === 0) { return; }

    const dragEnd = mouse.abs(e);
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
    this.g.zoomer._checkScrolling(scrollCorrected, {origin: "rightheaderblock"});

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

    // this.throttledDraw();

    // abort selection events of the browser (mouse only)
    if ((e.preventDefault != null)) {
      e.preventDefault();
      return e.stopPropagation();
    }
  },

  // terminates dragging
  _cleanup: function() {
    this.dragStart = [];
    // remove all listeners
    jbone(document.body).off('.overmove');
    jbone(document.body).off('.overup');
    return jbone(document.body).off('.overout');
  },

  // checks whether the scrolling coordinates are valid
  // @returns: [xScroll,yScroll] valid coordinates
  _checkScrolling: function(scrollObj) {

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
  },

  _setWidth: function() {
    return this.el.style.width = this.g.zoomer.getAlignmentWidth() + "px";
  }
});
export default View;
