import { getMathCoords, moveCoords, setMathCoords } from './mathCoords.mjs';
import { render } from './render.mjs';
import { isGesture } from './isGesture.mjs';

/**
 * @param canvas {HTMLCanvasElement}
 */
export function trackMouse(canvas) {
    /**
     * @type {{x: number, y: number}}
     */
    let prevClientPoint = undefined;

    window.addEventListener('mousedown', function(e) {
        if (isGesture(e)) return;

        e.preventDefault();

        prevClientPoint = {x: e.clientX, y :e.clientY};

        window.document.body.style.cursor = 'grab';
    });

    window.addEventListener('mousemove', function(e) {
        if (isGesture(e)) return;

        if (prevClientPoint == null || e.clientX == null || e.clientY == null) {
            return;
        }

        const {width, height} = canvas.getBoundingClientRect();
        const deltaFr = {
            x: (e.clientX - prevClientPoint.x) / width,
            y: (e.clientY - prevClientPoint.y) / height,
        };

        const coords = getMathCoords(canvas);
        const newCoords = moveCoords(coords, deltaFr);
        setMathCoords(canvas, newCoords);
        prevClientPoint = {x: e.clientX, y: e.clientY};

        void render(canvas);
    });

    window.addEventListener('mouseup', function(e) {
        if (isGesture(e)) return;

        prevClientPoint = undefined;

        window.document.body.style.removeProperty('cursor');
    })
}
