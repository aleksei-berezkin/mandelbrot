import { getMathCoords } from './mathCoords.mjs';
import { divToNum } from './bigIntArithHelper.mjs';

const auxMul = 10_000_000;
const auxMulN = BigInt(auxMul);

/**
 * @param canvas {HTMLCanvasElement}
 * @param hiddenCanvas {HTMLCanvasElement}
 * @param renderCoords {Coords}
 * @param results {[{rgbaArray: Uint8ClampedArray, canvasYMin: number, canvasH: number}]}
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
            new ImageData(result.rgbaArray, canvas.width, result.canvasH),
            deltaPx.x,
            deltaPx.y + canvas.height - result.canvasYMin - result.canvasH,
        );
    }

    if (!isPrerender) {
        canvas.style.backgroundColor = getEdgeColor(results, width);
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
 * @param results {[{rgbaArray: Uint8ClampedArray}]}
 * @param width {number}
 */
function getEdgeColor(results, width) {
    const pixels = [
        ...topSideRgb(results[0].rgbaArray, width),
        ...bottomSideRgb(results[results.length - 1].rgbaArray, width),
        ...results.map(res => [...sidesRgb(res, width)]).flatMap(rgbs => rgbs),
    ];
    const [r, g, b] = pixels
        .reduce((c0, c1) => [c0[0] + c1[0], c0[1] + c1[1], c0[2] + c1[2]])
        .map(col => Math.round(col / pixels.length));
    return `rgb(${r}, ${g}, ${b})`;
}

/**
 * @param rgbaArray {Uint8ClampedArray}
 * @param width
 * @return {Generator<[number, number, number]>}
 */
function* topSideRgb(rgbaArray, width) {
    for (let i = 0; i < width; i++) {
        yield [
            rgbaArray[4 * i],
            rgbaArray[4 * i + 1],
            rgbaArray[4 * i + 2],
        ]
    }
}

function* bottomSideRgb(rgbaArray, width) {
    const height = rgbaArray.length / 4 / width;
    const offset = 4 * width * (height - 1);
    for (let i = 0; i < width; i++) {
        yield [
            rgbaArray[offset + 4 * i],
            rgbaArray[offset + 4 * i + 1],
            rgbaArray[offset + 4 * i + 2],
        ]
    }
}

function* sidesRgb(rgbaArray, width) {
    const height = rgbaArray.length / 4 / width;
    for (let i = 0; i < height; i++) {
        for (const j of [0, width - 1]) {
            yield [
                rgbaArray[4 * width * i + 4 * j],
                rgbaArray[4 * width * i + 4 * j + 1],
                rgbaArray[4 * width * i + 4 * j + 2],
            ]
        }
    }
}
