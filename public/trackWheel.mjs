import { getMathCoords, setMathCoords, zoomCoords } from './mathCoords.mjs';
import { getMouseLocationFraction } from './trackMouseLocation.mjs';
import { render } from './render.mjs';
import { prerender } from './prerender.mjs';

export function trackWheel(canvas) {
    canvas.addEventListener('wheel', function (e) {
        e.preventDefault();

        const coords = getMathCoords(canvas);
        const originFraction = getMouseLocationFraction(canvas);
        const zoomFactor = 1 - toZoomDelta(e.deltaY);

        const newCoords = zoomCoords(coords, originFraction, zoomFactor);
        setMathCoords(canvas, newCoords);

        prerender(coords);
        void render();

    }, {passive: false});
}


function toZoomDelta(delta) {
    const compressThreshold = 26;

    const compressedDelta = Math.abs(delta) <= compressThreshold
        ? delta
        : Math.sign(delta) * (compressThreshold + (Math.abs(delta) - compressThreshold) * .3);

    return Math.min(.8, compressedDelta * .009);
}
