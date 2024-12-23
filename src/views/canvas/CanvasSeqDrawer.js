import {extend} from "lodash";
import RenderStats from "../../utils/renderStats";

const Drawer = {

  // caching the access is done for performance reasons
  updateConfig: function() {
    this.rectWidth = this.g.zoomer.get('columnWidth');
    this.rectHeight = this.g.zoomer.get('rowHeight');
  },

  drawLetters: function() {
    // clear the stats every frame
    this.g.renderStats.clear();

    this.updateConfig();

    // rects
    this.ctx.globalAlpha = this.g.colorscheme.get("opacity");
    this.drawSeqs(function(data) { return this.drawSeq(data, this._drawRect); });
    this.ctx.globalAlpha = 1;

    // letters
    if ( this.rectWidth >= this.g.zoomer.get('minLetterDrawSize')) {
      this.drawSeqs(function(data) { return this.drawSeq(data, this._drawLetter); });
    }

    // record monomers rendered for this frame
    this.drawSeqs(function(data) { return this.drawSeq(data, (that, monomerBlock) => this.g.renderStats.setRenderedMonomer(monomerBlock)); });

    return this;
  },

  drawSeqs: function(callback, target) {
    const hidden = this.g.columns.get("hidden");

    target = target || this;

    let [start, y] = this.getStartSeq();

    for (let i = start; i < this.model.length; i++) {
      const seq = this.model.at(i);
      if (seq.get('hidden')) {
        continue;
      }
      callback.call(target, {model: seq, yPos: y, y: i, hidden: hidden});

      const seqHeight = (seq.attributes.height || 1) * this.rectHeight;
      y = y + seqHeight;

      // out of viewport - stop
      if (y > this.height) {
          break;
      }
    }
  },

  // calls the callback for every drawable row
  drawRows: function(callback, target) {
    return this.drawSeqs(function(data) { return this.drawRow(data, callback, target); });
  },

  // draws a single row
  drawRow: function(data, callback, target) {
    const rectWidth = this.g.zoomer.get("columnWidth");
    const start = Math.max(0, Math.abs(Math.ceil( - this.g.zoomer.get('_alignmentScrollLeft') / rectWidth)));
    const x = - Math.abs( - this.g.zoomer.get('_alignmentScrollLeft') % rectWidth);

    const xZero = x - start * rectWidth;
    const yZero = data.yPos;
    return callback.call(target, {model: data.model, xZero: xZero, yZero: yZero, hidden: data.hidden});
  },

  // returns first sequence in the viewport
  // y is the position to start drawing
  getStartSeq: function() {
    const alignmentScrollTop = this.g.zoomer.get('_alignmentScrollTop');
    const start = (Math.max(0, Math.floor(alignmentScrollTop / this.rectHeight))) + 1;
    let counter = 0;
    let i = 0;
    while (counter < start && i < this.model.length) {
      counter += this.model.at(i).attributes.height || 1;
      i++;
    }
    const y = Math.max(0, alignmentScrollTop - counter * this.rectHeight + (this.model.at(i - 1)
    .attributes.height  || 1 ) * this.rectHeight);
    return [i - 1, -y];
  },

  // returns [the clicked seq for a viewport, row number]
  _getSeqForYClick: function(click) {
    const [start, yDiff] = this.getStartSeq();
    const yRel = yDiff % this.rectHeight;
    const clickedRows = (Math.max(0, Math.floor( (click - yRel ) / this.rectHeight))) + 1;
    let counter = 0;
    let i = start;
    while (counter < clickedRows && i < this.model.length) {
      counter += this.model.at(i).attributes.height || 1;
      i++;
    }
    const rowNumber = Math.max(0, Math.floor(click / this.rectHeight) - counter + (this.model.at(i - 1).get("height") || 1));
    return [i - 1, rowNumber];
  },

  // TODO: very expensive method
  drawSeq: function(data, callback) {
    const seq = data.model.get("seq");
    const seqId = data.model.get("id");
    const seqSelection = this.g.selcol.getBlocksForRow(seqId, seq.length);
    const hasResidueSelection = this.g.selcol.isAnyResidueSelected();
    const y = data.yPos;
    const rectWidth = this.rectWidth;
    const rectHeight = this.rectHeight;

    // skip unneeded blocks at the beginning
    const start = Math.max(0, Math.abs(Math.ceil( - this.g.zoomer.get('_alignmentScrollLeft') / rectWidth)));
    let x = - Math.abs( - this.g.zoomer.get('_alignmentScrollLeft') % rectWidth);

    const res = {rectWidth: rectWidth, rectHeight: rectHeight, yPos: y, y: data.y};
    const elWidth = this.width;

    for (let j = start; j <  seq.length; j++) {
      let c = seq[j];

      // call the custom function
      res.x = j;
      res.c = c;
      res.xPos = x;
      res.isSelected = seqSelection.includes(j);
      res.hasResidueSelection = hasResidueSelection;

      // local call is faster than apply
      // http://jsperf.com/function-calls-direct-vs-apply-vs-call-vs-bind/6
      if (data.hidden.indexOf(j) < 0) {
        callback(this, res);
      } else {
        continue;
      }

      // move to the right
      x = x + rectWidth;

      // out of viewport - stop
      if (x > elWidth) {
        break;
      }
    }
  },

  _drawRect: function(that, data) {
    const color = that.color.getColor( data.c, {
      pos:data.x,
      y: data.y
    });
    if ((typeof color !== "undefined" && color !== null)) {
      // NOTE (ritik): Change the opacity of non-selected residues to 65% whenever there is a residue selection
      // This is done to make the selected residues more prominent
      that.ctx.globalAlpha = data.isSelected? 1: (data.hasResidueSelection)? 0.65: 1;
      that.ctx.fillStyle = color;
      that.ctx.fillRect(data.xPos,data.yPos,data.rectWidth,data.rectHeight);
      return that.ctx.globalAlpha = 1;
    }
  },

  // REALLY expensive call on FF
  // Performance:
  // chrome: 2000ms drawLetter - 1000ms drawRect
  // FF: 1700ms drawLetter - 300ms drawRect
  _drawLetter: function(that,data) {
    if (that.g.config.get("shouldRenderSeqBlockAsSvg") === true) {
      that.ctx.fillStyle = "black";
      that.ctx.textAlign = "center";
      that.ctx.textBaseline = "middle";
      that.ctx.fillText(data.c, data.xPos + data.rectWidth / 2, data.yPos + data.rectHeight - data.rectHeight / 2);
    } else {
      return that.ctx.drawImage( that.cache.getFontTile(data.c, data.rectWidth, data.rectHeight, data.x, data.y), data.xPos, data.yPos, data.rectWidth, data.rectHeight);
    }
  },
};

const CanvasSeqDrawer = function(g,ctx,model,opts) {
  this.g = g;
  this.ctx = ctx;
  this.model = model;
  this.width = opts.width;
  this.height = opts.height;
  this.color = opts.color;
  this.cache = opts.cache;
  this.rectHeight = this.g.zoomer.get("rowHeight");
  this.rectWidth = this.g.zoomer.get("columnWidth"); // note: this can change
  return this;
};

extend(CanvasSeqDrawer.prototype, Drawer);
export default CanvasSeqDrawer;
