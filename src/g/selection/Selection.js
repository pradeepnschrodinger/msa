import {extend, pick} from "lodash";
const Model = require("backbone-thin").Model;

// holds the current user selection
const Selection = Model.extend({
  defaults:
    {type: "super"}
});

// inRow and inColumn functions are used to determine if a model is in a particular row or column

const RowSelection = Selection.extend({
  defaults: extend( {}, Selection.prototype.defaults,
    {type: "row",
    seqId: ""
  }),

  inRow(seqId) {
    return seqId === this.get("seqId");
  },

  // a row selection is in every column
  inColumn(rowPos) {
    return true;
  },

  getLength() {
    return 1;
  }
});

const ColumnSelection = Selection.extend({
  defaults: extend( {}, Selection.prototype.defaults,
    {type: "column",
    xStart: -1,
    xEnd: -1
  }),

  // a column selection is in every row
  inRow() {
    return true;
  },

  inColumn(rowPos) {
    return xStart <= rowPos && rowPos <= xEnd;
  },

  getLength() {
    return xEnd - xStart;
  }
});

// pos is a mixin of column and row
// start with Row and only overwrite "inColumn" from Column
const PosSelection = RowSelection.extend(extend( {},
                    pick(ColumnSelection,"inColumn"),
                    pick(ColumnSelection,"getLength"),
  // merge both defaults
  {defaults: extend( {}, ColumnSelection.prototype.defaults, RowSelection.prototype.defaults,
    {type: "pos"
  })
}));

const LabelSelection = Selection.extend({
  defaults: extend( {}, Selection.prototype.defaults,
    {type: "label",
    seqId: ""
  }),

  // a label selection is a different model type and has no meaning of being in a row or column
  // so inRow() and inColumn() always return false
  inRow() {
    return false;
  },

  inColumn() {
    return false;
  },
});

export {Selection as sel};
export {PosSelection as possel};
export {RowSelection as rowsel};
export {ColumnSelection as columnsel};
export {LabelSelection as labelsel};
