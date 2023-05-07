import { getMathCoords, mathCoordsToQuery } from './mathCoords.mjs';
import { isBigNum } from './isBigNum.mjs';
import { bigIntToBigNum } from './bigIntToBigNum.mjs';
import { renderResults } from './renderResults.mjs';
import { shuffleInPlace, splitWork } from './splitWork.mjs';
import { showToast } from './toast.mjs';

let currentRenderTaskId = 0;


export async function render(immediately = false) {
    const thisRenderTaskId = ++currentRenderTaskId;
    const renderCb = async function() {
        try {
            await render0(thisRenderTaskId);
        } catch (e) {
            document.body.innerHTML = '<div class="error-wr">' +
                '<h1>Could not run WASM script</h1>' +
                '<p>Maybe <a href="https://browser-update.org/update-browser.html" target="_blank">update your browser</a>?</p>' +
                '<p>Required browser versions: Chrome 96; Firefox 89; Safari 16.4. <a href="https://webassembly.org/roadmap/" target="_blank">More...</a></p>' +
                `<code>${e}</code>` +
                '</div>';
        }
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

let seenEmptyLocation = false;

async function render0(thisRenderTaskId) {
    if (thisRenderTaskId !== currentRenderTaskId) {
        return;
    }
    const canvas = document.getElementById('main-canvas');
    const hiddenCanvas = document.getElementById('hidden-canvas');
    // noinspection JSUnresolvedReference
    const iterationsRangeVal = document.getElementById('iterations-range').valueAsNumber;
    // noinspection JSUnresolvedReference
    const colorsRangeVal = document.getElementById('colors-range').valueAsNumber;
    // noinspection JSUnresolvedReference
    const hueRangeVal = document.getElementById('hue-range').valueAsNumber;

    const startMs = Date.now();
    const coords = getMathCoords(canvas);

    if (window.location.search === '' && !seenEmptyLocation) {
        seenEmptyLocation = true
    } else {
        history.replaceState(null, null, "?" + mathCoordsToQuery(coords));
        seenEmptyLocation = false;
    }

    const _baseIterations = Math.round(baseIterations * Math.pow(50, iterationsRangeVal / 50 - 1));
    let hNum = Number(coords.h) / Number(coords.unit);
    const zoom = 3 / hNum;
    const maxIterations = Math.max(
        _baseIterations,
        Math.round((Math.log10(zoom) + 1) * _baseIterations),
    );
    document.getElementById('max-iterations').innerText = String(maxIterations);

    const canvasW = canvas.width;
    const canvasH = canvas.height;

    const parts = shuffleInPlace([...splitWork(
        coords,
        {
            xMin: 0,
            w: canvasW,
            yMin: 0,
            h: canvasH,
        },
        Math.log2(workers.length * 8),
    )]);

    const wBigNum = parts
        .map(({coords: {w, unit}}) => isBigNum(w, unit) ? bigIntToBigNum(w, unit).length : 0)
        .reduce((l, r) => Math.max(l, r));
    document.getElementById('precision').innerText = wBigNum ? `BigNum ${wBigNum * 32}` : 'float 64';

    const renderTasksNum = parts.length;
    let renderTasksDone = 0;

    const loaderWr = document.getElementById('main-loader-wr');
    loaderWr.style.display = 'block';
    loaderWr.style.setProperty('--progress', '0%');

    setTimeout(
        function () {
            if (thisRenderTaskId === currentRenderTaskId && loaderWr.style.display === 'block') {
                showToast('Laggy? Try to decrease <b>Size</b> or <b>Iterations</b> in menu', 4000);
            }
        },
        3500,
    );

    const renderPromises = workers.map(async (worker) => {
        const resultDataArr = [];
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

            if (typeof resultData === 'string') {
                throw resultData;
            }

            if (!resultData || thisRenderTaskId !== currentRenderTaskId) {
                break;
            }

            resultDataArr.push(resultData);
            renderTasksDone++;

            const donePercent = renderTasksDone / renderTasksNum * 98;
            loaderWr.style.setProperty('--progress', `${donePercent}%`);
        }
        return resultDataArr;
    });


    const resultDataArrArr = await Promise.all(renderPromises);
    if (renderTasksDone < renderTasksNum || canvas.width !== canvasW || canvas.height !== canvasH) {
        return;
    }

    const resultDataArr = resultDataArrArr.flatMap(a => a);

    const velocity = resultDataArr.map(a => a.velocity).reduce((v, u) => v + u) / canvasW / canvasH;
    const minIterCount = resultDataArr.map(a => a.minIterCount).reduce((a, b) => a < b ? a : b);
    const maxIterCountArr = resultDataArr
        .filter(a => a.maxIterCount != null)
        .map(a => a.maxIterCount);
    const maxIterCount = maxIterCountArr.length ? maxIterCountArr.reduce((a, b) => a > b ? a : b) : undefined;
    const avgIterCount = resultDataArr.map(a => a.avgIterCount).reduce((a, b) => a + b) / resultDataArr.length;

    const medianIterCountArr = resultDataArr
        .filter(a => a.medianIterCount != null)
        .map(a => a.medianIterCount);
    medianIterCountArr.sort((a, b) => a < b ? -1 : 1);

    let rgbaTasksDone = 0;
    const rgbaPromises = workers.map(async (worker) => {
        const resultData = await runOnWorker(
            worker,
            thisRenderTaskId,
            'mapToRgba',
            {
                velocity,
                minIterCount,
                maxIterCount,
                avgIterCount,
                medianIterCount: medianIterCountArr.length ? medianIterCountArr[Math.floor(medianIterCountArr.length /2)] : undefined,
                colorsRangeVal,
                hueRangeVal,
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

    loaderWr.style.removeProperty('display');
    loaderWr.style.setProperty('--progress', '0%');

    renderResults(canvas, hiddenCanvas, coords, rgbaParts, false);

    document.getElementById('done-in').innerText = `${Date.now() - startMs} ms`;
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
