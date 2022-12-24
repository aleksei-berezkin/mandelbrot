/**
 * @param canvas {HTMLCanvasElement}
 * @param renderCoords {Coords}
 * @param results {[{rgbaArray: Uint8ClampedArray, canvasYMin: number, canvasH: number}]}
 */
export function renderResults(canvas, renderCoords, results) {
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    for (const result of results) {
        ctx.putImageData(
            new ImageData(result.rgbaArray, canvas.width, result.canvasH),
            0,
            canvas.height - result.canvasYMin - result.canvasH,
        );
    }
}
