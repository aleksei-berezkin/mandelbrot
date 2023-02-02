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
 * @param message {{data: {workerTaskId: number, coords: Coords, canvasCoords: CanvasCoords, maxIterations: number}}}
 */
async function messageHandler(message) {
    const {workerTaskId, coords, canvasCoords, maxIterations} = message.data;
    const rgbaArray = await doRender(coords, canvasCoords.w, canvasCoords.h, maxIterations);
    self.postMessage({workerTaskId, rgbaArray});
}

self.onmessage = messageHandler


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
 * @return {Uint8ClampedArray}
 */
async function doRender(coords, canvasW, canvasH, maxIterations) {
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

    return mapToRgba(u32Buf, canvasW, canvasH, maxIterations);
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

    try {
        const instObj = await WebAssembly.instantiateStreaming(
            fetch('wasm/release.wasm'),
            {
                env: {memory}
            },
        );
        return instObj.instance.exports;
    } catch (e) {
        if (e instanceof WebAssembly.CompileError) {
            // TODO non-vectorized
            console.log('Seems like vectorization not supported')
        }
    }
}

/**
 * @type {Map<number, [number, number, number]>}
 */
const colorCache = new Map();

/**
 * @param iterArray {Uint32Array}
 * @param canvasW {number}
 * @param canvasH {number}
 * @param maxIterations {number}
 */
function mapToRgba(iterArray, canvasW, canvasH, maxIterations) {
    const rgbaArray = new Uint8ClampedArray(4 * canvasW * canvasH);
    for (let i = 0; i < canvasW * canvasH; i++) {
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
