import { isGesture } from './isGesture.mjs';

/**
 * @param canvas {HTMLCanvasElement}
 */
export function trackZoom(canvas) {
    canvas.addEventListener("touchstart", e => {
        if (!isGesture(e)) return;

        e.preventDefault();
    }, {passive: false});

    canvas.addEventListener('touchmove', e => {
        if (!isGesture(e)) return;

    }, {passive: false});

    canvas.addEventListener('touchend', e => {
        if (!isGesture(e)) return;

    }, {passive: false});
}
