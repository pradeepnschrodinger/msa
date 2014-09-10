Model = require("backbone").Model
# pixel properties for some components
module.exports = Zoomer = Model.extend

  defaults:
    columnWidth: 15
    metaWidth: 100
    labelWidth: 100
    alignmentWidth: "auto"
    alignmentHeight: "auto"

    rowHeight: 15
    textVisible: true
    labelLength: 20
    labelFontsize: "10px"
    stepSize: 1

    boxRectHeight: 5
    boxRectWidth: 5

    _alignmentScrollLeft: 0

  # @param n [int] maxLength of all seqs
  getAlignmentWidth: (n) ->
    if @get("alignmentWidth") is "auto"
      @get("columnWidth") * n
    else
      @get "alignmentWidth"

  # @param n [int] number of residues to scroll to the right
  setLeftOffset: (n) ->
    @set "_alignmentScrollLeft", n * @get('columnWidth')
