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

      this.listenTo(this.g, "column:click", function(e) {
        return this._handleE(e.evt, new columnsel({
          xStart: e.rowPos,
          xEnd: e.rowPos + e.stepSize - 1
        }));
      });

      return this.listenTo(this.g, "background:click", function(_e) {
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

  isSomeResidueSelected: function(seqId) {
    // Check if there is a row selection or a position selection for the given seqId, or if there is a column selection - in which case at least one residue is selected for all rows
    return this.find(function(el) { return ((el.get("type") === "pos" || el.get("type") === "row") && el.get("seqId") === seqId) || el.get("type") === "column"; });
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
    const sequences = this._getSequences();
    const selectionData = {};
    _.forEach(this.models, (model) => {
      const { type: selType } = model.attributes;
      switch (selType) {
        case 'row': {
          const { seqId } = model.attributes;
          if (!_.has(selectionData, seqId)) {
            if (sequences[seqId]) {
              selectionData[seqId] = {
                selectedResidues: _.range(sequences[seqId].seq.length),
                isLabelSelected: false,
              };
            }
          } else {
            selectionData[seqId].selectedResidues = _.range(sequences[seqId].seq.length);
          }
          break;
        }
        case 'column': {
          const { xStart, xEnd } = model.attributes;
          _.forEach(sequences, (sequence) => {
            if (_.has(selectionData, sequence.id)) {
              selectionData[sequence.id].selectedResidues = Array.from(
                new Set([...selectionData[sequence.id].selectedResidues, ..._.range(xStart, xEnd + 1)]),
              );
            } else {
              selectionData[sequence.id] = {
                selectedResidues: _.range(xStart, xEnd + 1),
                isLabelSelected: false,
              };
            }
          });
          break;
        }
        case 'pos': {
          const { xStart, xEnd, seqId } = model.attributes;
          if (_.has(selectionData, seqId)) {
            selectionData[seqId].selectedResidues = Array.from(
              new Set([...selectionData[seqId].selectedResidues, ..._.range(xStart, xEnd + 1)]),
            );
          } else {
            selectionData[seqId] = {
              selectedResidues: _.range(xStart, xEnd + 1),
              isLabelSelected: false,
            };
          }
          break;
        }
        case 'label': {
          const { seqId } = model.attributes;
          if (!_.has(selectionData, seqId)) {
            selectionData[seqId] = {
              selectedResidues: [],
              isLabelSelected: true,
            };
          } else {
            selectionData[seqId].isLabelSelected = true;
          }
          break;
        }
        default:
          break;
      }
    })
    return selectionData;
  },

  setSelectionData: function(selectionData, silent = false) {
    const sequences = this._getSequences();
    const models = [];
    const completelySelectedRows = [];

    _.forEach(sequences, (sequence) => {
      if (selectionData[sequence.id] && selectionData[sequence.id].selectedResidues.length === sequence.seq.length) {
        completelySelectedRows.push(sequence.id);
      }
    });

    let completelySelectedColumns = [];
    if (_.keys(sequences).length === _.keys(selectionData).length) {
      completelySelectedColumns = _.intersection(..._.map(selectionData, (data) => data.selectedResidues));
    }
    const partiallySelectedRows = _.omit(selectionData, completelySelectedRows);

    completelySelectedRows.forEach((seqId) => {
      models.push(new rowsel({ seqId }));
    });

    completelySelectedColumns.forEach((colIdx) => {
      models.push(new columnsel({ xStart: colIdx, xEnd: colIdx }));
    });

    _.forEach(partiallySelectedRows, ({ selectedResidues }, seqId) => {
      _.forEach(selectedResidues, (residueIdx) => {
        if (!completelySelectedColumns.includes(residueIdx)) {
          models.push(
            new possel({
              seqId: sequences[seqId].id,
              xStart: residueIdx,
              xEnd: residueIdx,
            }),
          );
        }
      });
    })
    const selectedEntities = _.keys(selectionData).filter(key => selectionData[key].isLabelSelected);
    selectedEntities.forEach((seqId) => {
      models.push(new labelsel({ seqId: sequences[seqId].id }));
    });
    this.reset(models, {silent});
  },

  _refineSelections: function() {
    // 1. Refine selections to remove any overlapping selections.
    // 2. Convert pos selections to row or column selections, if possible.
    // 2. Reduce contiguous column or position selections to groups of individual column or position selections.
    const selectionData = this.getSelectionData();
    this.setSelectionData(selectionData);
  },

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

  _isSelectionValid: function(selection) {
    const seqId = selection.get("seqId");
    const xStart = selection.get("xStart");
    const xEnd = selection.get("xEnd");

    return _.some(this.g.seqs.models, (model) => 
      (!seqId || model.attributes.id === seqId) && 
      (!xStart || xStart >= 0) && 
      (!xEnd || xEnd < model.attributes.seq.length)
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
    const lSelSeqIdIdx = seqIdToIdxMap[lastSelection.get("seqId")];
    const lSelXStart = lastSelection.get("xStart");
    const lSelXEnd = lastSelection.get("xEnd");

    const selectionType = selection.get("type");
    const selSeqIdIdx = seqIdToIdxMap[selection.get("seqId")];
    const selXStart = selection.get("xStart");
    const selXEnd = selection.get("xEnd");

    const minXStart = Math.min(lSelXStart, selXStart);
    const maxXEnd = Math.max(lSelXEnd, selXEnd);
    const minSeqIdIdx = Math.min(lSelSeqIdIdx, selSeqIdIdx);
    const maxSeqIdIdx = Math.max(lSelSeqIdIdx, selSeqIdIdx);

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
      // Select all residues between the last selection and the current selection
      const labels = [];
      for (let i = minSeqIdIdx; i <= maxSeqIdIdx; i++) {
        labels.push(new labelsel({seqId: idxToSeqIdMap[i]}));
      }
      this.add(labels, {silent: true});
    } else if (lastSelectionType === "row" && selectionType === "pos") {
      const positions = [];
      for (let i = minSeqIdIdx; i <= maxSeqIdIdx; i++) {
        for (let j = selXStart; j <= selXEnd; j++) {
          positions.push(new possel({xStart: j, xEnd: j, seqId: idxToSeqIdMap[i]}));
        }
      }
      this.add(positions, {silent: true});
    } else if (lastSelectionType === "column" && selectionType === "pos") {
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
    // models are refined selections - we need to check if the selection is already present in the models
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

  _handleE: function(e, selection) {
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
      this.reset(this._getSelsWithLabelsForRows([selection]), {silent: true});
    }

    this._updateLastSelection(selection);
    this._refineSelections();
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
