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

const workers = Array.from({length: (navigator.hardwareConcurrency ?? 4) + 1})
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

    const renderTasksNum = parts.length;
    let renderTasksDone = 0;

    const loaderWr = document.getElementById('main-loader-wr');
    loaderWr.style.display = 'block';
    loaderWr.style.setProperty('--progress', '0%');

    const renderPromises = workers.map(async (worker) => {
        const resultsWithDistinctIterNum = new Set();
        while (parts.length) {
            if (thisRenderTaskId !== currentRenderTaskId) {
                break;
            }

            const part = parts.splice(0, 1)[0]
            const resultData = await runOnWorker(
                worker,
                thisRenderTaskId,
                'renderMain',
                {
                    coords: part.coords,
                    canvasCoords: part.canvasCoords,
                    maxIterations,
                },
            );

            if (!resultData || thisRenderTaskId !== currentRenderTaskId) {
                break;
            }

            resultData.distinctIterNum.forEach(iterNum => resultsWithDistinctIterNum.add(iterNum));
            renderTasksDone++;
            if (renderTasksDone === renderTasksNum) {
                loaderWr.style.removeProperty('display');
                loaderWr.style.setProperty('--progress', '0%');
            } else {
                loaderWr.style.setProperty('--progress', `${renderTasksDone / renderTasksNum * 100}%`);
            }
        }
        return resultsWithDistinctIterNum;
    });


    const resultSetsArr = await Promise.all(renderPromises);
    if (renderTasksDone < renderTasksNum || canvas.width !== canvasW || canvas.height !== canvasH) {
        return;
    }

    const distinctIterNum = resultSetsArr.reduce((s, t) => new Set([...s, ...t]));
    console.log(distinctIterNum);

    let rgbaTasksDone = 0;
    const rgbaPromises = workers.map(async (worker) => {
        const resultData = await runOnWorker(
            worker,
            thisRenderTaskId,
            'mapToRgba',
            {
                paletteDepth: 13, // TODO + (distinctIterNum.size - 1332),
            },
        );

        if (!resultData || thisRenderTaskId !== currentRenderTaskId) {
            return;
        }

        rgbaTasksDone++;
        return resultData.rgbaParts;
    });

    const rgbaParts = (await Promise.all(rgbaPromises)).flatMap(parts => parts);

    if (rgbaTasksDone < Math.min(workers.length, parts.length) || thisRenderTaskId !== currentRenderTaskId) {
        return;
    }

    renderResults(canvas, hiddenCanvas, coords, rgbaParts, false);
    document.getElementById('done-in').innerText = `Done in ${Date.now() - startMs} ms`
}

let nextWorkerCallId = 0;

const workerCallIdToMessageListener = new Map();

/**
 * @param worker {Worker}
 * @param renderTaskId {number}
 * @param commandName {string}
 * @param data {object}
 * @return {Promise<object>}
 */
async function runOnWorker(worker, renderTaskId, commandName, data) {
    const workerCallId = nextWorkerCallId++;
    return new Promise(resolve => {
        workerCallIdToMessageListener.set(workerCallId, function(data) {
            workerCallIdToMessageListener.delete(workerCallId);
            resolve(data);
        });
        worker.postMessage({renderTaskId, workerCallId, commandName, data});
    });
}

function messageFromWorkerHandler(message) {
    const {workerCallId, data} = message.data;
    workerCallIdToMessageListener.get(workerCallId)(data);
}

workers.forEach(worker => worker.onmessage = messageFromWorkerHandler);
