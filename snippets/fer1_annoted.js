/* global yourDiv */

var clustal = msa.io.clustal;
var gffParser = msa.io.gff;
var xhr = msa.io.xhr;

// set your custom properties
// @see: https://github.com/wilzbach/msa/tree/master/src/g

var menuDiv = document.createElement('div');
var msaDiv = document.createElement('div');
yourDiv.appendChild(menuDiv);
yourDiv.appendChild(msaDiv);

var opts = {
  el: msaDiv
};
var url = "./data/fer1.clustal";

opts.conf = {
  url: url, // we tell the MSA viewer about the URL source
  dropImport: true
};
opts.vis = {
  conserv: false,
  overviewbox: false,
  seqlogo: false
};

// init msa
var m = msa(opts);

// download the sequences itself
clustal.read(url, function(err, seqs) {
  m.seqs.reset(seqs);
  m.render();
});

// add features
// xhr("./data/fer1.gff3", function(err, request, body) {
//   var features = gffParser.parseSeqs(body);
//   m.seqs.addFeatures(features);
//   m.render();
// });

// xhr("./data/fer1.gff_jalview", function(err, request, body) {
//   var features = gffParser.parseSeqs(body);
//   m.seqs.addFeatures(features);
//   m.render();
// });

// the menu is independent to the MSA container
var defMenu = new msa.menu.defaultmenu({
  el: menuDiv,
  msa: m
});
defMenu.render();

const features = {
  "config": {
      "type": "gff3"
  },
  "seqs": {
      "FER_CAPAN": [
          {
              "feature": "gene",
              "pinned": true,
              "start": 10,
              "end": 15,
              "attributes": {
                  "Name": "A feature",
                  "Color": "blue"
              }
          },
      ],
  }
}
m.seqs.addFeatures(features)
m.render();

// BioJS event system test (you can safely remove this in your app)
//instance=m.g
