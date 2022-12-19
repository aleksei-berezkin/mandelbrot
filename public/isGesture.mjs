export function isGesture(event) {
    const tNum = event.touches?.length;
    return tNum && tNum >= 2;
}
