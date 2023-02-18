import { getMathCoords, setMathCoords, zoomCoords } from './mathCoords.mjs';
import { getMouseLocationFraction } from './trackMouseLocation.mjs';
import { render } from './render.mjs';
import { prerender } from './prerender.mjs';

export function trackWheel(canvas) {
    canvas.addEventListener('wheel', function (e) {
        e.preventDefault();

        const coords = getMathCoords(canvas);
        const originFraction = getMouseLocationFraction(canvas);
        const zoomFactor = Math.pow(1.001, -e.deltaY);

        const newCoords = zoomCoords(coords, originFraction, zoomFactor);
        setMathCoords(canvas, newCoords);

        prerender(coords);
        void render();

    }, {passive: false});
}
