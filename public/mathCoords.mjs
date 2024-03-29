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
    const m = /^(-?\d*[1-9])(0+)$/.exec(s);
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
    if (!(p?.toString())) {
        return undefined;
    }

    const unit = unwrapE(p.get('unit'));
    const xMin = p.get('xMin');
    const w = p.get('w');
    const yMin = p.get('yMin');
    const h = p.get('h');

    if (!unit || !xMin || !w || !yMin || !h) {
        return undefined;
    }

    try {
        return {
            unit: BigInt(unit),
            xMin: BigInt(xMin),
            w: BigInt(w),
            yMin: BigInt(yMin),
            h: BigInt(h),
        };
    } catch (e) {
        return undefined;
    }
}

function unwrapE(s) {
    if (!s) {
        return s;
    }
    const m = /^(-?\d+)e(\d+)/.exec(s);
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
    const newW = minBigNum(
        coords.unit * 50n,
        mulBigIntByNum(coords.w, 1 / zoomFactor),
    );

    const _zoomFactor = divToNum(coords.w, newW);
    const newH = mulBigIntByNum(coords.h, 1 / _zoomFactor);

    const newXMin = origin.x - mulBigIntByNum(newW, originFraction.x);
    const newYMin = origin.y - mulBigIntByNum(newH, originFraction.y);

    return {unit: coords.unit, xMin: newXMin, w: newW, yMin: newYMin, h: newH};
}

/**
 * @param canvas {HTMLCanvasElement}
 */
export function fitCoords(canvas) {
    const coords = getMathCoords(canvas);
    const {width, height} = canvas.getBoundingClientRect();

    const mathAspect = divToNum(coords.w, coords.h);
    const canvasAspect = width / height;

    if (canvasAspect > mathAspect) {
        const w = mulBigIntByNum(coords.w, canvasAspect / mathAspect);
        const xMin = coords.xMin - (w - coords.w) / 2n;
        setMathCoords(canvas, {...coords, xMin, w});
    } else if (canvasAspect < mathAspect) {
        const h = mulBigIntByNum(coords.h, mathAspect / canvasAspect);
        const yMin = coords.yMin - (h - coords.h) / 2n;
        setMathCoords(canvas, {...coords, yMin, h});
    }
}

function minBigNum(a, b) {
    return a < b ? a : b;
}
