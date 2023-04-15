/**
 * @param a {BigInt}
 * @param unit {BigInt}
 * @param fracPrecision {number?}
 */
export function bigIntToBigNum(a, unit, fracPrecision) {
    const precision = fracPrecision + 1;
    let aPos = (a < 0 ? -a : a);
    const bigNum = [];
    let significantBits = 0;
    for (let i = 0; i < (fracPrecision ? 1 + fracPrecision : 12); i++) {
        const item = aPos / unit;
        const itemNum = Number(item)
        bigNum[i] = itemNum;
        if (!fracPrecision) {
            const itemSignificantBits = getSignificantBits(itemNum);
            if (significantBits) {
                significantBits += 32;
            } else {
                significantBits = itemSignificantBits;
            }
            if (significantBits >= 14) {
                break;
            }
        }
        aPos = (aPos - item * unit) * 0x1_0000_0000n;
    }

    if (a < 0n) {
        // Bitwise ops coerce to u32 that's why through BigInt
        let cOut = 1n;
        for (let i = precision - 1; i >= 0; i--) {
            const d = (BigInt(bigNum[i]) ^ 0xffff_ffffn) + cOut;
            bigNum[i] = Number(d & 0xffff_ffffn);
            cOut = d >> 32n;
        }
    }

    return bigNum;
}

/**
 * @param num {number}
 */
function getSignificantBits(num) {
    return num ? Math.ceil(Math.log2(num + 1)) : 0;
}
