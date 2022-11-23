/**
 * @param a {BigInt}
 * @param unit {BigInt}
 * @param fracPrecision {number?}
 */
export function bigIntToBigNum(a, unit, fracPrecision) {
    let aPos = (a < 0 ? -a : a);
    if (aPos / unit >= 0x4000_0000n) {
        return  [0x8000_0000, 0];
    }

    const bigNum = [];
    let significantItems = 0;
    for (let i = 0; i < (fracPrecision ? 1 + fracPrecision : 20); i++) {
        const item = aPos / unit;
        const itemNum = Number(item)
        bigNum[i] = itemNum;
        if (!fracPrecision) {
            if (itemNum || significantItems) significantItems++;
            if (significantItems === 2) {
                break;
            }
        }
        aPos = (aPos - item * unit) * 0x1_0000_0000n;
    }

    if (a < 0n) {
        bigNum[0] |= 0x4000_0000;
    }

    return bigNum;
}

