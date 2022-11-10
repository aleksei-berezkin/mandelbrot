import { getMathCoords } from './mathCoords.mjs';
import { renderMandelbrot } from './build/debug.js';

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

async function draw0(canvas) {
    const coords = getMathCoords(canvas);

    const sizeLog = Math.log10(Math.min(Number(coords.w), Number(coords.h)))
    const maxIterations = sizeLog < -1 ? Math.ceil(-sizeLog * minIterations) : minIterations

    /**
     * @type {Uint16Array}
     */
    const outArray = renderMandelbrot(
        Number(coords.unit),
        Number(coords.xMin),
        Number(coords.w),
        Number(coords.yMin),
        Number(coords.h),
        canvas.width,
        canvas.height,
        maxIterations,
    );

    debugger;

    const rgbaArray = new Uint8ClampedArray(outArray.length * 4);
    for (let i = 0; i < outArray.length; i++) {
        const iterCount = outArray[i];
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
