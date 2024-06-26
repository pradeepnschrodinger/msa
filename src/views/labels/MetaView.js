const view = require("backbone-viewj");
const dom = require("dom-helper");
import {seqs as st} from "bio.io";
import MenuBuilder from "../../menu/menubuilder";
import {reduce} from "lodash";

const MetaView = view.extend({

  className: "biojs_msa_metaview",

  initialize: function(data) {
    this.g = data.g;
    this.listenTo(this.g.vis, "change:metacell", this.render);
    return this.listenTo(this.g.zoomer, "change:metaWidth", this.render);
  },

  events:
    {click: "_onclick",
    mousein: "_onmousein",
    mouseout: "_onmouseout"
    },

  render: function() {
    dom.removeAllChilds(this.el);

    this.el.style.display = "inline-flex";

    var width = this.g.zoomer.getMetaWidth();
    this.el.style.width = width - 10;
    this.el.style.paddingRight = 5;
    this.el.style.paddingLeft = 5;
    // TODO: why do we need to decrease the font size?
    // otherwise we see a scrollbar
    this.el.style.fontSize = `${this.g.zoomer.get('labelFontsize') - 2}px`;

    if (this.g.vis.get("metaGaps")) {
      // adds gaps
      var seq = this.model.get('seq');
      var gaps = [...seq].reduce((memo, c) => c === '-' ? ++memo : memo, 0);
      // 2-place percentage , e.g. 42%
      gaps = (gaps * 100 / seq.length).toFixed(0) + "%";

      // append gap count
      var gapSpan = document.createElement('span');
      gapSpan.textContent = gaps;
      gapSpan.style.display = "inline-block";
      gapSpan.style.width = 35;
      this.el.appendChild(gapSpan);
    }


    if (this.g.vis.get("metaIdentity")) {
      const modelIndex = this.model.collection.indexOf(this.model);
      var ident = this.g.stats.identity()[modelIndex];
      var identSpan = document.createElement('span');
      identSpan.classList.add('meta_identity_value');

      if (this.model.get("ref") && this.g.config.get("hasRef")) {
        identSpan.textContent = "ref.";
      } else if ((typeof ident !== "undefined" && ident !== null)) {
        identSpan.textContent = ident.toFixed(2);
      }

      identSpan.style.display = "inline-block";
      identSpan.style.width = 40;
      this.el.appendChild(identSpan);
    }

    if (this.g.vis.get("metaLinks")) {
      // TODO: this menu builder is just an example how one could customize this
      // view
      if (this.model.attributes.ids) {
        var links = st.buildLinks(this.model.attributes.ids);
        if (Object.keys(links).length > 0) {
          var menu = new MenuBuilder({name: "↗", dropdownClassName: 'dropdown-metalink' });
          console.log(Object.keys(links));
          Object.entries(links).forEach(function(val, key) {
            return menu.addNode(key,function(e) {
              return window.open(val);
            });
          });

          var linkEl = menu.buildDOM();
          linkEl.style.cursor = "pointer";

          var metaLinksSpan = document.createElement('span');
          metaLinksSpan.style.display = "inline-block";
          metaLinksSpan.style.width = 25;
          metaLinksSpan.appendChild(linkEl);
          
          return this.el.appendChild(metaLinksSpan);
        }
      }
    }
  },


    //@el.style.height = "#{@g.zoomer.get "rowHeight"}px"

  _onclick: function(evt) {
    return this.g.trigger("meta:click", {seqId: this.model.get("id", {evt:evt})});
  },

  _onmousein: function(evt) {
    return this.g.trigger("meta:mousein", {seqId: this.model.get("id", {evt:evt})});
  },

  _onmouseout: function(evt) {
    return this.g.trigger("meta:mouseout", {seqId: this.model.get("id", {evt:evt})});
  }
});
export default MetaView;
