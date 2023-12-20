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
  dropImport: true,
  registerMouseHover: true,
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
xhr("./data/fer1.gff3", function(err, request, body) {
  var features = gffParser.parseSeqs(body);
  m.seqs.addFeatures(features);
  m.render();
});

xhr("./data/fer1.gff_jalview", function(err, request, body) {
  var features = gffParser.parseSeqs(body);
  m.seqs.addFeatures(features);
  m.render();
});

// the menu is independent to the MSA container
var defMenu = new msa.menu.defaultmenu({
  el: menuDiv,
  msa: m
});
defMenu.render();

// pin features
const pinnedFeatures = [
  {
      "feature": "gene",
      "start": 0,
      "end": 100,
      "attributes": {
          "Name": "VH",
          "Color": "#E5FCDD",
          "textColor": "#71B567",
        }
      },
      {
        "feature": "gene",
        "start": 0,
        "end": 20,
        "row": 1,
        "attributes": {
          "Name": "HFR1",
          "Color": "#E5FCDD",
          "textColor": "#71B567",
    }
  },
  {
    "feature": "gene",
    "start": 21,
    "end": 30,
    "row": 1,
    "attributes": {
        "Name": "H1",
        "Color": "#E5FCDD",
        "textColor": "#71B567",
    }
  },
  {
    "feature": "gene",
    "start": 36,
    "end": 40,
    "row": 1,
    "attributes": {
        "Name": "HFR2",
        "Color": "#E5FCDD",
        "textColor": "#71B567",
    }
  },
];
m.pinnedFeatures.reset(pinnedFeatures)
m.render();

m.g.on("residue:hover", function(data){ console.log('residue:hover', data) });

// BioJS event system test (you can safely remove this in your app)
//instance=m.g
