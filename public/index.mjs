import { drawScene } from './drawScene.mjs';
import { getMathCoords, initMathCoords, setMathCoords } from './coords.mjs';
import { trackCanvasSize } from './canvasSize.mjs';
import { getMouseLocationFraction, trackMouseLocation } from './mouseLocation.mjs';
import { mulBigIntByFraction } from './mulBigIntByFraction.mjs';

const canvas = document.getElementById('main-canvas');

initMathCoords(canvas);

trackCanvasSize(canvas);
trackMouseLocation(canvas);

let timer = 0;
window.addEventListener('wheel', function (e) {
    e.preventDefault();

    const {unit, xMin, yMin, w, h} = getMathCoords(canvas);
    const [frX, frY] = getMouseLocationFraction(canvas, unit);

    const x = xMin + mulBigIntByFraction(w, frX);
    const y = yMin + mulBigIntByFraction(h, frY);

    const scale = Math.pow(1.001, e.deltaY);

    // zoom preserving point under mouse:
    // newXMin + newW * frX = x
    // newYMin + newH * frY = y
    const newW = mulBigIntByFraction(w, scale);
    const newH = mulBigIntByFraction(h, scale);
    const newXMin = x - mulBigIntByFraction(newW, frX);
    const newYMin = y - mulBigIntByFraction(newH, frY);

    setMathCoords(canvas, {unit, xMin: newXMin, w: newW, yMin: newYMin, h: newH});

    if (!timer) {
        timer = setTimeout(() => {
            draw();
            timer = 0;
        }, 1000);
    }
    // draw();
}, {passive: false});

let dragStartX = undefined;
let dragStartY = undefined;

window.addEventListener('mousedown', function(e) {
    dragStartX = e.clientX;
    dragStartY = e.clientY;
});

let translateX = 0;
let translateY = 0;
window.addEventListener('mousemove', function(e) {
    if (dragStartX != null && dragStartY != null && e.clientX != null && e.clientY != null) {
        translateX -= (dragStartX - e.clientX);
        translateY -= (dragStartY - e.clientY);
    }
    // draw();
});

window.addEventListener('mouseup', function(e) {
    dragStartX = undefined;
    dragStartY = undefined;
})

function draw() {
    const {unit, xMin, yMin, w, h} = getMathCoords(canvas);
    drawScene(canvas, unit, xMin, yMin, w, h);
}

draw();
