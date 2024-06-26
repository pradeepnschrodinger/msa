var msa = window.msa;

yourDiv.textContent = "loading";

var opts = {};
opts.el = yourDiv;

const getCustomText = (id) => {
  return id + " custom";
}

const getDomElement = (text, width) => {
  const domEl = document.createElement("span")
  domEl.classList.add("custom-column");
  domEl.textContent = text;
  domEl.style.width = width + "px";
  domEl.style.display = "inline-block";
  return domEl;
}
const getStyledDiv = (id) => {
  const domEl = getDomElement("seq " + id, 90)
  domEl.style.backgroundColor = "red";
  return domEl;
}

const customColumns = [
  {
    header: 'Custom 1',
    length: 90,
    cell: getCustomText,
  }, 
  {
    header: getDomElement("Custom 2", 120),
    length: 120,
    cell: 50,
  },
  {
    header: 'Custom 3',
    length: 90,
    cell: getStyledDiv,
  }
]

const customColumnCalculator = (idx) => {
  return customColumns[idx];
};

opts.vis = {
  conserv: false,
  overviewbox: false,
  customColumnsGetter: customColumnCalculator,
  customColumnsCount: 3,
  labelNameText: "Seq Name"
};
opts.zoomer = {
  boxRectHeight: 1,
  boxRectWidth: 1,
  alignmentHeight: window.innerHeight * 0.8,
  labelFontsize: 12,
  labelIdLength: 50,
};
var m = msa(opts);

// the menu is independent to the MSA container
var menuOpts = {};
menuOpts.msa = m;
var defMenu = new msa.menu.defaultmenu(menuOpts);
m.addView("menu", defMenu);

m.seqs.reset(msa.utils.seqgen.getDummySequences(20, 20));
m.g.zoomer.set("alignmentWidth", "auto");
m.render();
renderMSA(msa.utils.seqgen.getDummySequences(20,20));

function renderMSA(seqs) {
  m.seqs.reset(seqs);
  m.g.zoomer.set("alignmentWidth", "auto");
  m.render();
}
