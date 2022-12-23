import { getMathCoords, moveCoords, setMathCoords, zoomCoords } from './mathCoords.mjs';
import { render } from './render.mjs';

/**
 * @param canvas {HTMLCanvasElement}
 */
export function trackTouch(canvas) {

    /**
     * @type {TouchList}
     */
    let prevTouches = undefined;

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();

        prevTouches = e.touches;
    }, {passive: false});

    canvas.addEventListener('touchmove', e => {
        if (!prevTouches) return;

        const {width, height} = canvas.getBoundingClientRect();

        const prevCenter = getCenter(prevTouches);
        const newCenter = getCenter(e.touches);
        const newCenterFr = {
            x: newCenter.x / width,
            y: 1 - newCenter.y / height,
        };
        const moveDeltaFr = {
            x: (newCenter.x - prevCenter.x) / width,
            y: (prevCenter.y - newCenter.y) / height,
        };
        const prevPinchSize = getPinchSize(prevTouches);
        const newPinchSize = getPinchSize(e.touches);

        const coords = getMathCoords(canvas);
        const movedCoords = moveCoords(coords, moveDeltaFr);
        const zoomedCoords = zoomCoords(movedCoords, newCenterFr, newPinchSize / prevPinchSize);

        setMathCoords(canvas, zoomedCoords);

        prevTouches = e.touches;

        setTimeout(() => render(canvas), 100);

    }, {passive: false});

    canvas.addEventListener('touchend', e => {
        if (!prevTouches) return;

        prevTouches = undefined;

    }, {passive: false});
}

/**
 * @param touches {TouchList}
 * @return {{x: number, y: number}}
 */
function getCenter(touches) {
    if (touches.length < 1) {
        return {x: .5, y: .5};
    }
    return [...touches].reduce(
        (avg, touch) => ({
            x: avg.x + touch.clientX / touches.length,
            y: avg.y + touch.clientY / touches.length,
        }),
        {x: 0, y: 0},
    );
}

/**
 * @param touches {TouchList}
 * @return {number}
 */
function getPinchSize(touches) {
    if (touches.length < 2) {
        return 1;
    }

    return Math.hypot(
        touches[1].clientX - touches[0].clientX,
        touches[1].clientY - touches[0].clientY,
    )
}
