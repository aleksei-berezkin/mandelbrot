import { getMathCoords } from './mathCoords.mjs';

let pending = 0;

export async function draw(canvas) {
    if (++pending > 1) {
        return;
    }

    do {
        const acquired = pending;
        await sendToWorker(canvas);
        pending = Math.max(pending - acquired, 0);
    } while (pending);
}

const drawWorker = new Worker('drawWorker.js');

/**
 * @param canvas {HTMLCanvasElement}
 */
async function sendToWorker(canvas) {
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
