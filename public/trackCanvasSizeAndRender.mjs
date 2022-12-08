import { render } from './render.mjs';
import {getMathCoords, setMathCoords} from "./mathCoords.mjs";
import {mulBigIntByFraction} from "./mulBigIntByFraction.mjs";

let initial = true;
const ddp = window.devicePixelRatio ?? 1;

export function trackCanvasSizeAndRender(canvas) {
    function setCanvasSize() {
        const oldWidth = canvas.width;
        const oldHeight = canvas.height;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * ddp;
        canvas.height = rect.height * ddp;
        if (initial) {
            initial = false;
        } else {
            resizeMathCoords(canvas, oldWidth, oldHeight);
        }
        void render(canvas);
    }
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();
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
    const newW = mulBigIntByFraction(w, canvas.width / oldWidth);
    const newH = mulBigIntByFraction(h, canvas.height / oldHeight);
    const newXMin = xMin + (w - newW) / 2n;
    const newYMin = yMin + (h - newH) / 2n;

    setMathCoords(canvas, {unit, xMin: newXMin, w: newW, yMin: newYMin, h: newH});
}
