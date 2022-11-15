import { getMathCoords } from './mathCoords.mjs';

let pending = 0;

export async function draw(canvas) {
    if (++pending > 1) {
        return;
    }

    do {
        const acquired = pending;
        await draw0(canvas);
        pending = Math.max(pending - acquired, 0);
    } while (pending);
}

const drawWorker = new Worker('drawWorker.js');

/**
 * @param canvas {HTMLCanvasElement}
 */
async function draw0(canvas) {
    const coords = getMathCoords(canvas);
    drawWorker.postMessage([coords, canvas.width, canvas.height]);

    return new Promise(resolve => {
        drawWorker.onmessage = function (message) {
            canvas.getContext('2d').putImageData(
                new ImageData(message.data, canvas.width, canvas.height),
                0,
                0
            );
            resolve();
        }
    })
}

/**
 * @param worker {Worker}
 * @param coords {Coords}
 * @param canvasW {number}
 * @param canvasH {number}
 */
async function renderOnWorker(worker, coords, canvasW, canvasH) {

}

/**
 * @param yMin {BigInt}
 * @param h {BigInt}
 * @param canvasH {number}
 * @param n {number}
 * @return {Generator<{yMin: BigInt, h: BigInt, canvasYMin: number, canvasH: number}>}
 */
function* splitWork(yMin, h, canvasH, n) {
    if (h < 32) {
        yield {yMin, h, canvasYMin: 0, canvasH};
        // noinspection JSValidateTypes
        return;
    }

    const yPart = h / BigInt(n);
    const canvasHPart = Math.round(canvasH / n);

    let yDone = 0n;
    let canvasYDone = 0;

    for (let i = 0; i < n - 1; i++) {
        yield {
            yMin: yMin + yDone,
            h: yPart,
            canvasYMin: canvasYDone,
            canvasH: canvasHPart,
        };
        yDone += yPart;
        canvasYDone += canvasHPart;
    }

    yield {
        yMin: yMin + yDone,
        h: h - yDone,
        canvasYMin: canvasYDone,
        canvasH: canvasH - canvasYDone,
    };
}
