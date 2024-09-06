const boneView = require("backbone-childs");
import LabelRowView from "./LabelRowView";
import { some, defer } from "lodash";

const View = boneView.extend({

  initialize: function(data) {
    this.g = data.g;
    this._adjustScrollingTop = this._adjustScrollingTop.bind(this);

    this.draw();
    this.listenTo(this.g.zoomer, "change:_alignmentScrollTop", this._adjustScrollingTop);
    this.g.vis.once('change:loaded', this._adjustScrollingTop , this);

    this.listenTo(this.g.zoomer,"change:alignmentHeight", this._setHeight);
    this.listenTo(this.model,"change:reference", this.draw);

    this.listenTo(this.g.zoomer, "change:labelWidth change:metaWidth", this.render);

    return this.listenTo(this.model,"reset add remove", () => {
      this.draw();
      return this.render();
    });
  },

  draw: function() {
    this.removeViews();
    for (var i = 0; i < this.model.length; i++) {
        if (this.model.at(i).get('hidden')) { continue; }
        var view = new LabelRowView({model: this.model.at(i), g: this.g});
        view.ordering = i;
        this.addView("row_" + i, view)
    }
  },

  events:
    { 
      "click": "_onClick",
      "scroll": "_sendScrollEvent"
    },

  _onClick: function(e) {
    const labelRows = this.$el.find(".biojs_msa_labelrow").toArray();
    const isClickOnLabelRow = some(labelRows, labelrow => labelrow.contains(e.target));
    if (!isClickOnLabelRow) {
      // Triggered when clicking on the remaining space of the label block (not on a label row)
      this.g.trigger("background:click", e);
    }
  },

  // broadcast the scrolling event (by the scrollbar)
  _sendScrollEvent: function() {
    return this.g.zoomer.set("_alignmentScrollTop", this.el.scrollTop, {origin: "label"});
  },

  // sets the scrolling property (from another event e.g. dragging)
  _adjustScrollingTop() {
    this.el.scrollTop =  this.g.zoomer.get("_alignmentScrollTop");
  },

  render: function() {
    this.renderSubviews();
    this.el.className = "biojs_msa_labelblock";
    this.el.style.display = "inline-block";
    this.el.style.verticalAlign = "top";
    this.el.style.overflowY = "auto";
    this.el.style.overflowX = "hidden";
    this.el.style.fontSize = `${this.g.zoomer.get('labelFontsize')}px`;
    this.el.style.lineHeight = `${this.g.zoomer.get("labelLineHeight")}`;
    this.el.style.width = 0 + this.g.zoomer.getLeftBlockWidth() + "px";
    this._setHeight();

    // backbone JS has a delay with rendering the views into the DOM
    defer(this._adjustScrollingTop);

    return this;
  },


  _setHeight: function() {
    return this.el.style.height = this.g.zoomer.get("alignmentHeight") + "px";
  }
});
export default View;
