import { getMathCoords } from './mathCoords.mjs';
import { divToNum } from './bigIntArithHelper.mjs';

const auxMul = 10_000_000;
const auxMulN = BigInt(auxMul);

/**
 * @param canvas {HTMLCanvasElement}
 * @param hiddenCanvas {HTMLCanvasElement}
 * @param renderCoords {Coords}
 * @param results {[{rgba: Uint8ClampedArray, canvasCoords: CanvasCoords}]}
 * @param isPrerender
 */
export function renderResults(canvas, hiddenCanvas, renderCoords, results, isPrerender) {
    const {width, height} = canvas;
    const [c1, c0] = toSameUnit(getMathCoords(canvas), renderCoords);
    const topLeftDeltaFr = {
        x: divToNum(c1.xMin - c0.xMin, c0.w),
        y: divToNum(c1.yMin + c1.h - (c0.yMin + c0.h), c0.h),
    };

    const deltaPx = {
        x: Math.round(-topLeftDeltaFr.x * width),
        y: Math.round(topLeftDeltaFr.y * height),
    };

    const hiddenCtx = hiddenCanvas.getContext('2d', {willReadFrequently: true});
    hiddenCtx.clearRect(0, 0, canvas.width, canvas.height);
    for (const result of results) {
        hiddenCtx.putImageData(
            new ImageData(result.rgba, result.canvasCoords.w, result.canvasCoords.h),
            result.canvasCoords.xMin + deltaPx.x,
            deltaPx.y + canvas.height - result.canvasCoords.yMin - result.canvasCoords.h,
        );
    }

    if (!isPrerender) {
        const avgRgb = getAvgRgb(results);
        const darker = avgRgb.map(c => Math.round(c * .25));
        const lighter = avgRgb.map(c => Math.round(255 - (255 - c) * .5));
        document.body.style.background = `radial-gradient(rgb(${lighter.join()}), rgb(${darker.join()}))`
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

/**
 * @param results {[{rgba: Uint8ClampedArray}]}
 */
function getAvgRgb(results) {
    let r = 0;
    let g = 0;
    let b = 0;
    const samplesNum = 100;
    for (let i = 0; i < samplesNum; i++) {
        const rgba = results[Math.floor(results.length * Math.random())].rgba;
        const pixelIndex = Math.floor(rgba.length / 4 * Math.random());
        r += rgba[4 * pixelIndex];
        g += rgba[4 * pixelIndex + 1];
        b += rgba[4 * pixelIndex + 2];
    }
    return [r / samplesNum, g / samplesNum, b / samplesNum].map(Math.floor);
}
