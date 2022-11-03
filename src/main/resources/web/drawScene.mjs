/**
 * @param canvasEl {HTMLCanvasElement}
 * @param unit {BigInt}
 * @param xMin {BigInt}
 * @param yMin {BigInt}
 * @param w {BigInt}
 * @param h {BigInt}
 */
export async function drawScene(canvasEl, unit, xMin, yMin, w, h) {
    const response = await fetch(`/api/draw?unit=${unit}&xMin=${xMin}&yMin=${yMin}&w=${w}&h=${h}`)
    return response.text()
}
