const scaler = 1024 * 1024;
const scalerN = BigInt(scaler);

/**
 * @param n {BigInt}
 * @param fr {number}
 * @return BigInt
 */
export function mulBigIntByFraction(n, fr) {
    return n * BigInt(Math.round(fr * scaler)) / scalerN;
}
