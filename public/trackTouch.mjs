/**
 * @param canvas {HTMLCanvasElement}
 */
export function trackTouch(canvas) {
    canvas.addEventListener("touchstart", e => {
        e.preventDefault();
    }, {passive: false});

    canvas.addEventListener('touchmove', e => {

    }, {passive: false});

    canvas.addEventListener('touchend', e => {

    }, {passive: false});
}