import { renderResults } from './renderResults.mjs';

/**
 * @param coords {Coords}
 */
export function prerender(coords) {
    const canvas = document.getElementById('main-canvas');
    const hiddenCanvas = document.getElementById('hidden-canvas');

    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    const {width, height} = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    renderResults(canvas, hiddenCanvas, coords, [{
        rgba: imageData.data,
        canvasCoords: {
            xMin: 0,
            w: width,
            yMin: 0,
            h: height,
        },
    }], true);
}
