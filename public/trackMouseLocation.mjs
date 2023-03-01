export function trackMouseLocation(canvas) {
    canvas.addEventListener('mousemove', function(e) {
        canvas.dataset.mouseOffsetX = String(e.offsetX);
        canvas.dataset.mouseOffsetY = String(e.offsetY);
    });
}

/**
 * @return {{x: number, y: number}} {0, 0} is bottom-left, {1, 1} is top-right
 */
export function getMouseLocationFraction(canvas) {
    const mouseOffsetX = canvas.dataset.mouseOffsetX;
    const mouseOffsetY = canvas.dataset.mouseOffsetY;
    if (mouseOffsetX == null || mouseOffsetY == null) {
        return {x: .5, y: .5};
    }

    const {width, height} = canvas.getBoundingClientRect();
    return {
        x: Number(mouseOffsetX) / width,
        y: (height - Number(mouseOffsetY)) / height,
    };
}
