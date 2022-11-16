import { render } from './render.mjs';
import { getMathCoords, initMathCoords, setMathCoords } from './mathCoords.mjs';
import { trackCanvasSizeAndRender } from './trackCanvasSizeAndRender.mjs';
import { getMouseLocationFraction, trackMouseLocation } from './trackMouseLocation.mjs';
import { mulBigIntByFraction } from './mulBigIntByFraction.mjs';

const canvas = document.getElementById('main-canvas');

initMathCoords(canvas);
trackMouseLocation(canvas);

trackCanvasSizeAndRender(canvas);

let timer = 0;
window.addEventListener('wheel', function (e) {
    e.preventDefault();

    const {unit, xMin, yMin, w, h} = getMathCoords(canvas);
    const [frX, frY] = getMouseLocationFraction(canvas);

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
        timer = setTimeout(async() => {
            await render(canvas);
            timer = 0;
        }, 1000);
    }

    setTimeout(() => render(canvas), 100);

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
    // render();
});

window.addEventListener('mouseup', function(e) {
    dragStartX = undefined;
    dragStartY = undefined;
})
