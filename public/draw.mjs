import { getMathCoords } from './mathCoords.mjs';

let pending = 0;

export async function draw(canvas) {
    if (++pending > 1) {
        return;
    }

    do {
        const acquired = pending;
        await draw0(canvas);
        pending = Math.max(pending - acquired, 0);
    } while (pending);
}

const minIterations = 70;

/**
 * @type {WebAssemblyInstantiatedSource}
 */
let wasmInstObj;

/**
 * @param canvas {HTMLCanvasElement}
 */
async function draw0(canvas) {
    const coords = getMathCoords(canvas);

    const sizeLog = Math.log10(Math.min(Number(coords.w), Number(coords.h)))
    const maxIterations = sizeLog < -1 ? Math.ceil(-sizeLog * minIterations) : minIterations

    const outByteSize = 2 * canvas.width * canvas.height;
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
        canvas.width,
        canvas.height,
        maxIterations,
    );

    const iterArray = new Uint16Array(wasmInstObj.instance.exports.memory.buffer)
    const rgbaArray = new Uint8ClampedArray(4 * canvas.width * canvas.height);
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

    canvas.getContext('2d').putImageData(
        new ImageData(rgbaArray, canvas.width, canvas.height),
        0,
        0
    );
}
