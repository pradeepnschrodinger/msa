const boneView = require("backbone-childs");
import { emulatedScrollableCanvas } from "../utils/canvas";
import SeqBlock from "./canvas/CanvasSeqBlock";
import LabelBlock from "./labels/LabelBlock";

const View = boneView.extend({

  initialize: function(data) {
    this.g = data.g;

    if (true) {
      var labelblock = new LabelBlock({model: this.model, g: this.g});
      labelblock.ordering = -1;
      this.addView("labelblock",labelblock);
    }

    if (this.g.vis.get("sequences")) {
      var seqblock;
      if (this.g.config.get("shouldRenderSeqBlockAsSvg") === true) {
        const childEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        seqblock = new SeqBlock({
          model: this.model,
          g: this.g,
          el: childEl,
        });
      } else {
        const {outerDiv, innerDiv, canvas} = emulatedScrollableCanvas();
        seqblock = new SeqBlock({
          model: this.model,
          g: this.g,
          el: outerDiv,
          innerDiv: innerDiv,
          canvas: canvas
        });
      }
      seqblock.ordering = 0;
      this.addView("seqblock",seqblock);
    }

    this.listenTo(this.g.zoomer, "change:alignmentHeight", this.adjustHeight);
    this.listenTo(this.g.zoomer, "change:alignmentWidth", this.adjustWidth);
    this.listenTo(this.g.columns, "change:hidden", this.adjustHeight);
    return this;
  },

  render: function() {
    this.renderSubviews();
    this.el.className = "biojs_msa_albody";
    this.el.style.whiteSpace = "nowrap";
    this.adjustHeight();
    this.adjustWidth();
    return this;
  },

  adjustHeight: function() {
    if (this.g.zoomer.get("alignmentHeight") === "auto") {
      // TODO: fix the magic 5
      return this.el.style.height = (this.g.zoomer.get("rowHeight") * this.model.length) + 5;
    } else {
      return this.el.style.height = this.g.zoomer.get("alignmentHeight");
    }
  },

  adjustWidth: function() {
    // TODO: 15 is the width of the scrollbar
    return this.el.style.width = this.getWidth();
  },

  getWidth: function() {
    var width = 0;
    width += this.g.zoomer.getLeftBlockWidth();
    if (this.g.vis.get("sequences")) {
      width += this.g.zoomer.get("alignmentWidth");
    }
    return width;
  }
});
export default View;
