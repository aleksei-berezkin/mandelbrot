/**
 * @param a {BigInt}
 * @param unit {BigInt}
 * @param fracPrecision {number?}
 */
export function bigIntToBigNum(a, unit, fracPrecision) {
    let aPos = (a < 0 ? -a : a);
    const bigNum = [];
    let significantBits = 0;
    for (let i = 0; i < (fracPrecision ? 1 + fracPrecision : 20); i++) {
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
        // Bitwise ops coerce to u32 that's why + not |
        bigNum[0] += 0x8000_0000;
    }

    return bigNum;
}

/**
 * @param num {number}
 */
function getSignificantBits(num) {
    return num ? Math.ceil(Math.log2(num + 1)) : 0;
}
