import { getMathCoords } from './mathCoords.mjs';

let pending = 0;

export async function render(canvas) {
    if (++pending > 1) {
        return;
    }

    do {
        const acquired = pending;
        await render0(canvas);
        pending = Math.max(pending - acquired, 0);
    } while (pending);
}

const workers = Array.from({length: 16}).map(() => new Worker('renderWorker.js'));

/**
 * @param canvas {HTMLCanvasElement}
 */
async function render0(canvas) {
    const coords = getMathCoords(canvas);

    let hNum = Number(coords.h) / Number(coords.unit);
    const zoom = 3 / hNum;

    const parts = [...splitWork(coords.yMin, coords.h, canvas.height, workers.length)];

    const workerPromises = parts.map(async (part, i) => {
        const rgbaArray = await renderOnWorker(
            workers[i],
            {
                unit: coords.unit,
                xMin: coords.xMin,
                w: coords.w,
                yMin: part.yMin,
                h: part.h,
            },
            canvas.width,
            part.canvasH,
            zoom,
        );
        return {rgbaArray, canvasYMin: part.canvasYMin, canvasH: part.canvasH};
    });

    const ctx = canvas.getContext('2d');
    for (const renderedPart of await Promise.all(workerPromises)) {
        ctx.putImageData(
            new ImageData(renderedPart.rgbaArray, canvas.width, renderedPart.canvasH),
            0,
            canvas.height - renderedPart.canvasYMin - renderedPart.canvasH,
        );
    }
}

/**
 * @param worker {Worker}
 * @param coords {Coords}
 * @param canvasW {number}
 * @param canvasH {number}
 * @param zoom {number}
 * @return {Promise<Uint8ClampedArray>}
 */
async function renderOnWorker(worker, coords, canvasW, canvasH, zoom) {
    worker.postMessage([coords, canvasW, canvasH, zoom]);
    return new Promise(resolve => {
        worker.onmessage = function (message) {
            worker.onmessage = undefined;
            resolve(message.data);
        }
    });
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
