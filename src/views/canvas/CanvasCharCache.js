import { hdCanvas } from "../../utils/canvas";
import { get } from "lodash";

const Events = require("biojs-events");

class CanvasCharCache {

  constructor(g) {
    this.g = g;
    this.cache = {};
    this.cacheHeight = 0;
    this.cacheWidth = 0;
  }

  // returns a cached canvas
  getFontTile(letter, width, height, x, y) {
    // validate cache
    if (width !== this.cacheWidth || height !== this.cacheHeight) {
      this.cacheHeight = height;
      this.cacheWidth = width;
      this.cache = {};
    }

    const fontProps = this.getFontProperties(letter, x, y);
    const cacheKey = this.getCacheKey(letter, fontProps);    
    if (this.cache[cacheKey] === undefined) {
      this.createTile(letter, width, height, fontProps, cacheKey);
    }

    return this.cache[cacheKey];
  }

  getFontProperties(letter, x, y) {
    const residueFontGetter = this.g.zoomer.get("residueFontGetter");
    let font = this.g.zoomer.get("residueFont");
    let color = "black";
    if (residueFontGetter !== undefined) {
      const fontProps = residueFontGetter(letter, {x, y});
      font = get(fontProps, "font") || font;
      color = get(fontProps, "color") || color;
    }
    return {
      font,
      color
    }
  }

  getCacheKey(letter, fontProps) {
    const {font, color} = fontProps;
    return `${letter}-${font}-${color}`;
  }

  // creates a canvas with a single letter
  // (for the fast font cache)
  createTile(letter, width, height, fontProps, cacheKey) {
    const canvas = this.cache[cacheKey] = hdCanvas();
    this.ctx = canvas.getContext('2d');
    canvas.adjustSize({ height, width })
    this.ctx.font = fontProps.font;
    this.ctx.fillStyle = fontProps.color;
    const [xOffset, yOffset] = this.g.zoomer.get("residueFontOffset");

    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = "center";

    return this.ctx.fillText(letter, width / 2 + xOffset, height / 2 + yOffset, width);
  }
};
export default CanvasCharCache;
