/**
 * 'unit' means '1'
 * @typedef {{unit: BigInt, xMin: BigInt, w: BigInt, yMin: BigInt, h: BigInt}} Coords
 */

const initUnit = 4000n;

const initH = 3;

export function initMathCoords(canvas) {
    const r = canvas.getBoundingClientRect();

    const unit = initUnit;
    const h = BigInt(initH) * unit;
    const yMin = -h / 2n;
    const w = h * BigInt(Math.round(r.width)) / BigInt(Math.round(r.height));
    const xMin = -w / 2n;

   setMathCoords(canvas, {unit, xMin, w, yMin, h});
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
    if (coords.w < initUnit || coords.h < initUnit) {
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
        unit: coords.unit * initUnit,
        xMin: coords.xMin * initUnit,
        w: coords.w * initUnit,
        yMin: coords.yMin * initUnit,
        h: coords.h * initUnit,
    };
}
