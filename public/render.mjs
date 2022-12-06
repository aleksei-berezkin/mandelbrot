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

    const parts = [...splitWork(coords.yMin, coords.h, canvas.height, workers.length * 16)];

    const tasksNum = parts.length;
    let tasksDone = 0;

    const loaderWr = document.getElementById('main-loader-wr');
    loaderWr.style.display = 'block';
    loaderWr.style.setProperty('--progress', '0%');

    const workerPromises = workers.map(async worker => {
        const results = [];
        while (parts.length) {
            const part = parts.splice(0, 1)[0]
            const rgbaArray = await renderOnWorker(
                worker,
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
            results.push({
                rgbaArray,
                canvasYMin: part.canvasYMin,
                canvasH: part.canvasH,
            });
            tasksDone++;
            if (tasksDone === tasksNum) {
                loaderWr.style.display = 'none';
            } else {
                loaderWr.style.setProperty('--progress', `${tasksDone / tasksNum * 100}%`);
            }
        }
        return results;
    });

    const ctx = canvas.getContext('2d');
    for (const results of await Promise.all(workerPromises)) {
        for (const result of results) {
            ctx.putImageData(
                new ImageData(result.rgbaArray, canvas.width, result.canvasH),
                0,
                canvas.height - result.canvasYMin - result.canvasH,
            );
        }
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

const minCanvasH = 12;

/**
 * @param yMin {BigInt}
 * @param h {BigInt}
 * @param canvasH {number}
 * @param nApprox {number}
 * @return {Generator<{yMin: BigInt, h: BigInt, canvasYMin: number, canvasH: number}>}
 */
function* splitWork(yMin, h, canvasH, nApprox) {
    const _nApprox = Math.min(nApprox, Math.ceil(canvasH / minCanvasH));

    const yPart = h / BigInt(_nApprox);

    let yDone = 0n;
    let yRemaining = h;

    let canvasYDone = 0;
    let canvasYRemaining = canvasH;

    while (yRemaining) {
        if (yRemaining <= yPart) {
            yield {
                yMin: yMin + yDone,
                h: yRemaining,
                canvasYMin: canvasYDone,
                canvasH: canvasYRemaining,
            };
            // noinspection JSValidateTypes
            return;
        }

        const canvasHPart = Number(BigInt(canvasH) * (yDone + yPart) / h) - canvasYDone;

        yield {
            yMin: yMin + yDone,
            h: yPart,
            canvasYMin: canvasYDone,
            canvasH: canvasHPart,
        };

        yDone += yPart;
        yRemaining -= yPart;

        canvasYDone += canvasHPart;
        canvasYRemaining -= canvasHPart;
    }
}
