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
        const {velocity, minIterCount, maxIterCount, avgIterCount, medianIterCount, colorsRangeVal, hueRangeVal} = data;
        resultData = mapToRgba(renderTaskId, velocity, minIterCount, maxIterCount, avgIterCount, medianIterCount, colorsRangeVal, hueRangeVal);
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
        const {minIterCount, maxIterCount, avgIterCount, medianIterCount} = getMinMaxAvgIterCount(iterNums, canvasCoords, maxIterations);
        return {
            velocity: measureVelocity(iterNums, canvasCoords, maxIterations),
            minIterCount,
            maxIterCount,
            avgIterCount,
            medianIterCount,
            sample: getSample(iterNums, canvasCoords),
        };
    } catch (e) {
        if (e instanceof WebAssembly.CompileError) {
            return e.toString();
        } else {
            throw e;
        }
    }
}

function mapToRgba(renderTaskId, velocity, minIterCount, maxIterCount, avgIterCount, medianIterCount, colorsRangeVal, hueRangeVal) {
    if (lastRenderTaskId !== renderTaskId) {
        return;
    }

    const rgbaParts = lastResults.map(({iterNums, canvasCoords, maxIterations}) => ({
        canvasCoords,
        rgba: doMapToRgba(iterNums, canvasCoords, maxIterations, velocity, minIterCount, maxIterCount, avgIterCount, medianIterCount, colorsRangeVal, hueRangeVal),
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
 * @param maxIterations {number}
 * @return {{minIterCount: number, maxIterCount: number | undefined , avgIterCount: number, medianIterCount}}
 */
function getMinMaxAvgIterCount(iterArray, canvasCoords, maxIterations) {
    let minIterCount = iterArray[0];
    let maxIterCount = undefined;
    let avgIterCount = 0;
    let avgIterAddedCounter = 0;
    const allCounts = [];
    for (let i = 1; i < canvasCoords.w * canvasCoords.h; i++) {
        minIterCount = Math.min(minIterCount, iterArray[i]);
        if (iterArray[i] !== maxIterations) {
            maxIterCount = Math.max(maxIterCount ?? 0, iterArray[i]);
            avgIterCount += iterArray[i];
            avgIterAddedCounter++;
            allCounts.push(iterArray[i]);
        }
    }
    avgIterCount /= avgIterAddedCounter || 1;
    allCounts.sort((a, b) => a < b ? -1 : 1);

    return {
        minIterCount,
        maxIterCount,
        avgIterCount,
        // TODO it's 90th percentile in fact
        medianIterCount: allCounts.length ? allCounts[Math.floor(allCounts.length * .9)] : undefined,
    };
}

function getSample(iterArray, canvasCoords) {
    const sampleApproxSize = 100;
    const sampleFraction = sampleApproxSize / (canvasCoords.w * canvasCoords.h);
    const sample = [];
    for (let i = 0; i < canvasCoords.w * canvasCoords.h; i++) {
        if (Math.random() < sampleFraction) {
            sample.push(iterArray[i]);
        }
    }
    return sample;
}

const colors = [
    '#001f65',
    '#ffecde',
    '#492d74',
    '#fff0b2',
    '#671b6f',
    '#d2f7ff',
    '#995300',
    '#e3ffd1',
    '#0d470f',
    '#ffe9fd',
].map(hexToRgb);

/**
 * @param iterArray {Uint32Array}
 * @param canvasCoords {CanvasCoords}
 * @param maxIterations {number}
 * @param velocity {number}
 * @param minIterCount {number}
 * @param maxIterCount {number | undefined}
 * @param avgIterCount {number}
 * @param medianIterCount {number}
 * @param colorsRangeVal {number}
 * @param hueRangeVal {number}
 */
function doMapToRgba(iterArray, canvasCoords, maxIterations, velocity, minIterCount, maxIterCount, avgIterCount, medianIterCount, colorsRangeVal, hueRangeVal) {
    const initZoneBound = minIterCount + (medianIterCount - minIterCount) * .95;
    const chaosZoneStart = medianIterCount + (medianIterCount - minIterCount) * 1.7;

    // Offsets and frequencies are given in the scale
    // [0..1) for [minIterCount..highPercentile)
    const colorOffset = .79;
    const colorHueOffset = hueRangeVal / 100 + .5;
    const colorOffsetByMinIter = .011 * minIterCount;

    const colorFreq = .2079 * Math.pow(20, colorsRangeVal / 50 - 1);
    const colorFreqByMinIterMultiplier = Math.min(
        1.9,
        1 + Math.log10(Math.max(1, minIterCount - 12)) * .13,
    );

    const normalizedMin = 1;
    const normalizedAvg = 10;
    const normalizedSpan = Math.log10(normalizedAvg) - Math.log10(normalizedMin); // 1

    /**
     * 0 = min
     * 1 = highPercentile
     */
    function compressIterCount(iterCount) {
        const compressedIterCount =
            iterCount < initZoneBound ? (3.1 * initZoneBound + iterCount) / 4.1
            : iterCount > chaosZoneStart ? chaosZoneStart + Math.pow(iterCount - chaosZoneStart + 1, .59) - 1
            : iterCount;

        const normalizedIterCount = normalizedMin + (compressedIterCount - minIterCount) / (medianIterCount - minIterCount) * (normalizedAvg - normalizedMin);

        const logIterCount = Math.log10(normalizedIterCount) - Math.log10(normalizedMin);

        return logIterCount / normalizedSpan;
    }

    const {w, h} = canvasCoords;
    const rgba = new Uint8ClampedArray(4 * w * h);

    for (let i = 0; i < w * h; i++) {
        const iterCount = iterArray[i];
        const arrOffset = i * 4;

        if (iterCount < maxIterations) {
            const compressedIterCount = compressIterCount(iterCount);

            // [0, colors.length)
            const currColor = (
                colorOffset * colors.length
                + colorHueOffset * colors.length
                + colorOffsetByMinIter * colors.length
                + (compressedIterCount * colorFreq * colorFreqByMinIterMultiplier) * colors.length
            ) % colors.length;

            const fromColor = colors[Math.floor(currColor)];
            const toColor = colors[(Math.floor(currColor) + 1) % colors.length];
            const progress = currColor % 1;

            const [r, g, b] = fromColor
                .map((fc, i) => fc * (1 - progress) + toColor[i] * progress);

            rgba[arrOffset] = r;
            rgba[arrOffset + 1] = g;
            rgba[arrOffset + 2] = b;
        }

        rgba[arrOffset + 3] = 255;
    }

    return rgba;
}

function hexToRgb(hex) {
    const [_, ...hexRgb] = /#([\da-zA-Z]{2})([\da-zA-Z]{2})([\da-zA-Z]{2})/.exec(hex);
    return hexRgb.map(h => Number.parseInt(h, 16));
}
