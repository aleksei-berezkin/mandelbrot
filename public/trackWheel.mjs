import { getMathCoords, setMathCoords, zoomCoords } from './mathCoords.mjs';
import { getMouseLocationFraction } from './trackMouseLocation.mjs';
import { render } from './render.mjs';

/**
 * @param canvas {HTMLCanvasElement}
 */
export function trackWheel(canvas) {
    window.addEventListener('wheel', function (e) {
        e.preventDefault();

        const coords = getMathCoords(canvas);
        const originFraction = getMouseLocationFraction(canvas);
        const zoomFactor = Math.pow(1.001, -e.deltaY);

        const newCoords = zoomCoords(coords, originFraction, zoomFactor);
        setMathCoords(canvas, newCoords);

        setTimeout(() => render(canvas), 100);

    }, {passive: false});
}
