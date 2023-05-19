const view = require("backbone-viewj");
const dom = require("dom-helper");

const LabelView = view.extend({

  initialize: function(data) {
    this.seq = data.seq;
    this.g = data.g;

    return this.manageEvents();
  },

  manageEvents: function() {
    var events = {};
    if (this.g.config.get("registerMouseClicks")) {
      events.click = "_onclick";
    }
    if (this.g.config.get("registerMouseHover")) {
      events.mousein = "_onmousein";
      events.mouseout = "_onmouseout";
    }
    this.delegateEvents(events);
    this.listenTo(this.g.config, "change:registerMouseHover", this.manageEvents);
    this.listenTo(this.g.config, "change:registerMouseClick", this.manageEvents);
    this.listenTo(this.g.vis, "change:labelName change:labelId change:labelPartition change:labelCheckbox change:customColumnsGetter change:customColumnsCount", this.render);
    this.listenTo( this.g.zoomer, "change:labelIdLength change:labelNameLength change:labelPartLength change:labelCheckLength", this.render
    );
    return this.listenTo( this.g.zoomer, "change:labelFontSize change:labelLineHeight change:labelWidth change:rowHeight", this.render
    );
  },

  render: function() {
    dom.removeAllChilds(this.el);

    // TODO (pradeep): Width doesn't work here, but min-width does.
    this.el.style['min-width'] = `${this.g.zoomer.getLabelWidth()}px`;

    //@el.style.height = "#{@g.zoomer.get "rowHeight"}px"
    this.el.setAttribute("class", "biojs_msa_labels");

    if (this.g.vis.get("labelCheckbox")) {
      var checkBox = document.createElement("input");
      checkBox.setAttribute("type", "checkbox");
      checkBox.value = this.model.get('id');
      checkBox.name = "seq";
      checkBox.style.width= this.g.zoomer.get("labelCheckLength") + "px";
      this.el.appendChild(checkBox);
    }

    if (this.g.vis.get("labelId")) {
      var id = document.createElement("span");
      var val  = this.model.get("id");
      if (!isNaN(val)) {
        val++;
      }
      id.textContent = val;
      id.style.width = this.g.zoomer.get("labelIdLength") + "px";
      id.style.display = "inline-block";
      this.el.appendChild(id);
      this.el.setAttribute("title", val)
    }

    if (this.g.vis.get("labelPartition")) {
      var part = document.createElement("span");
      part.style.width= this.g.zoomer.get("labelPartLength") + "px";
      const textContent = this.model.get("partition");
      part.textContent = textContent;
      part.style.display = "inline-block";
      this.el.appendChild(id);
      this.el.appendChild(part);
      this.el.setAttribute("title", textContent)
    }

    if (this.g.vis.get("labelName")) {
      var name = document.createElement("span");
      const textContent = this.model.get("name");
      name.textContent = textContent;
      if (this.model.get("ref") && this.g.config.get("hasRef")) {
        name.style.fontWeight = "bold";
      }
      name.style.width= this.g.zoomer.get("labelNameLength") + "px";
      this.el.appendChild(name);
      this.el.setAttribute("title", textContent)
    }

    if (this.g.vis.get("customColumnsGetter")) {
      for (var idx = 0; idx < this.g.vis.get("customColumnsCount"); idx++) {
        const column = this.g.vis.get("customColumnsGetter")(idx);
        const cell = column.cell;
        var val;

        if ( cell instanceof Element || cell instanceof HTMLDocument) {
          this.el.appendChild(cell);
          continue;
        }
        else {
          var customValue = document.createElement("span");
          var val;
          if ( typeof cell === 'function' ) {
            val = cell(this.model.get("id"), this.model.get("seq"));
            if (val instanceof Element || val instanceof HTMLDocument) {
              this.el.appendChild(val);
              continue;
            } 
          }
          else {
            val = cell;
          }
          customValue.textContent = val;
          customValue.style.width = (column.length || 50) + "px";
          customValue.style.display = "inline-block";
          this.el.appendChild(customValue);
        }
      }
    }
    this.el.style.overflow = scroll;
    this.el.style.fontSize = `${this.g.zoomer.get('labelFontsize')}px`;
    return this;
  },

  _onclick: function(evt) {
    var seqId = this.model.get("id");
    return this.g.trigger("row:click", {seqId:seqId, evt:evt});
  },

  _onmousein: function(evt) {
    var seqId = this.model.get("id");
    return this.g.trigger("row:mouseout", {seqId:seqId, evt:evt});
  },

  _onmouseout: function(evt) {
    var seqId = this.model.get("id");
    return this.g.trigger("row:mouseout", {seqId:seqId, evt:evt});
  }
});

export default LabelView;
