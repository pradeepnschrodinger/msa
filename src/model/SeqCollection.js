import Sequence from "./Sequence";
import FeatureCol from "./FeatureCol";
const Collection = require("backbone-thin").Collection;

const SeqCollection = Collection.extend({
  model: Sequence,

  constructor: function(seqs, g) {
    Collection.apply(this, arguments);
    this.g = g;

    this.on( "add reset remove", (() => {
      // invalidate cache
      this.lengthCache = null;
      return this._bindSeqsWithFeatures();
    }), this
    );

    // use the first seq as reference as default
    this.on("reset", () => {
      return this._autoSetRefSeq();
    });
    this._autoSetRefSeq();

    this.lengthCache = null;

    this.features = {};
    return this;
  },

  // gives the max length of all sequences
  // (cached)
  getMaxLength: function() {
    if (this.models.length === 0) { return 0; }
    if (this.lengthCache === null) {
      this.lengthCache = this.max(function(seq) { return seq.get("seq").length; }).get("seq").length;
    }
    return this.lengthCache;
  },

  // gets the previous model
  // @param endless [boolean] for the first element
  // true: returns the last element, false: returns undefined
  prev: function(model, endless) {
    let index = this.indexOf(model) - 1;
    if (index < 0) { 
      if (endless) { index = this.length - 1; }
      else { return null; }
    }
    return this.at(index);
  },

  // gets the next model
  // @param endless [boolean] for the last element
  // true: returns the first element, false: returns undefined
  next: function(model, endless) {
    let index = this.indexOf(model) + 1;
    if (index === this.length ) { 
      if (endless) { index = 0; }
      else { return null; }
    }
    return this.at(index);
  },

  // @returns n [int] number of hidden columns until n
  calcHiddenSeqs: function(n) {
    let nNew = n;
    for (let i = 0; 0 < nNew ? i <= nNew : i >= nNew; 0 < nNew ? i++ : i--) {
      if (this.at(i).get("hidden")) {
        nNew++;
      }
    }
    return nNew - n;
  },

  // you can add features independent to the current seqs as they may be added
  // later (lagging connection)
  // sequence - feature binding is based on id
  addFeatures: function(features) {
    if ((features.config != null)) {
      const obj = features;
      features = features.seqs;
      if ((obj.config.colors != null)) {
        const colors = obj.config.colors;
        _.each(features, function(seq) {
          return _.each(seq, function(val) {
            if ((colors[val.feature] != null)) {
              return val.fillColor = colors[val.feature];
            }
          });
        });
      }
    }
    // we might already have features
    if (_.isEmpty(this.features)) {
      // replace (no existent features)
      this.features = features;
    } else {
      // merge
      _.each(features, (val, key) => {
        if (!this.features.hasOwnProperty(key)) {
          return this.features[key] = val;
        } else {
          return this.features[key] = _.union(this.features[key], val);
        }
      });
    }
    // rehash
    return this._bindSeqsWithFeatures();
  },

  // adds features to a sequence
  // does it silenty without triggering an event
  _bindSeqWithFeatures: function(seq) {
    // TODO: probably we don't always want to bind to name
    var features = this.features[seq.attributes.name];
    if (features) {
      // do silently to avoid triggering to many events
      seq.attributes.features = new FeatureCol(features);
      seq.attributes.features.assignRows();
      seq.attributes.height = seq.attributes.features.getCurrentHeight() + 1;
    }
  },

  // rehash the sequence feature binding
  _bindSeqsWithFeatures: function() {
    return this.each((seq) =>  this._bindSeqWithFeatures(seq));
  },

  // removes all features from the cache (not from the seqs)
  removeAllFeatures: function() {
    return delete this.features;
  },

  _autoSetRefSeq: function() {
    if (this.length > 0) {
      return this.at(0).set("ref", true);
    }
  },

  // sets a sequence (e.g. BLAST start or consensus seq) as reference
  setRef: function(seq) {
    const obj = this.get(seq);
    this.each(function(s) {
      if (seq.cid) {
        if (obj.cid === s.cid) {
          return s.set("ref", true);
        } else {
          return s.set("ref", false);
        }
      }
    });

    this.g.config.set("hasRef", true);
    return this.trigger("change:reference", seq);
  }
});
export default SeqCollection;
