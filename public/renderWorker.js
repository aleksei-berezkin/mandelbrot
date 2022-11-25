const bigIntToBigNumPromise = (async () => {
    const text = await (await fetch('bigIntToBigNum.mjs')).text();
    eval(text.replace('export', ''));
    // noinspection JSUnresolvedVariable
    return bigIntToBigNum;
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


const baseIterations = 43;

/**
 * @type {{memory: Memory, renderMandelbrot: Function}}
 */
let wasmExports;

/**
 * @type {'double' | 'BigNum'}
 */
let wasmType;
// TODO boolean wasmBigNum

/**
 * @param coords {Coords}
 * @param canvasW {number}
 * @param canvasH {number}
 * @param zoom {number}
 * @return {Uint8ClampedArray}
 */
async function doRender(coords, canvasW, canvasH, zoom) {
    const outByteSize = 2 * canvasW * canvasH;

    const wNum = Number(coords.w) / coords.unit;
    const _wasmType = wNum < 1e-12 ? 'BigNum' : 'double';
    const wBigNum = _wasmType === 'BigNum'
        ? (await bigIntToBigNumPromise)(coords.w, coords.unit)
        : undefined;
    const precision = wBigNum?.length;

    const requiredMemoryBytes = _wasmType === 'double'
        ? outByteSize
        : 17 * 4 * precision;

    if (!wasmExports
        || wasmType !== _wasmType
        || wasmExports.memory.buffer.byteLength < requiredMemoryBytes) {
        wasmExports = await instantiate(outByteSize, _wasmType);
        wasmType = _wasmType;
    }

    const maxIterations = Math.max(
        baseIterations,
        Math.round((Math.log10(zoom) + 1) * baseIterations),
    );

    if (_wasmType === 'double') {
        const unit = Number(coords.unit);
        wasmExports.renderMandelbrot(
            Number(coords.unit) / unit,
            Number(coords.xMin) / unit,
            Number(coords.w) / unit,
            Number(coords.yMin) / unit,
            Number(coords.h) / unit,
            canvasW,
            canvasH,
            maxIterations,
        );
    } else {
        // TODO fill memory
        wasmExports.renderMandelbrot(
            canvasW,
            canvasH,
            maxIterations,
            precision - 1,
        )
    }

    const iterArray = new Uint16Array(wasmExports.memory.buffer, wasmType === 'BigNum' ? 17 * 4 * precision : 0);
    return mapToRgba(iterArray, canvasW, canvasH, maxIterations);
}

/**
 * @param requiredMemBytes {number}
 * @param wasmType {'double' | 'BigNum'}
 * @return {Promise<{memory: Memory, renderMandelbrot: Function}>}
 */
async function instantiate(requiredMemBytes, wasmType) {
    const requiredPages = ((requiredMemBytes & ~0xffff) >>> 16) + ((requiredMemBytes & 0xffff) ? 1 : 0);
    const memory = new WebAssembly.Memory(
        {initial: requiredPages}
    );

    const instObj = await WebAssembly.instantiateStreaming(
        fetch(
            wasmType === 'double'
                ? 'asmDouble/release.wasm'
                : 'asmBigNum/release.wasm'
        ),
        {
            env: {memory}
        },
    );

    return instObj.instance.exports;
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
