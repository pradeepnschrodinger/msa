const k = require("koala-js");
const view = require("backbone-viewj");
const dom = require("dom-helper");

const LabelHeader = view.extend({

  className: "biojs_msa_headers",

  initialize: function(data) {
    this.g = data.g;

    this.listenTo(this.g.vis, "change:metacell change:labels change:customColumnsGetter change:customColumnsCount", this.render);
    return this.listenTo(this.g.zoomer, "change:labelWidth change:metaWidth", this.render);
  },

  render: function() {

    dom.removeAllChilds(this.el);

    var width = 0;
    width += this.g.zoomer.getLeftBlockWidth();
    this.el.style.width = width + "px";

    if (this.g.vis.get("labels")) {
      this.el.appendChild(this.labelDOM());
    }

    if (this.g.vis.get("metacell")) {
      this.el.appendChild(this.metaDOM());
    }

    this.el.style.fontSize = this.g.zoomer.get("markerFontsize");
    return this;
  },

  labelDOM: function() {
    var labelHeader = k.mk("div");
    labelHeader.className = 'biojs_msa_header_label';
    labelHeader.style.width = this.g.zoomer.getLabelWidth();
    labelHeader.style.display = "inline-block";

    if (this.g.vis.get("labelCheckbox")) {
      labelHeader.appendChild(this.addEl(".", 10));
    }

    if (this.g.vis.get("labelId")) {
      var text = this.g.vis.get("labelIdText");
      labelHeader.appendChild(this.addEl(text, this.g.zoomer.get("labelIdLength")));
    }

    if (this.g.vis.get("labelPartition")) {
      labelHeader.appendChild(this.addEl("part", 15));
    }

    if (this.g.vis.get("labelName")) {
      var text = this.g.vis.get("labelNameText");
      var name = this.addEl(text, this.g.zoomer.get("labelNameLength"));
      //name.style.marginLeft = "50px"
      labelHeader.appendChild(name);
    }

    if (this.g.vis.get("customColumnsGetter")) {
      for(var idx = 0; idx < this.g.vis.get("customColumnsCount"); idx++) {
        const column = this.g.vis.get("customColumnsGetter")(idx) || {};
        const length = column.length || this.g.zoomer.get("customColumnsDefaultLength");
        var header = column.header;
        
        if (typeof header === 'function') {
          header = header();
        }

        if (!( header instanceof Element )) {
          header = this.addEl(header, length);
        } 
        labelHeader.appendChild(header);
      }
    }
    return labelHeader;
  },

  addEl: function(content, width) {
    var id = document.createElement("span");
    id.textContent = content;
    if ((typeof width !== "undefined" && width !== null)) {
      id.style.width = width + "px";
    }
    id.style.display = "inline-block";
    return id;
  },

  metaDOM: function() {
    var metaHeader = k.mk("div");
    metaHeader.style.width = this.g.zoomer.getMetaWidth();
    metaHeader.style.display = "inline-block";

    if (this.g.vis.get("metaGaps")) {
      metaHeader.appendChild(this.addEl("Gaps", this.g.zoomer.get('metaGapWidth')));
    }
    if (this.g.vis.get("metaIdentity")) {
      metaHeader.appendChild(this.addEl(this.g.vis.get("labelIdentity"), this.g.zoomer.get('metaIdentWidth')));
    }
    if (this.g.vis.get("metaLinks")) {
      metaHeader.appendChild(this.addEl("Links", this.g.zoomer.get('metaLinksWidth')));
    }
    if (this.g.vis.get("metaLinks")) {
      metaHeader.appendChild(this.addEl("Links", this.g.zoomer.get('metaLinksWidth')));
    }
    // if @.g.vis.get "metaLinks"
    //   metaHeader.appendChild @addEl("Links")

    return metaHeader;
  }
});
export default LabelHeader;
