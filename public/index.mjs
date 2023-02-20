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
    history.replaceState(null, null, '/');
    initMathCoords(canvas);
    void render();
}
