import { getMathCoords } from './mathCoords.mjs';

const scaler = 1_000_000;
const scalerN = BigInt(scaler);

/**
 * @param canvas {HTMLCanvasElement}
 * @param renderCoords {Coords}
 * @param results {[{rgbaArray: Uint8ClampedArray, canvasYMin: number, canvasH: number}]}
 */
export function renderResults(canvas, renderCoords, results) {
    const currentCoords = getMathCoords(canvas);
    const {width, height} = canvas;
    // TODO make to the same unit
    const deltaFr = {
        x: Number((renderCoords.xMin - currentCoords.xMin) * scalerN / renderCoords.w) / scaler,
        y: Number((currentCoords.yMin - renderCoords.yMin) * scalerN / renderCoords.h) / scaler,
    };

    const deltaPx = {
        x: Math.round(deltaFr.x * width),
        y: Math.round(deltaFr.y * height),
    }

    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    for (const result of results) {
        ctx.putImageData(
            new ImageData(result.rgbaArray, canvas.width, result.canvasH),
            deltaPx.x,
            deltaPx.y + canvas.height - result.canvasYMin - result.canvasH,
        );
    }
}
