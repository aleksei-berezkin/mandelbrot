import { getMathCoords, mathCoordsToQuery } from './mathCoords.mjs';
import { isBigNum } from './isBigNum.mjs';
import { bigIntToBigNum } from './bigIntToBigNum.mjs';
import { mulBigIntByNum } from './bigIntArithHelper.mjs';
import { renderResults } from './renderResults.mjs';

let pending = 0;

const baseIterations = 2000;


export async function render(canvas, hiddenCanvas, immediately = false) {
    if (pending++ > 0) {
        return;
    }

    const renderCb = async function() {
        do {
            const acquired = pending;
            await render0(canvas, hiddenCanvas, acquired);
            pending = Math.max(pending - acquired, 0);
        } while (pending);
    }

    if (immediately) {
        void renderCb();
    } else {
        setTimeout(renderCb, 300);
    }
}

const workers = Array.from({length: 10}).map(() => new Worker('renderWorker.js'));

const maxCancellableProgress = .65;

let initial = true;

async function render0(canvas, hiddenCanvas, acquired) {
    const coords = getMathCoords(canvas);

    if (initial && window.location.search === '') {
        initial = false
    } else {
        history.replaceState(null, null, "?" + mathCoordsToQuery(coords));
    }

    let hNum = Number(coords.h) / Number(coords.unit);
    const zoom = 3 / hNum;
    const maxIterations = Math.max(
        baseIterations,
        Math.round((Math.log10(zoom) + 1) * baseIterations),
    );

    const bigNum = isBigNum(coords.w, coords.unit);
    const wBigNum = bigNum ? bigIntToBigNum(coords.w, coords.unit) : undefined;

    document.getElementById('precision').innerText = wBigNum ? `Precision: BigNum ${wBigNum.length * 32} bits` : 'Precision: float 64 bits';
    document.getElementById('max-iterations').innerText = `Max iterations: ${maxIterations}`;

    const canvasW = canvas.width;
    const canvasH = canvas.height;

    const parts = [...splitWork(
        coords.yMin,
        coords.h,
        canvasH,
        workers.length * 8,
    )];

    const tasksNum = parts.length;
    let tasksDone = 0;

    const loaderWr = document.getElementById('main-loader-wr');
    loaderWr.style.display = 'block';
    loaderWr.style.setProperty('--progress', '0%');

    const workerPromises = workers.map(async worker => {
        const results = [];
        while (parts.length) {
            if (pending > acquired && tasksDone / tasksNum <= maxCancellableProgress) {
                break;
            }

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
                canvasW,
                part.canvasH,
                maxIterations,
            );
            results.push({
                rgbaArray,
                canvasYMin: part.canvasYMin,
                canvasH: part.canvasH,
            });
            tasksDone++;
            if (tasksDone === tasksNum) {
                loaderWr.style.removeProperty('display');
                loaderWr.style.setProperty('--progress', '0%');
            } else {
                loaderWr.style.setProperty('--progress', `${tasksDone / tasksNum * 100}%`);
            }
        }
        return results;
    });


    const resultsArr = await Promise.all(workerPromises);
    if (tasksDone < tasksNum) {
        return;
    }

    if (canvas.width !== canvasW || canvas.height !== canvasH) {
        return;
    }

    renderResults(canvas, hiddenCanvas, coords, resultsArr.flatMap(results => results), false);
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

const minCanvasH = 8;

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
        const currentYPart = min(yRemaining, mulBigIntByNum(yPart, (Math.random() + .5)));
        const currentCanvasHPart = Number(BigInt(canvasH) * (yDone + currentYPart) / h) - canvasYDone;

        yield {
            yMin: yMin + yDone,
            h: currentYPart,
            canvasYMin: canvasYDone,
            canvasH: currentCanvasHPart,
        };

        yDone += currentYPart;
        yRemaining -= currentYPart;

        canvasYDone += currentCanvasHPart;
        canvasYRemaining -= currentCanvasHPart;
    }
}

/**
 * @param a {BigInt}
 * @param b {BigInt}
 */
function min(a, b) {
    if (a < b) return a; else return b;
}
