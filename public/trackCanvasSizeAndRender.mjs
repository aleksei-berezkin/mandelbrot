import { render } from './render.mjs';
import { getMathCoords, setMathCoords } from './mathCoords.mjs';
import { mulBigIntByNum } from './bigIntArithHelper.mjs';

let initial = true;
const ddp = window.devicePixelRatio ?? 1;

export function trackCanvasSizeAndRender() {
    window.addEventListener('resize', setCanvasSizeAndRender);
    setCanvasSizeAndRender();
}

export function setCanvasSizeAndRender() {
    const canvas = document.getElementById('main-canvas');
    const hiddenCanvas = document.getElementById('hidden-canvas');

    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ddp;
    canvas.height = rect.height * ddp;
    hiddenCanvas.width = canvas.width;
    hiddenCanvas.height = canvas.height;
    const renderImmediately = initial;
    if (initial) {
        initial = false;
    } else {
        resizeMathCoords(canvas, oldWidth, oldHeight);
    }
    void render(renderImmediately);
}

/**
 * @param canvas {HTMLCanvasElement}
 * @param oldWidth {number}
 * @param oldHeight {number}
 */
function resizeMathCoords(canvas, oldWidth, oldHeight) {
    const {unit, xMin, w, yMin, h} = getMathCoords(canvas);

    // 1) Center of the figure and 2) visible scale must remain
    // w / oldWidth == newW / newWidth
    // h / oldHeight == newH / newHeight
    const newW = mulBigIntByNum(w, canvas.width / oldWidth);
    const newH = mulBigIntByNum(h, canvas.height / oldHeight);
    const newXMin = xMin + (w - newW) / 2n;
    const newYMin = yMin + (h - newH) / 2n;

    setMathCoords(canvas, {unit, xMin: newXMin, w: newW, yMin: newYMin, h: newH});
}
