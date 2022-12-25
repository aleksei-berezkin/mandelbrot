import { renderResults } from './renderResults.mjs';

/**
 * @param canvas {HTMLCanvasElement}
 * @param coords {Coords}
 */
export function prerender(canvas, coords) {
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    const {width, height} = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    renderResults(canvas, coords, [{
        rgbaArray: imageData.data,
        canvasYMin: 0,
        canvasH: height,
    }]);
}
