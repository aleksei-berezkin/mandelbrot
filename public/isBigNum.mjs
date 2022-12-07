/**
 * @param w {BigInt}
 * @param unit {BigInt}
 */
export function isBigNum(w, unit) {
    const wNum = Number(w) / Number(unit);
    return wNum < 1e-12
}
