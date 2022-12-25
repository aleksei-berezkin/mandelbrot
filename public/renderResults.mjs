import { getMathCoords } from './mathCoords.mjs';

const auxMul = 1_000_000;
const auxMulN = BigInt(auxMul);

/**
 * @param canvas {HTMLCanvasElement}
 * @param hiddenCanvas {HTMLCanvasElement}
 * @param renderCoords {Coords}
 * @param results {[{rgbaArray: Uint8ClampedArray, canvasYMin: number, canvasH: number}]}
 */
export function renderResults(canvas, hiddenCanvas, renderCoords, results) {
    const {width, height} = canvas;
    const [c1, c0] = toSameUnit(getMathCoords(canvas), renderCoords);
    const topLeftDeltaFr = {
        x: Number((c1.xMin - c0.xMin) * auxMulN / c0.w) / auxMul,
        y: Number((c1.yMin + c1.h - (c0.yMin + c0.h)) * auxMulN / c0.h) / auxMul,
    };

    const deltaPx = {
        x: Math.round(-topLeftDeltaFr.x * width),
        y: Math.round(topLeftDeltaFr.y * height),
    };

    const hiddenCtx = hiddenCanvas.getContext('2d', {willReadFrequently: true});
    hiddenCtx.clearRect(0, 0, canvas.width, canvas.height);
    for (const result of results) {
        hiddenCtx.putImageData(
            new ImageData(result.rgbaArray, canvas.width, result.canvasH),
            deltaPx.x,
            deltaPx.y + canvas.height - result.canvasYMin - result.canvasH,
        );
    }

    const scale = Number(c0.w * auxMulN / c1.w) / auxMul;
    const ctx = canvas.getContext('2d', {willReadFrequently: true})
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(hiddenCanvas, 0, 0, width * scale, height * scale)
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
