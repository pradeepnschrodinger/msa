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
  getFontTile(code, width, height, x, y) {
    // validate cache
    if (width !== this.cacheWidth || height !== this.cacheHeight) {
      this.cacheHeight = height;
      this.cacheWidth = width;
      this.cache = {};
    }

    const fontProps = this.getFontProperties(code, x, y);
    const cacheKey = this.getCacheKey(code, fontProps);    
    if (this.cache[cacheKey] === undefined) {
      this.createTile(code, width, height, fontProps, cacheKey);
    }

    return this.cache[cacheKey];
  }

  getFontProperties(code, x, y) {
    const residueFontPropsGetter = this.g.zoomer.get("residueFontPropsGetter");
    let font = this.g.zoomer.get("residueFont");
    let color = "black";
    if (residueFontPropsGetter !== undefined) {
      const fontProps = residueFontPropsGetter(code, {x, y});
      font = get(fontProps, "font") || font;
      color = get(fontProps, "color") || color;
    }
    return {
      font,
      color
    }
  }

  getCacheKey(code, fontProps) {
    const {font, color} = fontProps;
    return `${code}-${font}-${color}`;
  }

  // creates a canvas with a residue code
  // (for the fast font cache)
  createTile(code, width, height, fontProps, cacheKey) {
    const canvas = this.cache[cacheKey] = hdCanvas();
    this.ctx = canvas.getContext('2d');
    canvas.adjustSize({ height, width })
    this.ctx.font = fontProps.font;
    this.ctx.fillStyle = fontProps.color;
    const [xOffset, yOffset] = this.g.zoomer.get("residueFontOffset");

    this.ctx.textBaseline = 'middle';
    
    const tileCenterX = width / 2 + xOffset;
    const tileCenterY = height / 2 + yOffset;

    if (code.length <= 6) {
      this.ctx.textAlign = 'center';
      return this.ctx.fillText(code, tileCenterX, tileCenterY, width);
    }
    
    const displayCode = code.slice(0, 6);
    const displayCodeWidth = this.ctx.measureText(displayCode).width;
    
    const startX = (width - displayCodeWidth) / 2;
    const startY = tileCenterY;
    this.ctx.fillText(displayCode.slice(0, 4), startX, startY);
    
    this.ctx.fillStyle = "#333333";
    const offsetX1 = startX + this.ctx.measureText(displayCode.slice(0, 4)).width;
    this.ctx.fillText(displayCode[4], offsetX1, startY);

    this.ctx.fillStyle = "#555555";
    this.ctx.font = `italic ${fontProps.font}`;
    const offsetX2 = offsetX1 + this.ctx.measureText(displayCode[4]).width;
    return this.ctx.fillText(displayCode[5], offsetX2, startY);
  }
};
export default CanvasCharCache;
