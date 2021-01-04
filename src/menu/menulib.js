const jbone = require("jbone");
const view = require("backbone-viewj");

// This could has been inlined from https://github.com/wilzbach/menu-builder
// It is intended to be replaced with in-MSA controls
// see https://github.com/wilzbach/msa/issues/149 for more details

const MenuBuilder = view.extend({
  initialize: function(opts) {
    this._nodes = [];
    this.name = opts.name || "";
    this.el.className += "smenubar";
  },
  render: function() {

    // remove all childs
    let fc = this.el.firstChild;
    while (fc) {
      this.el.removeChild(fc);
      fc = this.el.firstChild;
    }

    // replace child
    this.el.appendChild(this.buildDOM());
  },
  setName: function(name) {
    this.name = name;
  },
  addNode: function(label, callback, opts) {
    let style;
    if (opts != null) {
      style = opts.style;
    }
    if (this._nodes == null) {
      this._nodes = [];
    }
    this._nodes.push({
      label: label,
      callback: callback,
      style: style
    });
  },

  getNode: function(label) {
    let rNode;
    this._nodes.forEach(function(el) {
      if (el.label === label) {
        rNode = el;
      }
    });
    return rNode;
  },

  modifyNode: function(label, callback, opts) {
    let node = this.getNode(label);
    node.callback = callback || node.callback;
    opts = opts || {};
    node.style = opts.style || node.style;
  },

  renameNode: function(label, newLabel) {
    let node = this.getNode(label);
    node.label = newLabel || node.label;
  },

  removeNode: function(label) {
    let node = this.getNode(label);
    this._nodes.splice(this._nodes.indexOf(node), 1);
  },

  removeAllNodes: function() {
    this._nodes = [];
  },

  buildDOM: function() {
    let div = document.createElement("div");
    div.className = "dropdown";
    div.appendChild(this._buildM({
      nodes: this._nodes,
      name: this.name
    }));
    return div;
  },
  _buildM: function(data) {
    let displayedButton, frag, key, li, node, style, _ref;
    let nodes = data.nodes;
    let name = data.name;

    let menuUl = document.createElement("ul");
    menuUl.className = "dropdown-menu";
    menuUl.setAttribute('aria-labelledby', name.replace(/\s+/g, '')+"DropDown");
    menuUl.style.display = "none";

    // currently we support one-level
    for (let i = 0, _len = nodes.length; i < _len; i++) {
      node = nodes[i];
      li = document.createElement("li");
      li.className = "dropdown-item";
      li.textContent = node.label;
      _ref = node.style;
      for (key in _ref) {
        style = _ref[key];
        li.style[key] = style;
      }
      li.addEventListener("click", node.callback);
      this.trigger("new:node", li);
      menuUl.appendChild(li);
    }
    this.trigger("new:menu", menuUl);

    displayedButton = document.createElement("a");
    displayedButton.textContent = name;
    displayedButton.className = "btn btn-secondary dropdown-toggle";
    displayedButton.setAttribute('role', 'button');
    displayedButton.setAttribute('data-toggle', 'dropdown');
    displayedButton.id = name.replace(/\s+/g, '')+"DropDown";
    this.trigger("new:button", displayedButton);

    // HACK to be able to hide the submenu
    // listens globally for click events
    jbone(displayedButton).on("click", ((_this) => {
      return (e) => {
        _this._showMenu(e, menuUl, displayedButton);
        return window.setTimeout(() => {
          return jbone(document.body).one("click", (e) => {
            return menuUl.style.display = "none";
          });
        }, 5);
      };
    })(this));

    frag = document.createDocumentFragment();
    frag.appendChild(displayedButton);
    frag.appendChild(menuUl);
    return frag;
  },

  // internal method to display the lower menu on a click
  _showMenu: function(e, menu, target) {
    let rect;
    menu.style.display = "block";
    menu.style.position = "absolute";
    menu.className += " show";
    rect = target.getBoundingClientRect();
  }
});
export default MenuBuilder;
