import { getMathCoords } from './mathCoords.mjs';

export async function draw(canvas) {
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
