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

document.body.onpointerup = function(e) {
    const menuButton = document.querySelector('.menu-button');
    const mainMenu = document.querySelector('.main-menu');
    if (isDescendant(menuButton, e.target)) {
        mainMenu.classList.toggle('collapsed');
    } else if (!isDescendant(mainMenu, e.target)) {
        mainMenu.classList.add('collapsed');
    }
}

function isDescendant(ancestor, descendant) {
    let curr = descendant;
    while (curr) {
        if (ancestor === curr) {
            return true;
        }
        curr = curr.parentElement;
    }
    return false;
}

document.querySelector('#size-range').addEventListener('input', e => {
    canvas.style.height = `${e.target.value}%`;
    canvas.style.width = `${e.target.value}%`;
});
document.querySelectorAll('.menu-controls > input').forEach(input => input.addEventListener('input', render));

document.querySelector('.reset-btn').addEventListener('click', () => {
    canvas.style.removeProperty('height');
    canvas.style.removeProperty('width');
    void render();
});

document.querySelector('.reset-coords-button').onclick = function () {
    rotateBtn(this);

    history.replaceState(null, null, '/');
    initMathCoords(canvas);

    document.body.style.removeProperty('background')
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
