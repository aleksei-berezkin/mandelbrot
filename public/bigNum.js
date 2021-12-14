// Arbitrary precision fixed-point arithmetic. See BigNum.java

// ---- Start of transpiled region ----
const minSignificantDigits = 2;
const intSize = 1;
const maxSize = 100;

export function bigIntToBigNum(x, unit, size) {
    if (unit <= 0n || size != null && (size <= intSize || size > maxSize)) {
        throw new Error('Bad input');
    }

    const isNeg = x < 0n;
    if (isNeg) {
        x = -x;
    }
    let intPart = Number(x / unit);
    const c = [];
    let significantIntDigits = 0;
    for (let i = 0; i < intSize; i++) {
        const d = intPart & 0xffff;
        c.push(d);
        intPart = intPart >>> 16;
        if (d !== 0) {
            significantIntDigits = i + 1;
        }
    }
    c.reverse();

    let frPart = x % unit;
    let val = unit;
    let significantFrDigits = 0;
    // Allow at least 1 fractional digit
    for (let i = intSize; i < maxSize; i++) {
        let d = 0;
        if (val !== 0n) {
            for (let j = 15; j >= 0; j--) {
                val = val / 2n;
                if (val === 0n) {
                    break;
                }
                if (frPart >= val) {
                    d |= 1 << j;
                    frPart = frPart - val;
                }
            }
        }
        c.push(d);
        if (d !== 0 || significantIntDigits > 0 || significantFrDigits > 0) {
            significantFrDigits++;
        }
        if (size != null) {
            if (c.length >= size) {
                break;
            }
        } else if (significantIntDigits + significantFrDigits >= minSignificantDigits) {
            break;
        }
    }

    if (isNeg) {
        c[0] = c[0] | 1 << 31;
    }
    return c;
}
// ---- End of transpiled region ----

