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
    this.el.setAttribute('height', this.g.zoomer.get('rowHeight') * 2 + "px");
    this.el.setAttribute('width', this.g.zoomer.getAlignmentWidth() + "px");
  },

  render() {
    this.adjustSize();
    this.drawPinnedFeatures();
  },

  drawPinnedFeatures() {
    // const record = {
    //   "feature": "gene",
    //   "start": 10,
    //   "end": 15,
    //   "attributes": {
    //       "Name": "Neka Name",
    //       "Color": "blue"
    //   },
    //   "xStart": 9,
    //   "xEnd": 14,
    //   "height": -1,
    //   "text": "Neka Name",
    //   "fillColor": "blue",
    //   "fillOpacity": 0.5,
    //   "type": "rectangle",
    //   "borderSize": 1,
    //   "borderColor": "black",
    //   "borderOpacity": 0.5,
    //   "validate": true,
    //   "row": 0
    // }
    const rectWidth = this.g.zoomer.get("columnWidth");
    const rectHeight = this.g.zoomer.get("rowHeight");  
    const xOffset = this.getXOffset(rectWidth);

    this.model.forEach((feature) => {
      const x = feature.attributes.xStart * rectWidth;
      const y = ((feature.attributes.row || 0) + 1) * rectWidth;
      const width = (feature.attributes.xEnd - feature.attributes.xStart + 1) * rectWidth;
      const height = 1 * rectHeight;
      
      this.ctx.fillStyle = feature.attributes.fillColor;
      this.ctx.fillRect(x + xOffset, y, width, height);
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
