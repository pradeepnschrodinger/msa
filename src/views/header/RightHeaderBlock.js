const boneView = require("backbone-childs");

import MarkerView from "./MarkerView";
import ConservationView from "./ConservationView";
import SeqLogoWrapper from "./SeqLogoWrapper";
import GapView from "./GapView";
import PinnedBlock from "../canvas/CanvasPinnedBlock";
import ScrollBody from "../../utils/scroll";

const View = boneView.extend({

  initialize: function(data) {
    this.g = data.g;
    this.blockEvents = false;

    this.listenTo(this.g.vis,"change:header", function() {
      this.draw();
      return this.render();
    });
    this.listenTo(this.g.vis,"change", this._setSpacer);
    this.listenTo(this.g.zoomer,"change:alignmentWidth", this._setWidth);

    // TODO: duplicate rendering
    this.listenTo(this.g.columns, "change:hidden", function() {
      this.draw();
      return this.render();
    });

    new ScrollBody(this.g, this, this._adjustScrollingLeft);

    // collection view for all the headers
    this.addView("headers", new (boneView.extend({
      className: 'biojs_msa_rheaders',
      events: { 
        "scroll": () => this._sendScrollEvent(),
      },
    })));

    const pinnedBlock = new PinnedBlock({
      model: this.g.pinnedFeatures,
      g: this.g,
    });
    // NOTE (pradeep): Hacky! Required for pinning the block
    pinnedBlock.el.style.position = 'absolute';
    pinnedBlock.el.style.bottom = 0;

    this.addView("pinnedSeqBlock", pinnedBlock);

    this.draw();

    return this.g.vis.once('change:loaded', this._adjustScrollingLeft, this);
  },

  draw: function() {
    const headerView = this.getView('headers');
    headerView.removeViews();

    if (this.g.vis.get("conserv")) {
      var conserv = new ConservationView({model: this.model, g: this.g});
      conserv.ordering = -20;
      headerView.addView("conserv",conserv);
    }

    if (this.g.vis.get("markers")) {
      var marker = new MarkerView({model: this.model, g: this.g});
      marker.ordering = -10;
      headerView.addView("marker",marker);
    }

    if (this.g.vis.get("seqlogo")) {
      var seqlogo = new SeqLogoWrapper({model: this.model, g: this.g});
      seqlogo.ordering = -30;
      headerView.addView("seqlogo",seqlogo);
    }

    if (this.g.vis.get("gapHeader")) {
      var gapview = new GapView({model: this.model, g: this.g});
      gapview.ordering = -25;
      return headerView.addView("gapview",gapview);
    }
  },

  render: function() {
    this.renderSubviews();
    this.getView('headers').renderSubviews();

    this._setSpacer();

    this.el.className = "biojs_msa_rheader";
    //@el.style.height = @g.zoomer.get("markerHeight") + "px"
    this._setWidth();
    this._adjustScrollingLeft();
    return this;
  },

  // scrollLeft triggers a reflow of the whole area (even only get)
  _sendScrollEvent: function() {
    if (!this.blockEvents) {
      this.g.zoomer.set("_alignmentScrollLeft", this.getView('headers').el.scrollLeft, {origin: "header"});
    }
    return this.blockEvents = false;
  },

  _adjustScrollingLeft: function(model,value,options) {
    if ((!(((typeof options !== "undefined" && options !== null) ? options.origin : undefined) != null)) || options.origin !== "header") {
      var scrollLeft = this.g.zoomer.get("_alignmentScrollLeft");
      this.blockEvents = true;
      this.getView('headers').el.scrollLeft = scrollLeft;
    }
  },

  _setSpacer: function() {
    // spacer / padding element
    return this.el.style.marginLeft = this._getLabelWidth() + "px";
  },

  _getLabelWidth: function() {
    var paddingLeft = 0;
    if (!this.g.vis.get("leftHeader")) {
      paddingLeft += this.g.zoomer.getLeftBlockWidth();
    }
    return paddingLeft;
  },

  _setWidth: function() {
    return this.el.style.width = this.g.zoomer.getAlignmentWidth() + "px";
  }
});
export default View;
