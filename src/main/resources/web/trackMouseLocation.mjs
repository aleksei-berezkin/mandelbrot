export function trackMouseLocation(canvas) {
    canvas.addEventListener('mousemove', function(e) {
        canvas.dataset.mouseOffsetX = e.offsetX;
        canvas.dataset.mouseOffsetY = e.offsetY;
    });
}

/**
 * @return {[number, number]} [0, 0] is bottom-left, [1, 1] is top-right
 */
export function getMouseLocationFraction(canvas) {
    const {width, height} = canvas.getBoundingClientRect();
    const ds = canvas.dataset;
    const mouseOffsetX = Number(ds.mouseOffsetX ?? 0);
    const mouseOffsetY = height - Number(ds.mouseOffsetY ?? 0);

    return [
        mouseOffsetX / width,
        mouseOffsetY / height,
    ];
}
