const scaler = 10_000_000;
const scalerN = BigInt(scaler);

/**
 * @param a {BigInt}
 * @param b {number}
 * @return BigInt
 */
export function mulBigIntByNum(a, b) {
    return a * BigInt(Math.round(b * scaler)) / scalerN;
}

/**
 * @param a {BigInt}
 * @param b {BigInt}
 * @return {Number}
 */
export function divToNum(a, b) {
    return Number(a * scalerN / b) / scaler;
}
