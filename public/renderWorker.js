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

/**
 * @param message {{data: [Coords, number, number, number]}}
 */
async function messageHandler(message) {
    const [coords, canvasW, canvasH, zoom] = message.data;
    const rgbaArray = await doRender(coords, canvasW, canvasH, zoom);
    self.postMessage(rgbaArray);
}

self.onmessage = messageHandler


/**
 * @type {{
 * memory: Memory,
 * renderMandelbrot: Function,
 * isBigNum: WebAssembly.Global,
 * canvasW: WebAssembly.Global,
 * canvasH: WebAssembly.Global,
 * xMin: WebAssembly.Global,
 * w: WebAssembly.Global,
 * yMin: WebAssembly.Global,
 * h: WebAssembly.Global,
 * maxIterations: WebAssembly.Global
 * }}
 */
let wasmExports;

/**
 * @type {boolean}
 */
let wasmBigNum;

/**
 * @param coords {Coords}
 * @param canvasW {number}
 * @param canvasH {number}
 * @param maxIterations {number}
 * @return {Uint8ClampedArray}
 */
async function doRender(coords, canvasW, canvasH, maxIterations) {
    const outByteSize = 2 * canvasW * canvasH;

    const _wasmBigNum = (await isBigNumPromise)(coords.w, coords.unit);
    const bigIntToBigNum = await bigIntToBigNumPromise;
    const wBigNum = _wasmBigNum
        ? bigIntToBigNum(coords.w, coords.unit)
        : undefined;
    const precision = wBigNum?.length;

    const requiredMemoryBytes = _wasmBigNum
        ? 16 * 4 * precision + outByteSize
        : outByteSize;

    if (!wasmExports
        || wasmBigNum !== _wasmBigNum
        || wasmExports.memory.buffer.byteLength < requiredMemoryBytes) {
        wasmExports = await instantiate(requiredMemoryBytes, _wasmBigNum);
        wasmBigNum = _wasmBigNum;
    }

    new Uint16Array(wasmExports.memory.buffer).fill(0);

    if (_wasmBigNum) {
        const fracPrecision = precision - 1;
        const u32Buf = new Uint32Array(wasmExports.memory.buffer);

        writeBigNum(0, bigIntToBigNum(coords.xMin, coords.unit, fracPrecision), u32Buf);
        writeBigNum(precision, wBigNum, u32Buf);
        writeBigNum(2 * precision, bigIntToBigNum(coords.yMin, coords.unit, fracPrecision), u32Buf)
        writeBigNum(3 * precision, bigIntToBigNum(coords.h, coords.unit, fracPrecision), u32Buf)

        wasmExports.renderMandelbrot(
            canvasW,
            canvasH,
            maxIterations,
            fracPrecision,
        );
    } else {
        wasmExports.isBigNum.value = _wasmBigNum;
        wasmExports.maxIterations.value = maxIterations;
        wasmExports.canvasW.value = canvasW;
        wasmExports.canvasH.value = canvasH;

        const unit = Number(coords.unit);
        wasmExports.xMin.value = Number(coords.xMin) / unit;
        wasmExports.w.value = Number(coords.w) / unit;
        wasmExports.yMin.value = Number(coords.yMin) / unit;
        wasmExports.h.value = Number(coords.h) / unit;

        wasmExports.renderMandelbrot();
    }

    const iterArray = new Uint16Array(wasmExports.memory.buffer, _wasmBigNum ? 16 * 4 * precision : 0);
    return mapToRgba(iterArray, canvasW, canvasH, maxIterations);
}

/**
 * @param requiredMemBytes {number}
 * @param bigNum {boolean}
 * @return {Promise<*>}
 */
async function instantiate(requiredMemBytes, bigNum) {
    const requiredPages = ((requiredMemBytes & ~0xffff) >>> 16) + ((requiredMemBytes & 0xffff) ? 1 : 0);
    const memory = new WebAssembly.Memory(
        {initial: requiredPages}
    );

    const instObj = await WebAssembly.instantiateStreaming(
        fetch(
            bigNum
                ? 'asmBigNum/release.wasm'
                : 'asmDouble/release.wasm'
        ),
        {
            env: {memory}
        },
    );

    return instObj.instance.exports;
}

function writeBigNum(offsetU32, bigNum, u32Buf) {
    bigNum.forEach((v, i) => u32Buf[offsetU32 + i] = v);
}

/**
 * @type {Map<number, [number, number, number]>}
 */
const colorCache = new Map();

/**
 * @param iterArray {Uint16Array}
 * @param canvasW {number}
 * @param canvasH {number}
 * @param maxIterations {number}
 */
function mapToRgba(iterArray, canvasW, canvasH, maxIterations) {
    const rgbaArray = new Uint8ClampedArray(4 * canvasW * canvasH);
    for (let i = 0; i < iterArray.length; i++) {

        const iterCount = iterArray[i];
        const arrOffset = i * 4;
        if (iterCount < maxIterations) {
            let r, g, b;
            if (colorCache.has(iterCount)) {
                [r, g, b] = colorCache.get(iterCount);
            } else {
                r = (Math.sin(iterCount / 13) + 1) / 2 * 255;
                g = (Math.sin(iterCount / 13 + 5) + 1) / 2 * 255;
                b = (Math.sin(iterCount / 13 + 9) + 1) / 2 * 255;
                colorCache.set(iterCount, [r, g, b]);
            }

            rgbaArray[arrOffset] = r;
            rgbaArray[arrOffset + 1] = g;
            rgbaArray[arrOffset + 2] = b;
        }

        rgbaArray[arrOffset + 3] = 255;
    }

    return rgbaArray;
}
