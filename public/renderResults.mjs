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
        const edgeRgb = getEdgeRgb(results, width);
        const darker = edgeRgb.map(c => Math.round(c * .25));
        const lighter = edgeRgb.map(c => Math.round(255 - (255 - c) * .5));
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
 * @param width {number}
 */
function getEdgeRgb(results, width) {
    const pixels = [
        ...topSideRgb(results[0].rgba, width),
        ...bottomSideRgb(results[results.length - 1].rgba, width),
        ...results.map(res => [...sidesRgb(res, width)]).flatMap(rgbs => rgbs),
    ];
    const [r, g, b] = pixels
        .reduce((c0, c1) => [c0[0] + c1[0], c0[1] + c1[1], c0[2] + c1[2]])
        .map(col => Math.round(col / pixels.length));
    return [r, g, b];
}

/**
 * @param rgba {Uint8ClampedArray}
 * @param width
 * @return {Generator<[number, number, number]>}
 */
function* topSideRgb(rgba, width) {
    for (let i = 0; i < width; i++) {
        yield [
            rgba[4 * i],
            rgba[4 * i + 1],
            rgba[4 * i + 2],
        ]
    }
}

function* bottomSideRgb(rgba, width) {
    const height = rgba.length / 4 / width;
    const offset = 4 * width * (height - 1);
    for (let i = 0; i < width; i++) {
        yield [
            rgba[offset + 4 * i],
            rgba[offset + 4 * i + 1],
            rgba[offset + 4 * i + 2],
        ]
    }
}

function* sidesRgb(rgba, width) {
    const height = rgba.length / 4 / width;
    for (let i = 0; i < height; i++) {
        for (const j of [0, width - 1]) {
            yield [
                rgba[4 * width * i + 4 * j],
                rgba[4 * width * i + 4 * j + 1],
                rgba[4 * width * i + 4 * j + 2],
            ]
        }
    }
}
