import { getMathCoords, mathCoordsToQuery } from './mathCoords.mjs';
import { isBigNum } from './isBigNum.mjs';
import { bigIntToBigNum } from './bigIntToBigNum.mjs';
import { renderResults } from './renderResults.mjs';
import { splitWork } from './splitWork.mjs';

let currentRenderTaskId = 0;


export async function render(canvas, hiddenCanvas, immediately = false) {
    const thisRenderTaskId = ++currentRenderTaskId;
    const renderCb = async function() {
        await render0(canvas, hiddenCanvas, thisRenderTaskId);
    }

    if (immediately) {
        void renderCb();
    } else {
        setTimeout(renderCb, 250);
    }
}

const baseIterations = 2000;

const workers = Array.from({length: navigator.hardwareConcurrency ?? 4})
    .map(() => new Worker('renderWorker.js'));

let initial = true;

async function render0(canvas, hiddenCanvas, thisRenderTaskId) {
    if (thisRenderTaskId !== currentRenderTaskId) {
        return;
    }

    const startMs = Date.now();
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
        coords,
        {
            xMin: 0,
            w: canvasW,
            yMin: 0,
            h: canvasH,
        },
        Math.log2(workers.length * 8),
    )];

    const tasksNum = parts.length;
    let tasksDone = 0;

    const loaderWr = document.getElementById('main-loader-wr');
    loaderWr.style.display = 'block';
    loaderWr.style.setProperty('--progress', '0%');

    const workerPromises = workers.map(async worker => {
        const results = [];
        while (parts.length) {
            if (thisRenderTaskId !== currentRenderTaskId) {
                break;
            }

            const part = parts.splice(0, 1)[0]
            const rgbaArray = await renderOnWorker(
                worker,
                part.coords,
                part.canvasCoords,
                maxIterations,
            );

            if (thisRenderTaskId !== currentRenderTaskId) {
                break;
            }

            results.push({
                rgbaArray,
                canvasCoords: part.canvasCoords,
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
    document.getElementById('done-in').innerText = `Done in ${Date.now() - startMs} ms`
}

let nextWorkerTaskId = 0;

const workerTaskIdToMessageListener = new Map();

/**
 * @param worker {Worker}
 * @param coords {Coords}
 * @param canvasCoords {CanvasCoords}
 * @param maxIterations {number}
 * @return {Promise<Uint8ClampedArray>}
 */
async function renderOnWorker(worker, coords, canvasCoords, maxIterations) {
    const workerTaskId = nextWorkerTaskId++;
    return new Promise(resolve => {
        workerTaskIdToMessageListener.set(workerTaskId, function(rgbaArray) {
            workerTaskIdToMessageListener.delete(workerTaskId);
            resolve(rgbaArray);
        });
        worker.postMessage({workerTaskId, coords, canvasCoords, maxIterations});
    });
}

function messageFromWorkerHandler(message) {
    const {workerTaskId, rgbaArray} = message.data;
    workerTaskIdToMessageListener.get(workerTaskId)(rgbaArray);
}

workers.forEach(worker => worker.onmessage = messageFromWorkerHandler);
