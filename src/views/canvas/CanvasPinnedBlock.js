import {extend} from "lodash";
const boneView = require("backbone-childs");

const CanvasPinnedBlock = boneView.extend({
  initialize(data) {
    this.g = data.g;
    this.ctx = this.el.getContext('2d');
    this.model = data.model;
    this.width = data.width;
    this.height = data.height;
    this.color = data.color;
    this.cache = data.cache;
    this.rectHeight = this.g.zoomer.get("rowHeight");
    this.rectWidth = this.g.zoomer.get("columnWidth");

    this.setupListeners();
  },

  setupListeners() {
    this.listenTo(
      this.g.zoomer, 
      "change:_alignmentScrollLeft change:_alignmentScrollTop change:alignmentWidth change:alignmentHeight", 
      function(model, value, options) {
        if ((!(((typeof options !== "undefined" && options !== null) ? options.origin : undefined) != null)) || options.origin !== "canvasseq") {
          return this.render();
        }
    });
  },

  adjustSize() {
    this.el.setAttribute('height', this.g.zoomer.get('rowHeight') * this.model.getCurrentHeight() + "px");
    this.el.setAttribute('width', this.g.zoomer.getAlignmentWidth() + "px");
  },

  render() {
    this.adjustSize();
    this.drawFeatures();
  },

  drawFeatures() {
    const rectWidth = this.g.zoomer.get("columnWidth");
    const rectHeight = this.g.zoomer.get("rowHeight");
    const xOffset = this.getXOffset(rectWidth);

    this.model.forEach((feature) => {
      const x = feature.attributes.xStart * rectWidth;
      const y = (feature.attributes.row || 0) * rectWidth;
      const width = (feature.attributes.xEnd - feature.attributes.xStart + 1) * rectWidth;
      const height = 1 * rectHeight;
      
      // draw background block
      this.ctx.fillStyle = feature.attributes.fillColor;
      this.ctx.fillRect(x + xOffset, y, width, height);

      // draw text
      this.ctx.fillStyle = "black";
      this.ctx.font = this.g.zoomer.get("residueFont") + "px mono";
      this.ctx.textBaseline = 'middle';
      this.ctx.textAlign = "center";

      this.ctx.fillText(
        feature.attributes.text, 
        x + width/2 + xOffset,
        y + height/2,
      );
    })
  },

  getXOffset(rectWidth) {
    // NOTE (pradeep): I have no idea what the calculation here does besides just
    // adjusting an offset based on current alignment/scroll offset.
    // This is copied from views/FeatureBlock.js
    var start = Math.max(0, Math.abs(Math.ceil( - this.g.zoomer.get('_alignmentScrollLeft') / rectWidth)));
    var x = - Math.abs( - this.g.zoomer.get('_alignmentScrollLeft') % rectWidth);
    var xZero = x - start * rectWidth;

    return xZero;
  }
})

export default CanvasPinnedBlock;
