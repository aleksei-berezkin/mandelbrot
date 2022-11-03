export function trackCanvasSize(canvas) {
    function setCanvasSize() {
        const rect = canvas.getBoundingClientRect();
        const ddp = window.devicePixelRatio ?? 1;
        canvas.width = rect.width * ddp;
        canvas.height = rect.height * ddp;
    }
    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();
}

