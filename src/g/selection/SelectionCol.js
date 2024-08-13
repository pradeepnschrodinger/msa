import {sel, possel, rowsel, columnsel, labelsel} from "./Selection";
import {uniq, filter} from "lodash";
const Collection = require("backbone-thin").Collection;

// holds the current user selection
const SelectionManager = Collection.extend({

  model: sel,

  initialize: function(data, opts) {
    if ((typeof opts !== "undefined" && opts !== null)) {
      this.g = opts.g;

      this.listenTo(this.g, "residue:click", function(e) {
        return this._handleE(e.evt, new possel({
          xStart: e.rowPos,
          xEnd: e.rowPos,
          seqId: e.seqId
        }));
      });

      this.listenTo(this.g, "row:click", function(e) {
        return this._handleE(e.evt, new rowsel({
          seqId: e.seqId
        }));
      });

      this.listenTo(this.g, "label:click", function(e) {
        return this._handleE(e.evt, new labelsel({
          seqId: e.seqId
        }));
      });

      return this.listenTo(this.g, "column:click", function(e) {
        return this._handleE(e.evt, new columnsel({
          xStart: e.rowPos,
          xEnd: e.rowPos + e.stepSize - 1
        }));
      });
    }
  },

  _updateLastSelection: function(selection) {
    this.lastSelection = selection;
  },

  isLabelSelected: function(seqId) {
    return this.find(function(el) { return (el.get("type") === "label" || el.get("type") === "row") && el.get("seqId") === seqId; });
  },

  isResidueSelected: function(seqId) {
    return this.find(function(el) { return el.get("type") === "pos" && el.get("seqId") === seqId; });
  },

  getSelForRow: function(seqId) {
    return this.filter(function(el) { return el.inRow(seqId); });
  },

  getSelForColumns: function(rowPos) {
    return this.filter(function(el) { return el.inColumn(rowPos); });
  },

  addJSON: function(model) {
    return this.add(this._fromJSON(model));
  },

  _fromJSON: function(model) {
   switch (model.type) {
     case "column":  return new columnsel(model);
     case "row":  return new rowsel(model);
     case "pos":  return new possel(model);
   }
  },

  // allows normal JSON input
  resetJSON: function(arr) {
    arr = arr.map(this._fromJSON);
    return this.reset(arr);
  },

  // @returns array of all selected residues for a row
  getBlocksForRow: function(seqId, maxLen) {
    const selis = this.filter(function(el) { return el.inRow(seqId); });
    let blocks = [];
    for (let i = 0, seli; i < selis.length; i++) {
      let seli = selis[i];
      if (seli.attributes.type === "row") {
        blocks = ((function() {
          const result = [];
          let i1 = 0;
          if (0 <= maxLen) {
            while (i1 <= maxLen) {
              result.push(i1++);
            }
          } else {
            while (i1 >= maxLen) {
              result.push(i1--);
            }
          }
          return result;
        })());
        break;
      } else {
        blocks = blocks.concat(((function() {
          const result = [];
          let i1 = seli.attributes.xStart;
          if (seli.attributes.xStart <= seli.attributes.xEnd) {
            while (i1 <= seli.attributes.xEnd) {
              result.push(i1++);
            }
          } else {
            while (i1 >= seli.attributes.xEnd) {
              result.push(i1--);
            }
          }
          return result;
        })()));
      }
    }
    return blocks;
  },

  // @returns array with all columns being selected
  // example: 0-4... 12-14 selected -> [0,1,2,3,4,12,13,14]
  getAllColumnBlocks: function(conf) {
    const maxLen = conf.maxLen;
    const withPos = conf.withPos;
    let blocks = [];
    let filtered;
    if (conf.withPos) {
      filtered = (this.filter(function(el) { return (el.get('xStart') != null); }) );
    } else {
      filtered = (this.filter(function(el) { return el.get('type') === "column"; }));
    }
    for (let i = 0, seli; i < filtered.length; i++) {
      let seli = filtered[i];
      blocks = blocks.concat(((function() {
        const result = [];
        let i1 = seli.attributes.xStart;
        if (seli.attributes.xStart <= seli.attributes.xEnd) {
          while (i1 <= seli.attributes.xEnd) {
            result.push(i1++);
          }
        } else {
          while (i1 >= seli.attributes.xEnd) {
            result.push(i1--);
          }
        }
        return result;
      })()));
    }
    blocks = uniq(blocks);
    return blocks;
  },

  // inverts the current selection for columns
  // @param rows [Array] all available seqId
  invertRow: function(rows) {
    let selRows = this.where({type:"row"});
    selRows = selRows.map((el) => el.attributes.seqId);
    const inverted = filter(rows, function(el) {
      if (selRows.indexOf(el) >= 0) { return false; } // existing selection
      return true;
    });
    // mass insert
    const s = [];
    for (let i = 0, el; i < inverted.length; i++) {
      let el = inverted[i];
      s.push(new rowsel({seqId:el}));
    }
    return this.reset(s);
  },

  // inverts the current selection for rows
  // @param rows [Array] all available rows (0..max.length)
  invertCol: function(columns) {
    const selColumns = this.where({type:"column"}).reduce((memo,el) => {
      return memo.concat(((() => {
        const result = [];
        let i = el.attributes.xStart;
        if (el.attributes.xStart <= el.attributes.xEnd) {
          while (i <= el.attributes.xEnd) {
            result.push(i++);
          }
        } else {
          while (i >= el.attributes.xEnd) {
            result.push(i--);
          }
        }
        return result;
      })()));
    }, []);
    const inverted = filter(columns, (el) => {
      if (selColumns.indexOf(el) >= 0) {
        // existing selection
        return false;
      }
      return true;
    });
    // mass insert
    if (inverted.length === 0) { return; }
    const s = [];
    let xStart = inverted[0];
    let xEnd = xStart;
    for (let i = 0, el; i < inverted.length; i++) {
      el = inverted[i];
      if (xEnd + 1 === el) {
        // contiguous
        xEnd = el;
      } else {
        // gap between
        s.push(new columnsel({xStart:xStart, xEnd: xEnd}));
        xStart = xEnd = el;
      }
    }
    // check for last gap
    if (xStart !== xEnd) { s.push(new columnsel({xStart:xStart, xEnd: inverted[inverted.length - 1]})); }
    return this.reset(s);
  },

  _handleE: function(e, selection) {
    if (e.ctrlKey || e.metaKey) {
      if (this._isAlreadySelected(selection, this.models)) {
        this.remove(this._modelsToRemove(selection, this.models))
      } else {
        this.add(selection)
      }
    } else if (e.shiftKey) {
      this._handleShiftSelection(selection);
    }
    else {
      this.reset([selection]);
    }
    this._updateLastSelection(selection);
  },

  _handleShiftSelection: function(selection) {
    const lastSelection = this.lastSelection;

    if (!lastSelection) {
      this.add(selection);
      return;
    }

    const lastSelectionType = lastSelection.get("type")
    const lSelSeqId = lastSelection.get("seqId")
    const lSelXStart = lastSelection.get("xStart")
    const lSelXEnd = lastSelection.get("xEnd")

    const selectionType = selection.get("type")
    const selSeqId = selection.get("seqId")
    const selXStart = selection.get("xStart")
    const selXEnd = selection.get("xEnd")

    const minXStart = Math.min(lSelXStart, selXStart)
    const maxXEnd = Math.max(lSelXEnd, selXEnd)
    const minSeqId = Math.min(lSelSeqId, selSeqId)
    const maxSeqId = Math.max(lSelSeqId, selSeqId)

    if (lastSelectionType === "row" && selectionType === "row") {
      // Select all rows between the last selection and the current selection
      const rows = []
      for (let i = minSeqId; i <= maxSeqId; i++) {
        rows.push(new rowsel({seqId: i}))
      }
      this.add(rows)
    } else if (lastSelectionType === "column" && selectionType === "column") {
      // Select all columns between the last selection and the current selection
      const columns = []
      for (let i = minXStart; i <= maxXEnd; i++) {
          columns.push(new columnsel({xStart: i, xEnd: i}))
      }
      this.add(columns)
    } else if (lastSelectionType === "pos" && selectionType === "pos" ) {
      // Select all residues between the last selection and the current selection
      const positions = []
      for (let i = minSeqId; i <= maxSeqId; i++) {
        for (let j = minXStart; j <= maxXEnd; j++) {
          positions.push(new possel({xStart: j, xEnd: j, seqId: i}))
        }
      }
      this.add(positions)
    } else if (lastSelectionType === "label" && selectionType === "label" ) {
      // Select all residues between the last selection and the current selection
      const labels = []
      for (let i = minSeqId; i <= maxSeqId; i++) {
        labels.push(new labelsel({seqId: i}))
      }
      this.add(labels)
    } else if (lastSelectionType === "row" && selectionType === "pos" || lastSelectionType === "pos" && selectionType === "row") {
      const positions = []
      for (let i = minSeqId; i <= maxSeqId; i++) {
        for (let j = selXStart; j <= selXEnd; j++) {
          positions.push(new possel({xStart: j, xEnd: j, seqId: i}))
        }
      }
      this.add(positions)
    } else if (lastSelectionType === "column" && selectionType === "pos" || lastSelectionType === "pos" && selectionType === "column") {
      const positions = []
      for (let j = minXStart; j <= maxXEnd; j++) {
        positions.push(new possel({xStart: j, xEnd: j, seqId: selSeqId}))
      }
      this.add(positions)
    } else {
      // Select the current selection
      this.add(selection)
    }
  },

  _isAlreadySelected: function(selection, models) {
    const selectionType = selection.get("type")
    const modelsOfType = models.filter(m => m.get("type") === selectionType)
    switch (selectionType) {
      case "row":
        return modelsOfType.some(m => m.get("seqId") === selection.get("seqId"))
      case "label":
        return modelsOfType.some(m => m.get("seqId") === selection.get("seqId"))
      case "column":
        return modelsOfType.some(m => m.get("xStart") === selection.get("xStart") && m.get("xEnd") === selection.get("xEnd"))
      case "pos":
        return modelsOfType.some(m => m.get("xStart") === selection.get("xStart") && m.get("xEnd") === selection.get("xEnd") && m.get("seqId") === selection.get("seqId"))
      default:
        return false
    }
  },

  _modelsToRemove: function(selection, models) {
    const selectionType = selection.get("type")
    switch (selectionType) {
      case "row":
        // Remove all rowsel, labelsel, and possel with the same seqId
        return models.filter(m => m.get("seqId") === selection.get("seqId"))
        // Remove only the labelsel with the same seqId
      case "label":
        return models.filter(m => m.get("type") === "label" && m.get("seqId") === selection.get("seqId"))
      case "column":
        // Remove all overlapping columnsel and possel
        return models.filter(m => selection.get("xStart") <= m.get("xStart") && m.get("xEnd") <= selection.get("xEnd"))
      case "pos":
        // Remove all overlapping possel
        return models.filter(m => selection.get("xStart") <= m.get("xStart") && m.get("xEnd") <= selection.get("xEnd") && m.get("seqId") === selection.get("seqId"))
      default:
        return []
    }
  },

  // experimental reduce method for columns
  _reduceColumns: function() {
    return this.each(function(el, index, arr) {
      const cols = filter(arr, (el) => el.get('type') === 'column');
      const xStart = el.get('xStart');
      const xEnd = el.get('xEnd');

      const lefts = filter(cols, (el) => el.get('xEnd') === (xStart - 1));
      for (let i = 0, left; i < lefts.length; i++) {
        let left = lefts[i];
        left.set('xEnd', xStart);
      }

      const rights = filter(cols, (el) =>  el.get('xStart') === (xEnd + 1));
      for (let j = 0, right; j < rights.length; j++) {
        let right = rights[j];
        right.set('xStart', xEnd);
      }

      if (lefts.length > 0 || rights.length > 0) {
        console.log("removed el");
        return el.collection.remove(el);
      }
    });
  }
});
export default SelectionManager;
