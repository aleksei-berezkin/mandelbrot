import { renderResults } from './renderResults.mjs';

/**
 * @param canvas {HTMLCanvasElement}
 * @param hiddenCanvas {HTMLCanvasElement}
 * @param coords {Coords}
 */
export function prerender(canvas, hiddenCanvas, coords) {
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    const {width, height} = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    renderResults(canvas, hiddenCanvas, coords, [{
        rgbaArray: imageData.data,
        canvasXMin: 0,
        canvasW: width,
        canvasYMin: 0,
        canvasH: height,
    }], true);
}
