import { getMathCoords, moveCoords, setMathCoords, zoomCoords } from './mathCoords.mjs';
import { render } from './render.mjs';
import { prerender } from './prerender.mjs';
import { zoomByDoublePointer } from './zoomByDoublePointer.mjs';

export function trackTouch(canvas) {

    /**
     * @type {TouchList}
     */
    let prevTouches = undefined;
    let firstCenter = undefined;

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();

        prevTouches = e.touches;
        firstCenter = getCenter(e.touches, canvas);

    }, {passive: false});

    canvas.addEventListener('touchmove', e => {
        if (!prevTouches) return;

        const {width, height} = canvas.getBoundingClientRect();

        const prevCenter = getCenter(prevTouches, canvas);
        const newCenter = getCenter(e.touches, canvas);
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

        prerender(coords);

        void render();

    }, {passive: false});

    let prevTouchEnd;

    canvas.addEventListener('touchend', () => {
        if (!prevTouches || !firstCenter) return;

        const prevCenter = getCenter(prevTouches, canvas);
        if (prevTouches.length === 1
            && Math.hypot(prevCenter.x - firstCenter.x, prevCenter.y - firstCenter.y) < 10
        ) {
            if (prevTouchEnd != null && Date.now() - prevTouchEnd < 1000) {
                const {width, height} = canvas.getBoundingClientRect();
                zoomByDoublePointer(canvas, {
                    x: prevCenter.x / width,
                    y: 1 - prevCenter.y / height
                });
                prevTouchEnd = undefined;
            } else {
                prevTouchEnd = Date.now();
            }
        } else {
            prevTouchEnd = undefined;
        }

        firstCenter = undefined;
        prevTouches = undefined;
    }, {passive: false});
}

/**
 * @param touches {TouchList}
 * @param canvas {HTMLCanvasElement}
 * @return {{x: number, y: number}}
 */
function getCenter(touches, canvas) {
    if (touches.length < 1) {
        return {x: canvas.width / 2, y: canvas.height / 2};
    }
    const {x: canvasX, y: canvasY} = canvas.getBoundingClientRect();
    return [...touches].reduce(
        (avg, touch) => ({
            x: avg.x + (touch.clientX - canvasX) / touches.length,
            y: avg.y + (touch.clientY - canvasY) / touches.length,
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
