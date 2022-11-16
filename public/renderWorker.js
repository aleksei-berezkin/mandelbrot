const baseIterations = 43;

/**
 * @type {WebAssemblyInstantiatedSource}
 */
let wasmInstObj;

/**
 * @param message {{data: [Coords, number, number]}}
 */
async function messageHandler(message) {
    const [coords, canvasW, canvasH, zoom] = message.data;
    const rgbaArray = await doRender(coords, canvasW, canvasH, zoom);
    self.postMessage(rgbaArray);
}

/**
 * @type {Map<number, [number, number, number]>}
 */
const colorCache = new Map();

/**
 * @param coords {Coords}
 * @param canvasW {number}
 * @param canvasH {number}
 * @param zoom {number}
 * @return {Uint8ClampedArray}
 */
async function doRender(coords, canvasW, canvasH, zoom) {
    const maxIterations = Math.max(
        baseIterations,
        Math.round((Math.log10(zoom) + 1) * baseIterations),
    );

    const outByteSize = 2 * canvasW * canvasH;
    if (!wasmInstObj || wasmInstObj.instance.exports.memory.buffer.byteLength < outByteSize) {
        const outPagesNumber = ((outByteSize & ~0xffff) >>> 16) + ((outByteSize & 0xffff) ? 1 : 0);
        const memory = new WebAssembly.Memory(
            {
                initial: outPagesNumber
            }
        );

        wasmInstObj = await WebAssembly.instantiateStreaming(
            fetch("build/debug.wasm"),
            {
                env: {memory}
            },
        );
    }

    wasmInstObj.instance.exports.renderMandelbrot(
        Number(coords.unit),
        Number(coords.xMin),
        Number(coords.w),
        Number(coords.yMin),
        Number(coords.h),
        canvasW,
        canvasH,
        maxIterations,
    );

    const iterArray = new Uint16Array(wasmInstObj.instance.exports.memory.buffer)
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

self.onmessage = messageHandler
