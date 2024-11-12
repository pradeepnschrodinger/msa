
// NOTE (pradeep): Basic canvas that renders contents at a higher resolution for clarity
const hdCanvas = (opts = {}) => {
  const height = opts.height || 100
  const width = opts.width || 100

  const canvas = document.createElement("canvas");
  canvas.adjustSize = adjustSize;
  canvas.adjustSize({ height, width })

  return canvas;
}

const adjustSize = function ({ height, width }) {
  // TODO (pradeep): Use devicepixelratio here?
  const sharpnessFactor = 2;

  this.setAttribute('height', height * sharpnessFactor + "px");
  this.style.height = height + "px";
  this.setAttribute('width', width * sharpnessFactor + "px");
  this.style.width = width + "px";
  this.getContext('2d').scale(sharpnessFactor, sharpnessFactor);
};

const emulatedScrollableCanvas = () => {
  const canvas = hdCanvas()
  const innerDiv = document.createElement("div")
  const outerDiv = document.createElement("div")

  // Nest canvas inside innerDiv
  innerDiv.appendChild(canvas);

  // Nest innerDiv inside outerDiv
  outerDiv.appendChild(innerDiv);

  return {
    outerDiv,
    innerDiv,
    canvas
  };
}

export { hdCanvas, emulatedScrollableCanvas }
