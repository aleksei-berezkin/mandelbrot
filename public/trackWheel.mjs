import { getMathCoords, setMathCoords } from './mathCoords.mjs';
import { getMouseLocationFraction } from './trackMouseLocation.mjs';
import { mulBigIntByFraction } from './mulBigIntByFraction.mjs';
import { render } from './render.mjs';

/**
 * @param canvas {HTMLCanvasElement}
 */
export function trackWheel(canvas) {
    window.addEventListener('wheel', function (e) {
        e.preventDefault();

        const {unit, xMin, yMin, w, h} = getMathCoords(canvas);
        const [frX, frY] = getMouseLocationFraction(canvas);

        const x = xMin + mulBigIntByFraction(w, frX);
        const y = yMin + mulBigIntByFraction(h, frY);

        const scale = Math.pow(1.001, e.deltaY);

        // zoom preserving point under mouse:
        // newXMin + newW * frX = x
        // newYMin + newH * frY = y
        const newW = mulBigIntByFraction(w, scale);
        const newH = mulBigIntByFraction(h, scale);
        const newXMin = x - mulBigIntByFraction(newW, frX);
        const newYMin = y - mulBigIntByFraction(newH, frY);

        setMathCoords(canvas, {unit, xMin: newXMin, w: newW, yMin: newYMin, h: newH});

        setTimeout(() => render(canvas), 100);

    }, {passive: false});
}
