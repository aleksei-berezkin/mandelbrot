import { render } from './render.mjs';

export function trackCanvasSizeAndRender(canvas) {
    function setCanvasSize() {
        const rect = canvas.getBoundingClientRect();
        const ddp = window.devicePixelRatio ?? 1;
        canvas.width = rect.width * ddp;
        canvas.height = rect.height * ddp;
        void render(canvas);
    }
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();
}
