import {extend} from "lodash";
import { hdCanvas } from "../../utils/canvas";
const boneView = require("backbone-childs");

const CanvasPinnedBlock = boneView.extend({
  initialize(data) {
    this.g = data.g;
    this.el = hdCanvas();
    this.ctx = this.el.getContext('2d');
    this.model = data.model;

    this.setupListeners();
  },

  setupListeners() {
    this.listenTo(
      this.g.zoomer, 
      "change:_alignmentScrollLeft change:alignmentWidth change:alignmentHeight", 
      function(model, value, options) {
        return this.render();
      }
    );
  },

  adjustSize() {
    const height = (this.g.zoomer.get('rowHeight') * this.model.getCurrentHeight());
    const width = this.g.zoomer.getAlignmentWidth();
    this.el.adjustSize({ width, height })
  },

  render() {
    this.adjustSize();
    this.drawFeatures();
  },

  drawFeatures() {
    const rectWidth = this.g.zoomer.get("columnWidth");
    const rectHeight = this.g.zoomer.get("rowHeight");
    const borderWidth = 1;
    const xOffset = this.getXOffset(rectWidth);

    // TODO (pradeep): Perform virtualization here?
    this.model.forEach((feature) => {
      const x = feature.attributes.start * rectWidth;
      const y = (feature.attributes.row || 0) * rectWidth;
      const width = (feature.attributes.end - feature.attributes.start + 1) * rectWidth;
      const height = 1 * rectHeight;
  
      // draw background border
      this.ctx.globalAlpha = 1;
      this.ctx.fillStyle = feature.attributes.fillColor;
      this.ctx.fillRect(x + xOffset, y, width, height);

      // for vertical borders
      this.ctx.strokeStyle =
      feature.attributes.verticalSeperatorColor
      this.ctx.lineWidth =
        feature.attributes.verticalSeperatorWidth

      // draw left vertical border
      this.ctx.beginPath();
      this.ctx.moveTo(x + xOffset, y);
      this.ctx.lineTo(x + xOffset, y + height);
      this.ctx.stroke();

      //draw right vertical border
      this.ctx.beginPath();
      this.ctx.moveTo(x + xOffset + width, y);
      this.ctx.lineTo(x + xOffset + width, y + height);
      this.ctx.stroke();

      //draw bottom border
      this.ctx.strokeStyle = feature.attributes.bottomBorderColor
      this.ctx.lineWidth = feature.attributes.bottomBorderWidth
      this.ctx.beginPath();
      this.ctx.moveTo(x + xOffset, y + height);
      this.ctx.lineTo(x + xOffset + width, y + height);
      this.ctx.stroke();

      // draw top border
      this.ctx.strokeStyle = feature.attributes.topBorderColor 
      this.ctx.lineWidth = feature.attributes.topBorderWidth
      this.ctx.beginPath();
      this.ctx.moveTo(x + xOffset, y);
      this.ctx.lineTo(x + xOffset + width, y);
      this.ctx.stroke();

      // draw text
      this.ctx.fillStyle = feature.attributes.textColor || "black";
      this.ctx.font = 'bold ' + this.g.zoomer.get("residueFont") + "px mono";
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
