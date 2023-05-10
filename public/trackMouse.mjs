import { getMathCoords, moveCoords, setMathCoords } from './mathCoords.mjs';
import { render } from './render.mjs';
import { prerender } from './prerender.mjs';

export function trackMouse(canvas) {
    /**
     * @type {{x: number, y: number}}
     */
    let prevClientPoint = undefined;

    canvas.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;

        e.preventDefault();

        prevClientPoint = {x: e.clientX, y :e.clientY};

        window.document.body.style.cursor = 'grab';
    });

    canvas.addEventListener('mousemove', function(e) {
        if (e.button !== 0) return;

        if (prevClientPoint == null || e.clientX == null || e.clientY == null) {
            return;
        }

        const {width, height} = canvas.getBoundingClientRect();
        const deltaFr = {
            x: (e.clientX - prevClientPoint.x) / width,
            y: (prevClientPoint.y - e.clientY) / height,
        };

        const coords = getMathCoords(canvas);
        const newCoords = moveCoords(coords, deltaFr);
        setMathCoords(canvas, newCoords);
        prevClientPoint = {x: e.clientX, y: e.clientY};

        prerender(coords);
        void render();
    });

    const mouseupHandler = function(e) {
        if (e.button !== 0) return;

        prevClientPoint = undefined;

        window.document.body.style.removeProperty('cursor');
    };

    canvas.addEventListener('mouseup', mouseupHandler);

    canvas.addEventListener('mouseout', mouseupHandler);
}
