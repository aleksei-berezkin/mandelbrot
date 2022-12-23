import { isGesture } from './isGesture.mjs';

/**
 * @param canvas {HTMLCanvasElement}
 */
export function trackTouch(canvas) {

    canvas.addEventListener('touchstart', e => {
        console.log('touchstart', e.touches);
        if (!isGesture(e)) return;

        e.preventDefault();
    }, {passive: false});

    canvas.addEventListener('touchmove', e => {
        console.log('touchmove', e.touches);
        if (!isGesture(e)) return;

    }, {passive: false});

    canvas.addEventListener('touchend', e => {
        if (!isGesture(e)) return;

    }, {passive: false});
}
