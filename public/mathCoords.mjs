/**
 * 'unit' means '1'
 * @typedef {{unit: BigInt, xMin: BigInt, w: BigInt, yMin: BigInt, h: BigInt}} Coords
 */

const initUnit = 20000;
const initUnitN = BigInt(initUnit);

const initSize = 2.8;
const initXCenter = -.4;

export function initMathCoords(canvas) {
    const {width: canvasW, height: canvasH} = canvas.getBoundingClientRect();
    const canvasMinSide = Math.min(canvasW, canvasH);
    const canvasMaxSide = Math.max(canvasW, canvasH);

    const minSide = initSize;
    const maxSide = minSide * canvasMaxSide / canvasMinSide;
    const w = canvasW === canvasMinSide ? minSide : maxSide;
    const h = canvasH === canvasMinSide ? minSide : maxSide;

    const yMin = -h / 2;
    const xMin = initXCenter - w / 2;

   setMathCoords(canvas, {
       unit: initUnitN,
       xMin: BigInt(Math.round(initUnit * xMin)),
       w: BigInt(Math.round(initUnit * w)),
       yMin: BigInt(Math.round(initUnit * yMin)),
       h: BigInt(Math.round(initUnit * h)),
   });
}

/**
 * @return {Coords}
 */
export function getMathCoords(canvas) {
    return {
        unit: BigInt(canvas.dataset.mathUnit),
        xMin: BigInt(canvas.dataset.mathXMin),
        w: BigInt(canvas.dataset.mathW),
        yMin: BigInt(canvas.dataset.mathYMin),
        h: BigInt(canvas.dataset.mathH),
    };
}

/**
 * @param canvas {HTMLCanvasElement}
 * @param coords {Coords}
 */
export function setMathCoords(canvas, coords) {
    if (coords.w < initUnitN || coords.h < initUnitN) {
        coords = scaleCoords(coords)
    }

    canvas.dataset.mathUnit = String(coords.unit);
    canvas.dataset.mathXMin = String(coords.xMin);
    canvas.dataset.mathW = String(coords.w);
    canvas.dataset.mathYMin = String(coords.yMin);
    canvas.dataset.mathH = String(coords.h);
}

/**
 * @param coords {Coords}
 */
function scaleCoords(coords) {
    return {
        unit: coords.unit * initUnitN,
        xMin: coords.xMin * initUnitN,
        w: coords.w * initUnitN,
        yMin: coords.yMin * initUnitN,
        h: coords.h * initUnitN,
    };
}
