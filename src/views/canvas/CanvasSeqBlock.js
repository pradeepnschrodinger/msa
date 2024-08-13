const boneView = require("backbone-childs");
const mouse = require("mouse-pos");
const C2S = require("canvas2svg");
import { throttle, isEqual, omit } from "lodash";

import CharCache from "./CanvasCharCache";
import SelectionClass from "./CanvasSelection";
import CanvasSeqDrawer from "./CanvasSeqDrawer";
import ScrollBody from "../../utils/scroll";

const View = boneView.extend({

  initialize: function(data) {
    this.g = data.g;

    this.listenTo(this.g.columns,"change:hidden", this.render);
    this.listenTo(this.g.zoomer,"change:alignmentWidth change:alignmentHeight", this.render);
    this.listenTo(this.g.colorscheme, "change", this.render);
    this.listenTo(this.g.selcol, "reset add remove", this.render);
    this.listenTo(this.model, "reset add", this.render);

    // el props

    if (this.g.config.get("shouldRenderSeqBlockAsSvg") === true) {
      this.el.classList.add("biojs_msa_seqblock")
    } else {
      this.el.style.display = "inline-block";
      this.el.style.overflowX = "hidden";
      this.el.style.overflowY = "hidden";
      this.el.className = "biojs_msa_seqblock";
    }


    if (this.g.config.get("shouldRenderSeqBlockAsSvg") === true) {
      this.ctx = new C2S();
    } else {
      this.ctx = this.el.getContext('2d');
    }

    this.cache = new CharCache(this.g);

    // clear the char cache
    this.listenTo(this.g.zoomer, "change:residueFont change:residueFontOffset", function() {
      this.cache = new CharCache(this.g);
      return this.render();
    });

    // init selection
    this.sel = new SelectionClass(this.g,this.ctx);

    this._setColor();

    // throttle the expensive draw function
    this.throttleTime = 0;
    this.throttleCounts = 0;
    if ((document.documentElement.style.webkitAppearance != null)) {
      // webkit browser - no throttling needed
      this.throttledDraw = function() {
        const start = +new Date();
        this.draw();
        this.throttleTime += +new Date() - start;
        this.throttleCounts++;
        if (this.throttleCounts > 15) {
          const tTime = Math.ceil(this.throttleTime / this.throttleCounts);
          console.log("avgDrawTime/WebKit", tTime);
          // remove perf analyser
          return this.throttledDraw = this.draw;
        }
      };
    } else {
      // slow browsers like Gecko
      this.throttledDraw = throttle(this.throttledDraw, 30);
    }

    this.scrollBody = new ScrollBody(this.g, this, this.draw);

    return this.manageEvents();
  },


  // measures the time of a redraw and thus set the throttle limit
  throttledDraw: function() {
    // +new is the fastest: http://jsperf.com/new-date-vs-date-now-vs-performance-now/6
    const start = +new Date();
    this.draw();
    this.throttleTime += +new Date() - start;
    this.throttleCounts++;

    // remove itself after analysis
    if (this.throttleCounts > 15) {
      let tTime = Math.ceil(this.throttleTime / this.throttleCounts);
      console.log("avgDrawTime", tTime);
      tTime *=  1.2; // add safety time
      tTime = Math.max(20, tTime); // limit for ultra fast computers
      return this.throttledDraw = _.throttle(this.draw, tTime);
    }
  },

  manageEvents: function() {
    const events = this.scrollBody.getScrollEvents();

    if (this.g.config.get("registerMouseClicks")) {
      events.click = "_onclick";
    }
    if (this.g.config.get("registerMouseHover")) {
      events.mousein = "_onmousein";
      events.mouseout = "_onmouseout";
      events.mousemove = "_onmousemove";
    }

    this.delegateEvents(events);

    // listen for changes
    this.listenTo(this.g.config, "change:registerMouseHover", this.manageEvents);
    this.listenTo(this.g.config, "change:registerMouseClick", this.manageEvents);
  },

  _setColor: function() {
    return this.color = this.g.colorscheme.getSelectedScheme();
  },

  draw: function() {
    if (!(this.g.config.get("shouldRenderSeqBlockAsSvg") === true)) {
      this.ctx.clearRect(0, 0, this.el.width, this.el.height)
    }

    // draw all the stuff
    if ((this.seqDrawer != null)  && this.model.length > 0) {
      // char based
      this.seqDrawer.drawLetters();
      // row based
      this.seqDrawer.drawRows(this.sel._appendSelection, this.sel);

      // draw features
      return this.seqDrawer.drawRows(this.drawFeatures, this);
    }
  },

  drawFeatures: function(data) {
    const rectWidth = this.g.zoomer.get("columnWidth");
    const rectHeight = this.g.zoomer.get("rowHeight");
    if (data.model.attributes.height > 1) {
      const ctx = this.ctx;
      // draw background
      data.model.attributes.features.each((feature) => {
        ctx.fillStyle = feature.attributes.fillColor || "red";
        const len = feature.attributes.xEnd - feature.attributes.xStart + 1;
        const y = (feature.attributes.row + 1) * rectHeight;
        return ctx.fillRect(feature.attributes.xStart * rectWidth + data.xZero,y + data.yZero,rectWidth * len,rectHeight);
      });

      // draw text
      ctx.fillStyle = "black";
      ctx.font = this.g.zoomer.get("residueFont") + "px mono";
      ctx.textBaseline = 'middle';
      ctx.textAlign = "center";

      return data.model.attributes.features.each((feature) => {
        const len = feature.attributes.xEnd - feature.attributes.xStart + 1;
        const y = (feature.attributes.row + 1) * rectHeight;
        return ctx.fillText( feature.attributes.text, data.xZero + feature.attributes.xStart *
        rectWidth + (len / 2) * rectWidth, data.yZero + rectHeight * 0.5 + y
        );
      });
    }
  },

  getPlannedElHeight() {
    return this.g.zoomer.get("alignmentHeight");
  },

  getPlannedElWidth() {
    return this.g.zoomer.getAlignmentWidth();
  },

  render: function() {
    const width = this.getPlannedElWidth();
    const height = this.getPlannedElHeight();

    if (this.g.config.get("shouldRenderSeqBlockAsSvg") === true) {
      this.el.setAttributeNS("http://www.w3.org/2000/svg", 'height', height);
      this.el.setAttributeNS("http://www.w3.org/2000/svg", 'width', width);
      this.el.style.width = `${width}px`;
      this.el.style.height = `${height}px`;
    } else {
      this.el.adjustSize({
        height,
        width,
      })
    }

    if (this.g.config.get("shouldRenderSeqBlockAsSvg") === true) {
      this.ctx = new C2S(width, height)
    }

    this._setColor();

    this.seqDrawer = new CanvasSeqDrawer( this.g,this.ctx,this.model, {
      width,
      height,
      color: this.color,
      cache: this.cache,
    });

    this.throttledDraw();
    if (this.g.config.get("shouldRenderSeqBlockAsSvg") === true) {
      const shadowSvgElem = this.ctx.getSvg()
      this.el.innerHTML = shadowSvgElem.innerHTML;
    }
    return this;
  },

  _onmousemove: function(e) {
    const residueEvent = this._getResidueAtMouseEvent(e);
    this._onresiduehover(residueEvent);
  },

  _onresiduehover: function(residueEvent) {
    const residue = this._unwrapResidue(residueEvent);

    // don't retrigger the hover event if the hovered residue hasn't changed
    if (isEqual(residue, this.previousRes)) {
      return;
    }

    this.previousRes = residue;
    this.g.trigger("residue:hover", residueEvent);
  },

  _onclick: function(e) {
    const res = this._getResidueAtMouseEvent(e);
    if ((typeof res !== "undefined" && res !== null)) {
      if ((res.feature != null)) {
        this.g.trigger("feature:click", res);
      } else {
        this.g.trigger("residue:click", res);
      }
    }
    return this.throttledDraw();
  },

  _onmousein: function(e) {
    const res = this._getResidueAtMouseEvent(e);
    if ((typeof res !== "undefined" && res !== null)) {
      if ((res.feature != null)) {
        this.g.trigger("feature:mousein", res);
      } else {
        this.g.trigger("residue:mousein", res);
      }
    }
    return this.throttledDraw();
  },

  _onmouseout: function(e) {
    const res = this._getResidueAtMouseEvent(e);
    if ((typeof res !== "undefined" && res !== null)) {
      if ((res.feature != null)) {
        this.g.trigger("feature:mouseout", res);
      } else {
        this.g.trigger("residue:mouseout", res);
      }
    }

    return this.throttledDraw();
  },

  _getResidueAtMouseEvent: function(e) {
    const coords = mouse.rel(e.originalEvent);

    coords[0] += this.g.zoomer.get("_alignmentScrollLeft");
    let x = Math.floor(coords[0] / this.g.zoomer.get("columnWidth") );
    let [y, rowNumber] = this.seqDrawer._getSeqForYClick(coords[1]);

    // add hidden columns
    x += this.g.columns.calcHiddenColumns(x);
    // add hidden seqs
    y += this.model.calcHiddenSeqs(y);

    x = Math.max(0,x);
    y = Math.max(0,y);

    const seqId = this.model.at(y).get("id");

    if (rowNumber > 0) {
      // click on a feature
      const features = this.model.at(y).get("features").getFeatureOnRow(rowNumber - 1, x);
      if (!(features.length === 0)) {
        const feature = features[0];
        return {seqId:seqId, feature: feature, rowPos: x, evt:e};
      }
    } else {
      // click on a seq
      return {seqId:seqId, rowPos: x, evt:e};
    }
  },

  _unwrapResidue(residueEvent) {
    return omit(residueEvent, 'evt');
  },
});

export default View;
