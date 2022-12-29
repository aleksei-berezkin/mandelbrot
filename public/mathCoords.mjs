/**
 * 'unit' means '1'
 * @typedef {{unit: BigInt, xMin: BigInt, w: BigInt, yMin: BigInt, h: BigInt}} Coords
 */
import { divToNum, mulBigIntByNum } from './bigIntArithHelper.mjs';

const initUnit = 20000;
const initUnitN = BigInt(initUnit);

const initSize = 2.8;
const initXCenter = -.45;

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
 * @param canvas {HTMLCanvasElement}
 * @param coords {Coords}
 */
export function inputMathCoords(canvas, coords) {
    const {width: canvasW, height: canvasH} = canvas.getBoundingClientRect();

    const inputAspect = divToNum(coords.w, coords.h);
    const ourAspect = canvasW / canvasH;

    if (ourAspect === inputAspect) {
        setMathCoords(canvas, coords);
    } else if (ourAspect > inputAspect) {
        const w = mulBigIntByNum(coords.w, ourAspect / inputAspect);
        const xMin = coords.xMin - (w - coords.w) / 2n;
        setMathCoords(canvas, {...coords, xMin, w});
    } else {
        const h = mulBigIntByNum(coords.h, inputAspect / ourAspect);
        const yMin = coords.yMin - (h - coords.h) / 2n;
        setMathCoords(canvas, {...coords, yMin, h});
    }
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
        coords = scaleUnit(coords)
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
function scaleUnit(coords) {
    return {
        unit: coords.unit * initUnitN,
        xMin: coords.xMin * initUnitN,
        w: coords.w * initUnitN,
        yMin: coords.yMin * initUnitN,
        h: coords.h * initUnitN,
    };
}

/**
 * @param coords {Coords}
 * @return {string}
 */
export function mathCoordsToQuery(coords) {
    return `unit=${fmtWithE(coords.unit)}&xMin=${coords.xMin}&w=${coords.w}&yMin=${coords.yMin}&h=${coords.h}`;
}

function fmtWithE(n) {
    const s = String(n);
    const m = /^([-1-9]+)(0+)$/.exec(s);
    if (!m) {
        return s;
    }
    return `${m[1]}e${m[2].length}`;
}

/**
 * @return {Coords}
 */
export function parseMathCoordsFromLocation() {
    const p = new URL(window.location.href).searchParams;
    const unitStr = p.get('unit');
    if (!unitStr) {
        return undefined;
    }
    return {
        unit: BigInt(unwrapE(unitStr)),
        xMin: BigInt(p.get('xMin')),
        w: BigInt(p.get('w')),
        yMin: BigInt(p.get('yMin')),
        h: BigInt(p.get('h')),
    };
}

function unwrapE(s) {
    if (!s) {
        return s;
    }
    const m = /^([-1-9]+)e(\d+)/.exec(s);
    if (!m) {
        return s;
    }
    return `${m[1]}${Array.from({length: Number(m[2])}).map(() => '0').join('')}`;
}

/**
 * @param coords {Coords}
 * @param deltaFraction {{x: number, y: number}} {0, 0} is bottom-left
 * @return {Coords}
 */
export function moveCoords(coords, deltaFraction) {
    const xMin = coords.xMin - mulBigIntByNum(coords.w, deltaFraction.x);
    const yMin = coords.yMin - mulBigIntByNum(coords.h, deltaFraction.y);
    return {...coords, xMin, yMin};
}

/**
 * @param coords {Coords}
 * @param originFraction {{x: number, y: number}} {0, 0} is bottom-left
 * @param zoomFactor {number}
 * @return {Coords}
 */
export function zoomCoords(coords, originFraction, zoomFactor) {
    const origin = {
        x: coords.xMin + mulBigIntByNum(coords.w, originFraction.x),
        y: coords.yMin + mulBigIntByNum(coords.h, originFraction.y),
    };

    // zoom preserving origin:
    // newXMin + newW * originFraction.x = origin.x
    // newYMin + newH * originFraction.y = origin.y
    const newW = mulBigIntByNum(coords.w, 1 / zoomFactor);
    const newH = mulBigIntByNum(coords.h, 1 / zoomFactor);
    const newXMin = origin.x - mulBigIntByNum(newW, originFraction.x);
    const newYMin = origin.y - mulBigIntByNum(newH, originFraction.y);

    return {unit: coords.unit, xMin: newXMin, w: newW, yMin: newYMin, h: newH};
}
