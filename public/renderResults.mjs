import { getMathCoords } from './mathCoords.mjs';

const scaler = 1_000_000;
const scalerN = BigInt(scaler);

/**
 * @param canvas {HTMLCanvasElement}
 * @param renderCoords {Coords}
 * @param results {[{rgbaArray: Uint8ClampedArray, canvasYMin: number, canvasH: number}]}
 */
export function renderResults(canvas, renderCoords, results) {
    const {width, height} = canvas;
    const [currentCoords, _renderCoords] = toSameUnit(getMathCoords(canvas), renderCoords);
    const deltaFr = {
        x: Number((_renderCoords.xMin - currentCoords.xMin) * scalerN / _renderCoords.w) / scaler,
        y: Number((currentCoords.yMin - _renderCoords.yMin) * scalerN / _renderCoords.h) / scaler,
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

/**
 * @param coords {Coords}
 * @return {Coords[]}
 */
function toSameUnit(...coords) {
    const maxUnit = coords.map(c => c.unit).reduce((u, v) => u > v ? u : v);
    return coords.map(c => {
        const factor = maxUnit / c.unit;
        return {
            unit: maxUnit,
            xMin: c.xMin * factor,
            w: c.w * factor,
            yMin: c.yMin * factor,
            h: c.h * factor,
        };
    });
}
