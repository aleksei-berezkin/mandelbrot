/**
 * @param canvas {HTMLCanvasElement}
 * @param deltaFraction {{x: number, y: number}}
 */
export function prerender(canvas, deltaFraction) {
    const ctx = canvas.getContext('2d', {willReadFrequently: true});
    const {width, height} = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    ctx.putImageData(imageData, deltaFraction.x * width, -deltaFraction.y * height);
}
