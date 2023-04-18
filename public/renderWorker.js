// Firefox still doesn't support modules workers
// https://bugzilla.mozilla.org/show_bug.cgi?id=1247687
// https://github.com/mdn/content/issues/24402

const bigIntToBigNumPromise = (async () => {
    const text = await (await fetch('bigIntToBigNum.mjs')).text();
    eval(text.replace('export', ''));
    // noinspection JSUnresolvedVariable
    return bigIntToBigNum;
})()

const isBigNumPromise = (async () => {
    const text = await (await fetch('isBigNum.mjs')).text();
    eval(text.replace('export', ''));
    // noinspection JSUnresolvedVariable
    return isBigNum;
})()

async function messageHandler(message) {
    const {renderTaskId, workerCallId, commandName, data} = message.data;
    let resultData;
    if (commandName === 'renderMain') {
        const {coords, canvasCoords, maxIterations} = data;
        resultData = await renderMain(renderTaskId, coords, canvasCoords, maxIterations);
    } else if (commandName === 'mapToRgba') {
        const {velocity, minIterCount, colorsRangeVal, hueRangeVal} = data;
        resultData = mapToRgba(renderTaskId, velocity, minIterCount, colorsRangeVal, hueRangeVal);
    }
    self.postMessage({workerCallId, data: resultData});
}

self.onmessage = messageHandler

/**
 * @type {undefined | number}
 */
let lastRenderTaskId = undefined;
/**
 * @type {{coords: Coords, canvasCoords: CanvasCoords, iterNums: Uint32Array, maxIterations: number}[]}
 */
const lastResults = []

/**
 * @param renderTaskId {number}
 * @param coords {Coords}
 * @param canvasCoords {CanvasCoords}
 * @param maxIterations {number}
 */
async function renderMain(renderTaskId, coords, canvasCoords, maxIterations) {
    if (lastRenderTaskId == null) {
        lastRenderTaskId = renderTaskId;
    } else {
        if (renderTaskId < lastRenderTaskId) {
            return;
        }
        if (renderTaskId > lastRenderTaskId) {
            lastRenderTaskId = renderTaskId;
            lastResults.length = 0;
        }
    }

    try {
        const iterNums = await doRenderMain(coords, canvasCoords.w, canvasCoords.h, maxIterations);
        lastResults.push({coords, canvasCoords, iterNums, maxIterations});
        return {
            velocity: measureVelocity(iterNums, canvasCoords, maxIterations),
            minIterCount: getMinIterCount(iterNums, canvasCoords),
        };
    } catch (e) {
        if (e instanceof WebAssembly.CompileError) {
            return e.toString();
        } else {
            throw e;
        }
    }
}

function mapToRgba(renderTaskId, velocity, minIterCount, colorsRangeVal, hueRangeVal) {
    if (lastRenderTaskId !== renderTaskId) {
        return;
    }

    const rgbaParts = lastResults.map(({iterNums, canvasCoords, maxIterations}) => ({
        canvasCoords,
        rgba: doMapToRgba(iterNums, canvasCoords, maxIterations, velocity, minIterCount, colorsRangeVal, hueRangeVal),
    }));

    lastRenderTaskId = undefined;
    lastResults.length = 0;

    return {rgbaParts};
}

/**
 * @type {{
 * memory: Memory,
 * renderMandelbrot: Function,
 * isBigNum: WebAssembly.Global,
 * canvasW: WebAssembly.Global,
 * canvasH: WebAssembly.Global,
 * maxIterations: WebAssembly.Global,
 * xMin: WebAssembly.Global,
 * w: WebAssembly.Global,
 * yMin: WebAssembly.Global,
 * h: WebAssembly.Global,
 * precision: WebAssembly.Global,
 * fracPrecision: WebAssembly.Global,
 * }}
 */
let wasmExports;

/**
 * @param coords {Coords}
 * @param canvasW {number}
 * @param canvasH {number}
 * @param maxIterations {number}
 * @return {Uint32Array}
 */
async function doRenderMain(coords, canvasW, canvasH, maxIterations) {
    const outByteSize = 4 * canvasW * canvasH;

    const isBigNum = (await isBigNumPromise)(coords.w, coords.unit);
    const bigIntToBigNum = await bigIntToBigNumPromise;
    const wBigNum = isBigNum
        ? bigIntToBigNum(coords.w, coords.unit)
        : undefined;
    const precision = wBigNum?.length;

    const requiredMemoryBytes = outByteSize;

    if (!wasmExports || wasmExports.memory.buffer.byteLength < requiredMemoryBytes) {
        wasmExports = await instantiate(requiredMemoryBytes);
    }

    const u32Buf = new Uint32Array(wasmExports.memory.buffer);
    u32Buf.fill(0);

    wasmExports.isBigNum.value = isBigNum;
    wasmExports.canvasW.value = canvasW;
    wasmExports.canvasH.value = canvasH;
    wasmExports.maxIterations.value = maxIterations;

    if (isBigNum) {
        const fracPrecision = precision - 1;
        wasmExports.precision.value = precision;
        wasmExports.fracPrecision.value = fracPrecision;
        const xMinBigNum = bigIntToBigNum(coords.xMin, coords.unit, fracPrecision);
        const yMinBigNum = bigIntToBigNum(coords.yMin, coords.unit, fracPrecision);
        const hBigNum = bigIntToBigNum(coords.h, coords.unit, fracPrecision);

        for (let i = 0; i < precision; i++) {
            wasmExports[`xMin${i}`].value = BigInt(xMinBigNum[i]);
            wasmExports[`w${i}`].value = BigInt(wBigNum[i]);
            wasmExports[`yMin${i}`].value = BigInt(yMinBigNum[i]);
            wasmExports[`h${i}`].value = BigInt(hBigNum[i]);
        }
    } else {
        const unit = Number(coords.unit);
        wasmExports.xMin.value = Number(coords.xMin) / unit;
        wasmExports.w.value = Number(coords.w) / unit;
        wasmExports.yMin.value = Number(coords.yMin) / unit;
        wasmExports.h.value = Number(coords.h) / unit;

    }

    wasmExports.renderMandelbrot();

    return new Uint32Array(u32Buf);
}

/**
 * @param requiredMemBytes {number}
 * @return {Promise<*>}
 */
async function instantiate(requiredMemBytes) {
    const requiredPages = ((requiredMemBytes & ~0xffff) >>> 16) + ((requiredMemBytes & 0xffff) ? 1 : 0);
    const memory = new WebAssembly.Memory(
        {initial: requiredPages}
    );

    const instObj = await WebAssembly.instantiateStreaming(
        fetch('wasm/release.wasm'),
        {
            env: {memory}
        },
    );
    return instObj.instance.exports;
}

/**
 * @param iterArray {Uint32Array}
 * @param canvasCoords {CanvasCoords}
 * @param maxIterations {number}
 * @return {number}
 */
function measureVelocity(iterArray, canvasCoords, maxIterations) {
    let velocity = 0;

    for (const series of [...iterateRows(iterArray, canvasCoords), ...iterateCols(iterArray, canvasCoords)]) {
        let prevIterNum = undefined;
        for (const currIterNum of series) {
            if (prevIterNum != null) {
                if (currIterNum !== prevIterNum && (currIterNum === maxIterations || prevIterNum === maxIterations)) {
                    velocity += Math.min(currIterNum, prevIterNum) / 2;
                } else {
                    velocity += Math.abs(currIterNum - prevIterNum);
                }
            }
            prevIterNum = currIterNum;
        }
        prevIterNum = undefined;
    }

    return velocity;
}

function* iterateRows(iterArray, canvasCoords) {
    for (let row= 0; row < canvasCoords.h; row++) {
        // noinspection JSMismatchedCollectionQueryUpdate
        const series = [];
        for (let col = 0; col < canvasCoords.w; col++) {
            series.push(iterArray[row * canvasCoords.w + col]);
        }
        yield series;
    }
}

function* iterateCols(iterArray, canvasCoords) {
    for (let col = 0; col < canvasCoords.w; col++) {
        // noinspection JSMismatchedCollectionQueryUpdate
        const series = [];
        for (let row= 0; row < canvasCoords.h; row++) {
            series.push(iterArray[row * canvasCoords.w + col]);
        }
        yield series;
    }
}

/**
 * @param iterArray {Uint32Array}
 * @param canvasCoords {CanvasCoords}
 * @return {number}
 */
function getMinIterCount(iterArray, canvasCoords) {
    let min = iterArray[0];
    for (let i = 1; i < canvasCoords.w * canvasCoords.h; i++) {
        min = Math.min(min, iterArray[i]);
    }
    return min;
}

const baseVelocity = 10.32;
const baseHuePeriod = 119;
const lightnessPeriodToHuePeriod = .183
const hueOffset = 245;

/**
 * @type {Map<number, [number, number, number]>}
 */
const colorCache = new Map();

let iterCountDivisorInCache = undefined;

/**
 * @param iterArray {Uint32Array}
 * @param canvasCoords {CanvasCoords}
 * @param maxIterations {number}
 * @param velocity {number}
 * @param minIterCount {number}
 * @param colorsRangeVal {number}
 * @param hueRangeVal {number}
 */
function doMapToRgba(iterArray, canvasCoords, maxIterations, velocity, minIterCount, colorsRangeVal, hueRangeVal) {
    const _baseHuePeriod = baseHuePeriod * Math.pow(20, 1 - colorsRangeVal / 50);
    const huePeriod = velocity > baseVelocity
        ? _baseHuePeriod * Math.pow(1 + .07 * (velocity - baseVelocity), .9)
        : _baseHuePeriod;

    if (huePeriod !== iterCountDivisorInCache) {
        colorCache.clear();
    }

    const lightnessPeriod = huePeriod * lightnessPeriodToHuePeriod;

    const userHueOffset = (hueRangeVal / 50 - 1) * 180;
    const {w, h} = canvasCoords;
    const rgba = new Uint8ClampedArray(4 * w * h);
    for (let i = 0; i < w * h; i++) {
        const iterCount = iterArray[i];
        const arrOffset = i * 4;
        if (iterCount < maxIterations) {
            let r, g, b;
            if (colorCache.has(iterCount)) {
                [r, g, b] = colorCache.get(iterCount);
            } else {
                const hue = (hueOffset + userHueOffset + (minIterCount / baseHuePeriod + (iterCount - minIterCount) / huePeriod) * 360) % 360;
                // .5 +- .2
                const lightness = .5 + Math.sin(iterCount / lightnessPeriod * 2 * Math.PI) * .2;
                [r, g, b] = hslToRgb(hue, 1, lightness);
                colorCache.set(iterCount, [r, g, b]);
            }

            rgba[arrOffset] = r;
            rgba[arrOffset + 1] = g;
            rgba[arrOffset + 2] = b;
        }

        rgba[arrOffset + 3] = 255;
    }

    return rgba;
}

/**
 * https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB
 * @param h {number} 0..360
 * @param s {number} 0..1
 * @param l {number} 0..1
 * @return {[number, number, number]} 0..255
 */
function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const h1 = h / 60;
    const x = c * (1 - Math.abs(h1 % 2 - 1));
    let r1;
    let g1;
    let b1;
    if (h1 < 1) {
        [r1, g1, b1] = [c, x, 0];
    } else if (h1 < 2) {
        [r1, g1, b1] = [x, c, 0];
    } else if (h1 < 3) {
        [r1, g1, b1] = [0, c, x];
    } else if (h1 < 4) {
        [r1, g1, b1] = [0, x, c];
    } else if (h1 < 5) {
        [r1, g1, b1] = [x, 0, c];
    } else {
        [r1, g1, b1] = [c, 0, x];
    }
    const m = l - c / 2;
    return [255 * (r1 + m), 255 * (g1 + m), 255 * (b1 + m)];
}
