import _ from "lodash";

class RenderStats {
  constructor({ g, model }) {
    this.g = g;
    this.model = model;

    this.clear();
  }

  clear() {
    this.stats = {
      renderedSequenceBlock: { },
      firstRowIndex: null,
      lastRowIndex: null,
      firstColumnIndex: null,
      lastColumnIndex: null,
    }
  }

  get() {
    return this.stats;
  }

  _getColor(color, { pos, y }) {
    return this.g.colorscheme.getSelectedScheme().getColor(color, { 
      pos, 
      y,
    });
  }

  _getOrCreateRenderedSequenceBlock(y) {
    if (!this.stats.renderedSequenceBlock[y]) {
      this.stats.renderedSequenceBlock[y] = {
        monomers: [],
        colors: [],
      }
    }

    return this.stats.renderedSequenceBlock[y];
  }

  setRenderedMonomer = (monomerBlock) => {
    const { x, y, c: color } = monomerBlock;

    const block = this._getOrCreateRenderedSequenceBlock(y);
    block.monomers.push(color);
    block.colors.push(this._getColor(color, {
      pos: x,
      y: y,
    }));

    this.stats.firstRowIndex = _.min([this.stats.firstRowIndex, y]);
    this.stats.lastRowIndex = _.max([this.stats.lastRowIndex, y]);
    this.stats.firstColumnIndex = _.min([this.stats.firstColumnIndex, x]);
    this.stats.lastColumnIndex = _.max([this.stats.lastColumnIndex, x]);
  }
}

export default RenderStats;
