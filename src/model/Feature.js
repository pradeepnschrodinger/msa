const Model = require("backbone-thin").Model;
const Feature = Model.extend({

  defaults: {
    xStart: -1,
    xEnd: -1,
    height: -1,
    text: "",
    textColor: "black",
    fillColor: "red",
    fillOpacity: 0.5,
    type: "rectangle",
    borderSize: 1,
    borderColor: "black",
    verticalSeperatorColor: "black",
    verticalSeperatorWidth: 1,
    bottomBorderColor: "black",
    bottomBorderWidth: 1,
    topBorderColor: "black",
    topBorderWidth: 1,
    borderOpacity: 0.5,
    validate: true,
    row: 0
  },

  initialize: function(obj) {
    if ((obj.start != null)) {
      // gff counts from 1 where MSA starts at 0
      // This fix that misalignment
      this.set("xStart", (obj.start-1));
    }
    if ((obj.end != null)) {
      this.set("xEnd", (obj.end-1));
    }
    // name has a predefined meaning
    if ((obj.attributes != null)) {
      if ((obj.attributes.Name != null)) {
        this.set("text", obj.attributes.Name);
      }
      if ((obj.attributes.Color != null)) {
        this.set("fillColor", obj.attributes.Color);
      }
      if ((obj.attributes.textColor != null)) {
        this.set("textColor", obj.attributes.textColor);
      }
    }

    if (this.attributes.xEnd < this.attributes.xStart) {
      console.warn("invalid feature range for", this.attributes);
    }

    if (!_.isNumber(this.attributes.xStart) || !_.isNumber(this.attributes.xEnd)) {
      console.warn("please provide numeric feature ranges", obj);
      // trying auto-casting
      this.set("xStart", parseInt(this.attributes.xStart));
      return this.set("xEnd", parseInt(this.attributes.xEnd));
    }
  },

  validate: function() {
    if (isNaN(this.attributes.xStart || isNaN(this.attributes.xEnd))) {
      return "features need integer start and end.";
    }
  },

  contains: function(index) {
    return  this.attributes.xStart <= index && index <= this.attributes.xEnd;
  }
});
export default Feature;
