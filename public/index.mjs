import {
    fitCoords,
    initMathCoords,
    parseMathCoordsFromLocation,
    setMathCoords
} from './mathCoords.mjs';
import { trackMouseLocation } from './trackMouseLocation.mjs';
import { trackWheel } from './trackWheel.mjs';
import { trackMouse } from './trackMouse.mjs';
import { trackTouch } from './trackTouch.mjs';
import { render } from './render.mjs';
import { showToast } from './toast.mjs';

const canvas = document.getElementById('main-canvas');

const inputCoords = parseMathCoordsFromLocation();
if (inputCoords) {
    setMathCoords(canvas, inputCoords);
    fitCoords(canvas);
} else {
    history.replaceState(null, null, '/');
    initMathCoords(canvas);
}

trackMouseLocation(canvas);
trackWheel(canvas);
trackMouse(canvas);
trackTouch(canvas);

window.addEventListener('resize', () => {
    setCanvasSize();
    fitCoords(canvas);
    void render();
});

document.body.onpointerup = function(e) {
    const menuButton = document.querySelector('.menu-button');
    const mainMenu = document.querySelector('.main-menu');
    if (isDescendant(menuButton, e.target)) {
        mainMenu.classList.toggle('collapsed');
    } else if (!isDescendant(mainMenu, e.target)) {
        mainMenu.classList.add('collapsed');
    }
}

document.querySelectorAll('.menu-controls > input').forEach(input => input.addEventListener('input', render));

document.querySelector('#size-range').addEventListener('input', e => {
    canvas.style.setProperty('--size', `${e.target.value}`);
    setCanvasSize();
    void render();
});

document.querySelector('.reset-btn').addEventListener('click', () => {
    canvas.style.removeProperty('--size');
    setCanvasSize();
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

function setCanvasSize() {
    const canvas = document.getElementById('main-canvas');
    const hiddenCanvas = document.getElementById('hidden-canvas');

    const bodyRect = document.body.getBoundingClientRect();
    const sizeProp = Number(canvas.style.getPropertyValue('--size') || 100);
    const roundedWidth = Math.round(bodyRect.width * sizeProp / 100);
    const roundedHeight = Math.round(bodyRect.height * sizeProp / 100);

    canvas.style.width = `${roundedWidth}px`;
    canvas.style.height = `${roundedHeight}px`;

    const ddp = window.devicePixelRatio ?? 1;
    canvas.width = roundedWidth * ddp;
    canvas.height = roundedHeight * ddp;
    hiddenCanvas.width = canvas.width;
    hiddenCanvas.height = canvas.height;
}

setCanvasSize(true);
void render(true);

setTimeout(() => showToast('Zoom & drag to explore'), 1000);

// Util

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

function rotateBtn(btn) {
    if (!btn.style.transform) {
        btn.style.transform = 'rotate(360deg)';
    } else {
        const degStr = /rotate\((\d+)deg\)/.exec(btn.style.transform)[1];
        btn.style.transform = `rotate(${Number(degStr) + 360}deg)`;
    }
}
