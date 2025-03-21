import {find, extend} from "lodash";

const CanvasSelection = (function(g,ctx) {
  this.g = g;
  this.ctx = ctx;
  return this;
}
);

extend(CanvasSelection.prototype, {

  // TODO: should I be moved to the selection manager?
  // returns an array with the currently selected residues
  // e.g. [0,3] = pos 0 and 3 are selected
  _getSelection: function(model) {
    const seqLen = model.get("seq").length;
    const selection = [];
    const sels = this.g.selcol.getSelForRow(model.get("id"));
    _.forEach(sels, function(sel) {
      const selType = sel.get("type");
      if (selType === "row") {
        selection.push(..._.range(seqLen));
      } else {
        const start = sel.get("xStart");
        const end = sel.get("xEnd");
        selection.push(..._.range(start, end + 1));
      }
    });
    return selection;
  },

  // loops over all selection and calls the render method
  _appendSelection: function(data) {
    const seq = data.model.get("seq");
    const selection = this._getSelection(data.model);
    // get the status of the upper and lower row
    const getNextPrev= this._getPrevNextSelection(data.model);
    const mPrevSel = getNextPrev[0];
    const mNextSel = getNextPrev[1];

    // avoid unnecessary loops
    if (selection.length === 0) { return; }

    let hiddenOffset = 0;
    return (() => {
      const result = [];
      const end = this.g.seqs.getMaxLength() - 1;
      for (let n = 0; n <= end; n++) {
        result.push((() => {
          if (data.hidden.indexOf(n) >= 0) {
            return hiddenOffset++;
          } else {
            const k = n - hiddenOffset;
            // only if its a new selection
            if (selection.indexOf(n) >= 0 && (k === 0 || selection.indexOf(n - 1) < 0 )) {
              return this._renderSelection({n:n,
                                           k:k,
                                           selection: selection,
                                           mPrevSel: mPrevSel,
                                           mNextSel:mNextSel,
                                           xZero: data.xZero,
                                           yZero: data.yZero,
                                           model: data.model});
            }
          }
        })());
      }
      return result;
    })();
  },

  _drawHorizontalBorder: function (yPos, xStart, xEnd) {
    this.ctx.moveTo(xStart, yPos);
    this.ctx.lineTo(xEnd, yPos);
  },

  _drawVerticalBorder: function (xPos, yStart, yEnd, hasTopBorder, hasBottomBorder) {
    const adjustedYStart = hasTopBorder ? yStart : yStart - this.ctx.lineWidth;
    const adjustedYEnd = hasBottomBorder ? yEnd : yEnd + this.ctx.lineWidth;
    this.ctx.moveTo(xPos, adjustedYStart);
    this.ctx.lineTo(xPos, adjustedYEnd);
  },

  // draws a single user selection
  _renderSelection: function(data) {

    let xZero = data.xZero;
    const yZero = data.yZero;
    const n = data.n;
    const k = data.k;
    const selection = data.selection;
    // and checks the prev and next row for selection  -> no borders in a selection
    const mPrevSel= data.mPrevSel;
    const mNextSel = data.mNextSel;

    // get the length of this selection
    let selectionLength = 0;
    const end = this.g.seqs.getMaxLength() - 1;
    for (let i = n; i <= end; i++) {
      if (selection.indexOf(i) >= 0) {
        selectionLength++;
      } else {
        break;
      }
    }

    // TODO: ugly!
    const boxWidth = this.g.zoomer.get("columnWidth");
    const boxHeight = this.g.zoomer.get("rowHeight");
    const totalWidth = (boxWidth * selectionLength) + 1;

    const hidden = this.g.columns.get('hidden');

    this.ctx.beginPath();
    const beforeWidth = this.ctx.lineWidth;
    this.ctx.lineWidth = this.g.zoomer.get("selectionBorderWidth");
    const beforeStyle = this.ctx.strokeStyle;
    // #1A53A0 color is Fun Blue (https://chir.ag/projects/name-that-color/)
    this.ctx.strokeStyle = "#1A53A0";
    const adjustment = this.ctx.lineWidth / 2;

    xZero += k * boxWidth;

    // split up the selection into single cells
    let xPart = 0;

    let firstSelectedResidueHasBottomBorder = false;
    let firstSelectedResidueHasTopBorder = false;
    let lastSelectedResidueHasBottomBorder = false;
    let lastSelectedResidueHasTopBorder = false;

    const end1 = selectionLength - 1;
    for (let i = 0; i <= end1; i++) {
      let xPos = n + i;
      if (hidden.indexOf(xPos) >= 0) {
        continue;
      }
      // upper line
      if (!((typeof mPrevSel !== "undefined" && mPrevSel !== null) && mPrevSel.indexOf(xPos) >= 0)) {
        this._drawHorizontalBorder(yZero + adjustment, xZero + xPart, xZero + xPart + boxWidth);
        if (i === 0) {
          firstSelectedResidueHasTopBorder = true;
        } 
        if (i === end1) {
          lastSelectedResidueHasTopBorder = true;
        }
      }
      // lower line
      if (!((typeof mNextSel !== "undefined" && mNextSel !== null) && mNextSel.indexOf(xPos) >= 0)) {
        this._drawHorizontalBorder(yZero + boxHeight - adjustment, xZero + xPart, xZero + xPart + boxWidth);
        if (i === 0) {
          firstSelectedResidueHasBottomBorder = true;
        } 
        if (i === end1) {
          lastSelectedResidueHasBottomBorder = true;
        }
      }

      xPart += boxWidth;
    }
    const leftX = xZero + adjustment;
    const rightX = xZero + totalWidth - 2 * adjustment;
    const yStart = yZero;
    const yEnd = yZero + boxHeight;

    // draw vertical borders
    // left border
    this._drawVerticalBorder(leftX, yStart, yEnd, firstSelectedResidueHasTopBorder, firstSelectedResidueHasBottomBorder);
    // right border
    this._drawVerticalBorder(rightX, yStart, yEnd, lastSelectedResidueHasTopBorder, lastSelectedResidueHasBottomBorder);

    this.ctx.stroke();
    this.ctx.strokeStyle = beforeStyle;
    return this.ctx.lineWidth = beforeWidth;
  },

  // looks at the selection of the prev and next el
  // TODO: this is very naive, as there might be gaps above or below
  _getPrevNextSelection: function(model) {

    const modelPrev = model.collection.prev(model);
    const modelNext = model.collection.next(model);
    let mPrevSel, mNextSel;
    if ((typeof modelPrev !== "undefined" && modelPrev !== null)) { mPrevSel = this._getSelection(modelPrev); }
    if ((typeof modelNext !== "undefined" && modelNext !== null)) { mNextSel = this._getSelection(modelNext); }
    return [mPrevSel,mNextSel];
  }
});
export default CanvasSelection;
