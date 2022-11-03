/**
 * @param canvas {HTMLCanvasElement}
 * @param coords {Coords}
 */
export async function drawScene(canvas, coords) {
    const response = await fetch(`/api/draw?unit=${coords.unit}&xMin=${coords.xMin}&w=${coords.w}&yMin=${coords.yMin}&h=${coords.h}&canvasW=${canvas.width}&canvasH=${canvas.height}`);
    return response.text()
}
