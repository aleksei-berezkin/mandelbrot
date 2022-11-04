import {draw} from "./draw.mjs";

export function trackCanvasSizeAndDraw(canvas) {
    function setCanvasSize() {
        const rect = canvas.getBoundingClientRect();
        const ddp = window.devicePixelRatio ?? 1;
        canvas.width = rect.width * ddp;
        canvas.height = rect.height * ddp;
        void draw(canvas);
    }
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();
}
