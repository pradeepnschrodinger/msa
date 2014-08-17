Feature = require "./Feature"
Collection = require("backbone").Collection
_ = require "underscore"

module.exports = FeatureCol = Collection.extend
  model: Feature

  # returns all features starting on index
  startOn: (index) ->
    @where({xStart: index})

  contains: (index) ->
    @reduce (el,memo) ->
      memo || el.contains index
    , false

  # gives the minimal needed number of rows
  # not a very efficient algorithm
  # (there is one in O(n)
  getMinRows: ->

    len = @max (el) -> el.get "xEnd"
    rows = (0 for x in [1..len])

    @each (el) ->
      for x in [el.get("xStart")..feature.get("xEnd")] by 1
        rows[x]++

    _.max rows