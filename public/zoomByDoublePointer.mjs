import { getMathCoords, setMathCoords, zoomCoords } from './mathCoords.mjs';
import { prerender } from './prerender.mjs';
import { render } from './render.mjs';

export function zoomByDoublePointer(canvas, originFraction) {
    let coords = getMathCoords(canvas);

    let currentZoom = 1.0;
    const targetZoom = 3.1;

    const txMs = 450;
    const startMs = Date.now();

    function animateZoomStep() {
        const zoomProgress = (Date.now() - startMs) / txMs;
        const _currentZoom = 1 + easeProgress(zoomProgress) * (targetZoom - 1.0);
        const zoomStep = 1 + _currentZoom - currentZoom;

        const newCoords = zoomCoords(coords, originFraction, zoomStep);
        setMathCoords(canvas, newCoords);

        prerender(coords);

        currentZoom = _currentZoom;
        coords = newCoords;

        if (currentZoom >= targetZoom) {
            void render(true);
        } else {
            requestAnimationFrame(animateZoomStep);
        }
    }

    requestAnimationFrame(animateZoomStep);
}


function easeProgress(progress) {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;

    return binSearchPoint(progress, 0, bezierPoints.length);
}

function binSearchPoint(progress, from, bound) {
    if (from >= bound) {
        const left = bezierPoints[from - 1];
        const right = bezierPoints[from]
        const betweenProgress = (progress - left[0]) / (right[0] - left[0]);
        return (1 - betweenProgress) * left[1] + betweenProgress * right[1];
    }

    const mid = Math.floor((from + bound) / 2);
    if (progress < bezierPoints[mid][0]) {
        return binSearchPoint(progress, from, mid);
    } else {
        return binSearchPoint(progress, mid + 1, bound);
    }
}

const bezierPoints = Array.from({length: 32});

// const P1 = [0, 0];
const P2 = [.32, .18]
const P3 = [.25, 1]
// const P4 = [1, 1];

for (let pIx = 0; pIx < bezierPoints.length; pIx++) {
    const t = pIx / (bezierPoints.length - 1); // [0, 1]
    bezierPoints[pIx] = [0, 1].map(i =>
        // (1 - t) ** 3 * P1[i] == 0
        + 3 * (1 - t) ** 2 * t * P2[i]
        + 3 * (1 - t) * t ** 2 * P3[i]
        + t ** 3 // * P4[i] == 1
    );
}
