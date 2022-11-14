const minIterations = 70;

/**
 * @type {WebAssemblyInstantiatedSource}
 */
let wasmInstObj;

/**
 * @param message {{data: [Coords, number, number]}}
 */
async function messageHandler(message) {
    const [coords, canvasW, canvasH] = message.data;
    const rgbaArray = await doRender(coords, canvasW, canvasH);
    self.postMessage(rgbaArray);
}

/**
 * @param coords {Coords}
 * @param canvasW {number}
 * @param canvasH {number}
 * @return {Uint8ClampedArray}
 */
async function doRender(coords, canvasW, canvasH) {
    const sizeLog = Math.log10(Math.min(Number(coords.w), Number(coords.h)) / Number(coords.unit));
    const maxIterations = sizeLog < -1 ? Math.ceil(-sizeLog * minIterations) : minIterations;

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
            rgbaArray[arrOffset]     = (Math.sin(iterCount / 10) + 1) / 2 * 255;
            rgbaArray[arrOffset + 1] = (Math.sin(iterCount / 10 + 5) + 1) / 2 * 255;
            rgbaArray[arrOffset + 2] = (Math.sin(iterCount / 10 + 9) + 1) / 2 * 255;
        }
        rgbaArray[arrOffset + 3] = 255;
    }

    return rgbaArray;
}

self.onmessage = messageHandler
