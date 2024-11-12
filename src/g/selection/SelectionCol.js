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
        return this._handleSelectionEvent(e.evt, new possel({
          xStart: e.rowPos,
          xEnd: e.rowPos,
          seqId: e.seqId
        }));
      });

      this.listenTo(this.g, "row:click", function(e) {
        return this._handleSelectionEvent(e.evt, new rowsel({
          seqId: e.seqId
        }));
      });

      this.listenTo(this.g, "label:click", function(e) {
        return this._handleSelectionEvent(e.evt, new labelsel({
          seqId: e.seqId
        }));
      });

      this.listenTo(this.g, "column:click", function(e) {
        return this._handleSelectionEvent(e.evt, new columnsel({
          xStart: e.rowPos,
          xEnd: e.rowPos + e.stepSize - 1
        }));
      });

      return this.listenTo(this.g, "background:click", function(_e) {
        this._updateLastSelection(null);
        return this.reset();
      });
    }
  },

  _updateLastSelection: function(selection) {
    this.lastSelection = selection;
  },

  isLabelSelected: function(seqId) {
    return this.find(function(el) { return el.get("type") === "label" && el.get("seqId") === seqId; });
  },

  isAnyResidueSelectedInRow: function(seqId, seqLen) {
    // Check if there is a row selection or a position selection for the given seqId, or if there is a column selection within the sequence length
    return this.find(function(el) {
      const isRowOrPositionModelForSeqId = (el.get("type") === "pos" || el.get("type") === "row") && el.get("seqId") === seqId;
      const isColumnModelWithinSequence = el.get("type") === "column" && el.get("xEnd") < seqLen;
      return isRowOrPositionModelForSeqId || isColumnModelWithinSequence;
    });
  },

  isAnyResidueSelected: function() {
    return !!this.find(function(el) {
      return el.get("type") !== "label";
    });
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
     case "label":  return new labelsel(model);
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

  _getSequences: function() {
    const sequences = _.reduce(this.g.seqs.models, (acc, model) => {
      const { id, seq } = model.attributes
      acc[id] = { seq, id }
      return acc
    }, {});
    return sequences;
  },

  getSelectionData: function() {
    const selectionData = {
      selectedRows: new Set(),
      selectedColumns: new Set(),
      selectedPositions: [],
      selectedLabels: new Set(),
    };
    const selectedPositionsSet = new Set();

    _.forEach(this.models, (model) => {
      const { type: selType } = model.attributes;
      switch (selType) {
        case 'row': {
          const { seqId } = model.attributes;
          selectionData.selectedRows.add(seqId);
          break;
        }
        case 'column': {
          const { xStart, xEnd } = model.attributes;
          for (let j = xStart; j <= xEnd; j++) {
            selectionData.selectedColumns.add(j);
          }
          break;
        }
        case 'pos': {
          const { xStart, seqId, xEnd } = model.attributes;
          for (let j = xStart; j <= xEnd; j++) {
            if (!selectedPositionsSet.has(`${seqId}-${j}`)) {
              selectionData.selectedPositions.push({ seqId: seqId, columnIndex: j });
              selectedPositionsSet.add(`${seqId}-${j}`);
            }
          }
          break;
        }
        case 'label': {
          const { seqId } = model.attributes;
          selectionData.selectedLabels.add(seqId);
          break;
        }
        default:
          break;
      }
    })
    return {
      selectedRows: Array.from(selectionData.selectedRows),
      selectedColumns: Array.from(selectionData.selectedColumns),
      selectedPositions: selectionData.selectedPositions,
      selectedLabels: Array.from(selectionData.selectedLabels),
    };
  },

  // @param silent [Boolean] if true, no events are triggered for the collection update
  setSelectionData: function(selectionData, silent = false) {
    const models = [];
    selectionData.selectedRows.forEach((seqId) => {
      models.push(new rowsel({seqId}));
    });

    selectionData.selectedColumns.forEach((xStart) => {
      models.push(new columnsel({xStart, xEnd: xStart}));
    });

    selectionData.selectedPositions.forEach(({ seqId, columnIndex }) => {
      models.push(new possel({xStart: columnIndex, xEnd: columnIndex, seqId}));
    });

    selectionData.selectedLabels.forEach((seqId) => {
      models.push(new labelsel({seqId}));
    });

    this.reset(models, {silent});
  },

  _refineSelections: function() {
    // 1. Refine selections to remove any overlapping or duplicate selections.
    // 2. Reduce contiguous column or position selections to groups of individual column or position selections.
    const selectionData = this.getSelectionData();
    this.setSelectionData(selectionData);
  },

  // This function is used to add label selections for rows in the selection array. 
  // In the current implementation, whenever we select a row, we also select the label for the row.
  _getSelsWithLabelsForRows: function(selectionArr) {
    let updatedSelectionArr = [];

    selectionArr.forEach((sel) => {
      if (sel.get("type") === "row") {
        updatedSelectionArr.push(sel);
        updatedSelectionArr.push(new labelsel({seqId: sel.get("seqId")}));
      } else {
        updatedSelectionArr.push(sel);
      }
    });
    return updatedSelectionArr;
  },

  // Note(ritik): This function is used to invalidate lastSelection if it is out-of-bounds for the current set of sequences. 
  // We don't directly update lastSelection when we change sequence data in MSA. So, lastSelection may not be valid for the new data.
  _isSelectionValid: function(selection) {
    const seqId = selection.get("seqId");
    const xStart = selection.get("xStart");
    const xEnd = selection.get("xEnd");

    // For a selection to be valid, check if for some sequence, the seqId matches. If yes, further check if xStart and xEnd are in bounds.
    return _.some(this.g.seqs.models, (model) => {
        const seqIdMatch = !seqId || model.attributes.id === seqId;
        const xStartValid = !xStart || xStart >= 0;
        const xEndValid = !xEnd || xEnd < model.attributes.seq.length;

        return seqIdMatch && xStartValid && xEndValid;
      }
    );
  },
  
  _handleShiftSelection: function(selection) {
    const seqIdToIdxMap = _.reduce(this.g.seqs.models, (acc, model, idx) => {
      const { id } = model.attributes
      acc[id] = idx
      return acc
    }, {});

    const idxToSeqIdMap = _.reduce(this.g.seqs.models, (acc, model, idx) => {
      const { id } = model.attributes
      acc[idx] = id
      return acc
    }, {});

    const lastSelection = this.lastSelection;

    if (!lastSelection || !this._isSelectionValid(lastSelection)) {
      this.add(this._getSelsWithLabelsForRows([selection]), {silent: true});
      return;
    }

    const lastSelectionType = lastSelection.get("type");
    const lastSelSeqIdIdx = seqIdToIdxMap[lastSelection.get("seqId")];
    const lastSelXStart = lastSelection.get("xStart");
    const lastSelXEnd = lastSelection.get("xEnd");

    const selectionType = selection.get("type");
    const selSeqIdIdx = seqIdToIdxMap[selection.get("seqId")];
    const selXStart = selection.get("xStart");
    const selXEnd = selection.get("xEnd");

    const minXStart = Math.min(lastSelXStart, selXStart);
    const maxXEnd = Math.max(lastSelXEnd, selXEnd);
    const minSeqIdIdx = Math.min(lastSelSeqIdIdx, selSeqIdIdx);
    const maxSeqIdIdx = Math.max(lastSelSeqIdIdx, selSeqIdIdx);

    if (lastSelectionType === "row" && selectionType === "row") {
      // Select all rows between the last selection and the current selection
      const selections = [];
      for (let i = minSeqIdIdx; i <= maxSeqIdIdx; i++) {
        selections.push(new rowsel({seqId: idxToSeqIdMap[i]}));
      }
      this.add(this._getSelsWithLabelsForRows(selections), {silent: true});
    } else if (lastSelectionType === "column" && selectionType === "column") {
      // Select all columns between the last selection and the current selection
      const columns = [];
      for (let i = minXStart; i <= maxXEnd; i++) {
          columns.push(new columnsel({xStart: i, xEnd: i}));
      }
      this.add(columns, {silent: true});
    } else if (lastSelectionType === "pos" && selectionType === "pos" ) {
      // Select all residues between the last selection and the current selection
      const positions = [];
      for (let i = minSeqIdIdx; i <= maxSeqIdIdx; i++) {
        for (let j = minXStart; j <= maxXEnd; j++) {
          positions.push(new possel({xStart: j, xEnd: j, seqId: idxToSeqIdMap[i]}));
        }
      }
      this.add(positions, {silent: true});
    } else if (lastSelectionType === "label" && selectionType === "label" ) {
      // Select all labels between the last selection and the current selection
      const labels = [];
      for (let i = minSeqIdIdx; i <= maxSeqIdIdx; i++) {
        labels.push(new labelsel({seqId: idxToSeqIdMap[i]}));
      }
      this.add(labels, {silent: true});
    } else if (lastSelectionType === "row" && selectionType === "pos") {
      // Select all residues between the last row selection and the current position selection.
      // Use column indices from the position selection.
      const positions = [];
      for (let i = minSeqIdIdx; i <= maxSeqIdIdx; i++) {
        for (let j = selXStart; j <= selXEnd; j++) {
          positions.push(new possel({xStart: j, xEnd: j, seqId: idxToSeqIdMap[i]}));
        }
      }
      this.add(positions, {silent: true});
    } else if (lastSelectionType === "column" && selectionType === "pos") {
      // Select all residues between the last column selection and the current position selection, using the seqId from the position selection
      const positions = [];
      for (let j = minXStart; j <= maxXEnd; j++) {
        positions.push(new possel({xStart: j, xEnd: j, seqId: idxToSeqIdMap[selSeqIdIdx]}));
      }
      this.add(positions, {silent: true});
    } else {
      // Select the current selection
      this.add(this._getSelsWithLabelsForRows([selection]), {silent: true});
    }
  },

  _isAlreadySelected: function(selection) {
    // Models in the collection are refined selections
    // To check if a selection is already selected, we need to check the following:
    // 1) For row selections, check if there is a row model with the same seqId
    // 2) For label selections, check if there is a label model with the same seqId
    // 3) For column selections, check if there are column models for each value from xStart to xEnd of selection
    // 4) For position selections, check if the entire row with same seqId is selected. If not, check if there are position or column models for each value from xStart to xEnd of selection

    const selectionType = selection.get("type");
    switch (selectionType) {
      case "row":
        return _.some(this.models, m => m.get("type") === "row" && m.get("seqId") === selection.get("seqId"));
      case "label":
        return _.some(this.models, m => m.get("type") === "label" && m.get("seqId") === selection.get("seqId"));
      case "column": {
        const columnModels =  _.filter(this.models, m => m.get("type") === "column")
        const alreadySelectedColumns = new Set(_.map(columnModels, m => m.get("xStart"))); // In refined selections, xStart and xEnd are the same
        for(let i = selection.get("xStart"); i <= selection.get("xEnd"); i++) {
          if (!alreadySelectedColumns.has(i)) {
            return false;
          }
        }
        return true;
      }
      case "pos": {
        const isRowSelected = _.some(this.models, m => m.get("type") === "row" && m.get("seqId") === selection.get("seqId"))
        if (isRowSelected) {
          return true;
        }
        const reqPosOrColModels = _.filter(this.models, m => (m.get("type") === "pos" && m.get("seqId") === selection.get("seqId")) || m.get("type") === "column")
        const alreadySelectedPositions = new Set(_.map(reqPosOrColModels, m => m.get("xStart"))); // In refined selections, xStart and xEnd are the same
        for(let i = selection.get("xStart"); i <= selection.get("xEnd"); i++) {
          if (!alreadySelectedPositions.has(i)) {
            return false;
          }
        }
        return true;
      }
      default:
        return false;
    }
  },

  _deselectSelection: function(selection) {
    // Since the selections are refined, de-selection should be done in the following way:
    // 1) For row de-selections, remove all row, label and position models with the same seqId
    // 2) For label de-selections, remove all label models with the same seqId
    // 3) For column de-selections, remove all column models with xStart and xEnd between the xStart and xEnd of selection
    // 4) For position de-selections, there can be 3 cases:
    //    a) If the complete row is selected, remove the row selection and add remaining positions for that row
    //    b) If the complete column is selected, remove the column selection and add remaining positions for that column. Do this for all columns in the selection.
    //    c) Remove the position selections between xStart and xEnd of selection

    const selectionType = selection.get("type");
    const sequences = this._getSequences();
    switch (selectionType) {
      case "row": 
        this.remove(_.filter(this.models, m => m.get("seqId") === selection.get("seqId")), {silent: true});
        break;
      case "label":
        this.remove(_.filter(this.models, m => m.get("type") === "label" && m.get("seqId") === selection.get("seqId")), {silent: true});
        break;
      case "column":
        this.remove(_.filter(this.models, m => selection.get("xStart") <= m.get("xStart") && m.get("xEnd") <= selection.get("xEnd")), {silent: true}); // xStart and xEnd are the same in refined selections
        break;
      case "pos": {
        const { xStart, xEnd, seqId } = selection.attributes;
        // If the complete row is selected, remove the row selection and add remaining positions for that row
        const row = _.filter(this.models, m => m.get("type") === "row" && m.get("seqId") === seqId);
        if (!_.isEmpty(row)) {
          this.remove(row, {silent: true});
          const positions = [];
          for (let i = 0; i < xStart; i++) {
            positions.push(new possel({xStart: i, xEnd: i, seqId: seqId}));
          }
          for (let i = xEnd + 1; i < sequences[seqId].seq.length; i++) {
            positions.push(new possel({xStart: i, xEnd: i, seqId: seqId}));
          }
          this.add(positions, {silent: true});
        }

        // If the complete column is selected, remove the column selection and add remaining positions for that column
        const columns = _.filter(this.models, m => m.get("type") === "column" && xStart <= m.get("xStart") && m.get("xEnd") <= xEnd);
        if (!_.isEmpty(columns)) {
          this.remove(columns, {silent: true});
          const positions = [];
          const remainingSeqIds = _.filter(_.map(sequences, sequence => sequence.id), (id) => id !== seqId);
          _.forEach(columns, (column) => {
            // For refined selections, xStart and xEnd are the same
            const xStart = column.get("xStart");
            remainingSeqIds.forEach((seqId) => {
              positions.push(new possel({xStart, xEnd: xStart, seqId}));
            });
          });
          this.add(positions, {silent: true});
        }

        // Remove the position selections
        this.remove(_.filter(this.models, m => m.get("type") === "pos" && m.get("seqId") === seqId && xStart <= m.get("xStart") && m.get("xEnd") <= xEnd), {silent: true});
        break;
      }
      default:
        break;
    }
  },

  _resetSelection: function(selection, options) {
    const selectionType = selection.get("type");
    const labelSelections = _.filter(this.models, m => m.get("type") === "label");
    const residueSelections = _.filter(this.models, m => m.get("type") !== "label");
    if (selectionType === "label") {  // Label Selection
      // Replace all the label selections with the new label selection
      // Do not reset the residue selections
      this.reset([selection, ...residueSelections], options);
    } else if (selectionType === "column" || selectionType === "pos") {  // Residue Selection
      // Replace all the residues selections with the new residue selection
      // Do not reset the label selections
      this.reset([selection, ...labelSelections], options);
    } else { 
      // Simultaneous Label and Residue Selection (via Row Selection)
      // Replace all the selections with the new label & residue selection
      this.reset(this._getSelsWithLabelsForRows([selection]), options);
    }
  },

  _handleSelectionEvent: function(e, selection) {
    if (e.ctrlKey || e.metaKey) {
      if (this._isAlreadySelected(selection)) {
        this._deselectSelection(selection);
      } else {
        this.add(this._getSelsWithLabelsForRows([selection]), {silent: true});
      }
    } else if (e.shiftKey) {
      this._handleShiftSelection(selection);
    }
    else {
      this._resetSelection(selection, {silent: true});
    }

    this._refineSelections();
    this._updateLastSelection(selection);
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
