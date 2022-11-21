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
 * @param coords {Coords}
 * @param canvasW {number}
 * @param canvasH {number}
 * @param zoom {number}
 * @return {Uint8ClampedArray}
 */
async function doRender(coords, canvasW, canvasH, zoom) {
    const outByteSize = 2 * canvasW * canvasH;
    if (!wasmExports || wasmExports.memory.buffer.byteLength < outByteSize) {
        wasmExports = await instantiate(outByteSize);
    }

    const maxIterations = Math.max(
        baseIterations,
        Math.round((Math.log10(zoom) + 1) * baseIterations),
    );

    wasmExports.renderMandelbrot(
        Number(coords.unit),
        Number(coords.xMin),
        Number(coords.w),
        Number(coords.yMin),
        Number(coords.h),
        canvasW,
        canvasH,
        maxIterations,
    );

    const iterArray = new Uint16Array(wasmExports.memory.buffer)
    return mapToRgba(iterArray, canvasW, canvasH, maxIterations);
}

/**
 * @param requiredMemBytes {number}
 * @return {Promise<{memory: Memory, renderMandelbrot: Function}>}
 */
async function instantiate(requiredMemBytes) {
    const requiredPages = ((requiredMemBytes & ~0xffff) >>> 16) + ((requiredMemBytes & 0xffff) ? 1 : 0);
    const memory = new WebAssembly.Memory(
        {initial: requiredPages}
    );

    const instObj = await WebAssembly.instantiateStreaming(
        fetch("asmDouble/release.wasm"),
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
