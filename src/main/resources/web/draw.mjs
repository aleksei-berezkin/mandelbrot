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

async function draw0(canvas) {
    const coords = getMathCoords(canvas)
    const response = await fetch(`/api/draw?unit=${coords.unit}&xMin=${coords.xMin}&w=${coords.w}&yMin=${coords.yMin}&h=${coords.h}&canvasW=${canvas.width}&canvasH=${canvas.height}`);
    const rgbaArray = new Uint8ClampedArray(await response.arrayBuffer())
    const ctx = canvas.getContext('2d')
    ctx.putImageData(
        new ImageData(rgbaArray, canvas.width, canvas.height),
        0,
        0
    )
}
