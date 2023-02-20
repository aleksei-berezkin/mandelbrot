import { initMathCoords, inputMathCoords, parseMathCoordsFromLocation } from './mathCoords.mjs';
import { trackCanvasSizeAndRender } from './trackCanvasSizeAndRender.mjs';
import { trackMouseLocation } from './trackMouseLocation.mjs';
import { trackWheel } from './trackWheel.mjs';
import { trackMouse } from './trackMouse.mjs';
import { trackTouch } from './trackTouch.mjs';
import { render } from './render.mjs';

const canvas = document.getElementById('main-canvas');
const hiddenCanvas = document.getElementById('hidden-canvas');

const inputCoords = parseMathCoordsFromLocation();
if (inputCoords) {
    inputMathCoords(canvas, inputCoords);
} else {
    history.replaceState(null, null, '/');
    initMathCoords(canvas);
}
trackMouseLocation(canvas);
trackCanvasSizeAndRender(canvas, hiddenCanvas);
trackWheel(canvas);
trackMouse(canvas);
trackTouch(canvas);

document.querySelectorAll('.menu-controls > input').forEach(input => input.oninput = render);
document.querySelector('.reset-btn').addEventListener('click', render);

document.querySelector('.reset-coords-button').onclick = function () {
    rotateBtn(this);

    history.replaceState(null, null, '/');
    initMathCoords(canvas);

    canvas.style.removeProperty('background-color')
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    void render(true);
}

function rotateBtn(btn) {
    if (!btn.style.transform) {
        btn.style.transform = 'rotate(360deg)';
    } else {
        const degStr = /rotate\((\d+)deg\)/.exec(btn.style.transform)[1];
        btn.style.transform = `rotate(${Number(degStr) + 360}deg)`;
    }
}
