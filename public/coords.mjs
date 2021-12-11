export const precision = 16;
export const intPrecision = 2;

/**
 * 'unit' means '1'
 * @typedef {{unit: BigInt, xMin: BigInt, w: BigInt, yMin: BigInt, h: BigInt}} Coords
 */

/**
 * @type {Map<HTMLCanvasElement, Coords>}
 */
const canvasToCoords = new Map();

const initialHeight = 3;

export function initMathCoords(canvas) {
    const r = canvas.getBoundingClientRect();

    const unit = 2n ** BigInt(precision);
    const h = unit * BigInt(initialHeight);
    const yMin = -h / 2n;
    const w = h * BigInt(Math.round(r.width)) / BigInt(Math.round(r.height));
    const xMin = -w / 2n;

    /**
     * @type {Coords}
     */
    const coords = {unit, xMin, w, yMin, h};
    canvasToCoords.set(canvas, coords);
}

/**
 * @return {Coords}
 */
export function getMathCoords(canvas) {
    return canvasToCoords.get(canvas);
}

/**
 * @param canvas {HTMLCanvasElement}
 * @param coords {Coords}
 */
export function setMathCoords(canvas, coords) {
    canvasToCoords.set(canvas, coords);
}
