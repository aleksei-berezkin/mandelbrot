import { getMathCoords, setMathCoords } from './mathCoords.mjs';
import { mulBigIntByFraction } from './mulBigIntByFraction.mjs';
import { render } from './render.mjs';

/**
 * @param canvas {HTMLCanvasElement}
 */
export function trackMove(canvas) {
    let dragStartXMin = undefined;
    let dragStartYMin = undefined;
    let dragStartClientX = undefined;
    let dragStartClientY = undefined;

    window.addEventListener('mousedown', function(e) {
        e.preventDefault();
        dragStartClientX = e.clientX;
        dragStartClientY = e.clientY;
        const {xMin, yMin} = getMathCoords(canvas);
        dragStartXMin = xMin;
        dragStartYMin = yMin;
        window.document.body.style.cursor = 'grab';
    });

    window.addEventListener('mousemove', function(e) {
        if (dragStartXMin == null || dragStartYMin == null || dragStartClientX == null || dragStartClientY == null || e.clientX == null || e.clientY == null) {
            return;
        }

        const {width, height} = canvas.getBoundingClientRect();
        const translateXFr = (e.clientX - dragStartClientX) / width;
        const translateYFr = (e.clientY - dragStartClientY) / height;

        let {unit, w, h} = getMathCoords(canvas);

        const xMin = dragStartXMin - mulBigIntByFraction(w, translateXFr);
        const yMin = dragStartYMin + mulBigIntByFraction(h, translateYFr);

        setMathCoords(canvas, {unit, xMin, w, yMin, h});

        void render(canvas);
    });

    window.addEventListener('mouseup', function(e) {
        dragStartXMin = undefined;
        dragStartYMin = undefined;
        dragStartClientX = undefined;
        dragStartClientY = undefined;
        window.document.body.style.removeProperty('cursor');
    })
}
