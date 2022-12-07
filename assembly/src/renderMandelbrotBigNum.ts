// noinspection JSUnusedGlobalSymbols

/*
 * Arbitrary-precision fixed-point numbers. Stored as u32 components, most significant component first.
 * The most significant component is an integer part, and it always has one component. Fractional part size
 * (fracPrecision) varies, minimum is 1.
 *
 * Integer part stores also 2 flags: overflow (0x8000_0000) and negative (0x4000_0000).
 * So the greatest (by abs) number is 0x3fff_ffff.0xffff_ffff... (= 1_073_741_823.99999...).
 */

import { memset } from 'util/memory';

export function renderMandelbrot(canvasW: u32, canvasH: u32, maxIterations: u32, fracPrecision: u32): void {
    const precision = intPrecision + fracPrecision;

    const xMinPtr = 0;
    const wPtr = 4 * precision;
    const yMinPtr = 2 * 4 * precision;
    const hPtr = 3 * 4 * precision;
    const yMaxPtr = 4 * 4 * precision;
    const t0Ptr = 5 * 4 * precision;
    const t1Ptr = 6 * 4 * precision;
    const t2Ptr = 7 * 4 * precision;

    const wStepFractionPtr = 8 * 4 * precision;
    const hStepFractionPtr = 9 * 4 * precision;

    const x0Ptr = 10 * 4 * precision;
    const y0Ptr = 11 * 4 * precision;
    let xPtr = 12 * 4 * precision;
    let yPtr = 13 * 4 * precision;
    let xNextPtr = 14 * 4 * precision;
    let yNextPtr = 15 * 4 * precision;

    const outArrayOffset = 16 * 4 * precision;

    add(yMinPtr, hPtr, yMaxPtr, fracPrecision);

    // wStepFraction = w * (1.0 / canvasW)(t0)
    fromDouble(1.0 / (canvasW as f64), t0Ptr, fracPrecision);
    mul(wPtr, t0Ptr, wStepFractionPtr, t2Ptr, fracPrecision);

    fromDouble(1.0 / (canvasH as f64), t0Ptr, fracPrecision);
    mul(hPtr, t0Ptr, hStepFractionPtr, t2Ptr, fracPrecision);

    for (let pY: u16 = 0; pY < canvasH; pY++) {
        // canvas has (0, 0) at the left-top, so flip Y
        // y0 = yMax - hStepFraction * pY
        mulByUint(hStepFractionPtr, pY, t0Ptr, fracPrecision);
        negate(t0Ptr);
        add(yMaxPtr, t0Ptr, y0Ptr, fracPrecision);

        const rowOffset = pY * canvasW;

        for (let pX: u16 = 0; pX < canvasW; pX++) {
            // x0 = xMin + wStepFraction * pX
            mulByUint(wStepFractionPtr, pX, t0Ptr, fracPrecision);
            add(xMinPtr, t0Ptr, x0Ptr, fracPrecision);

            // x0 = 0; y0 = 0
            setZero(xPtr, fracPrecision);
            setZero(yPtr, fracPrecision);

            let i: u16 = 0;
            for ( ; i < maxIterations; i++) {
                // t0 = xSqr = x * x;
                // t1 = ySqr = y * y;
                mul(xPtr, xPtr, t0Ptr, t2Ptr, fracPrecision);
                if (gtEq4Pos(t0Ptr)) {
                    break;
                }
                mul(yPtr, yPtr, t1Ptr, t2Ptr, fracPrecision);
                // t2 = xSqr(t0) + ySqr(t1)
                add(t0Ptr, t1Ptr, t2Ptr, fracPrecision);
                if (gtEq4Pos(t2Ptr)) {
                    break;
                }

                // xNext = (xSqr(t0) - ySqr(t1))(t2) + x0;
                negate(t1Ptr);
                add(t0Ptr, t1Ptr, t2Ptr, fracPrecision);
                add(t2Ptr, x0Ptr, xNextPtr, fracPrecision);

                // yNext = (2.0 * (x * y)(t0))(t1) + y0;
                mul(xPtr, yPtr, t0Ptr, t2Ptr, fracPrecision);
                twoTimes(t0Ptr, t1Ptr, fracPrecision);
                add(t1Ptr, y0Ptr, yNextPtr, fracPrecision);

                // Swap x and xNext
                let t: u32 = xPtr;
                xPtr = xNextPtr;
                xNextPtr = t;

                t = yPtr;
                yPtr = yNextPtr;
                yNextPtr = t;
            }

            store<u16>(outArrayOffset + 2 * (rowOffset + pX), i);
        }
    }
}


const intPrecision: u32 = 1;

export function add(aPtr: u32, bPtr: u32, cPtr: u32, fracPrecision: u32): void {
    if (isOverflow(aPtr) || isOverflow(bPtr)) {
        setOverflow(cPtr);
        return;
    }

    const aIsNeg = takeNegative(aPtr);
    const bIsNeg = takeNegative(bPtr);

    if (aIsNeg === bIsNeg) {
        addPositive(aPtr, bPtr, cPtr, fracPrecision);
        if (aIsNeg) {
            setNegative(cPtr);
        }
    } else {
        const cmp = cmpPositive(aPtr, bPtr, fracPrecision);
        if (cmp === 1) {
            subPositive(aPtr, bPtr, cPtr, fracPrecision);
            if (aIsNeg) {
                setNegative(cPtr);
            }
        } else if (cmp === -1) {
            subPositive(bPtr, aPtr, cPtr, fracPrecision);
            if (bIsNeg) {
                setNegative(cPtr);
            }
        } else {
            setZero(cPtr, fracPrecision);
        }
    }

    if (aIsNeg) setNegative(aPtr);
    if (bIsNeg) setNegative(bPtr);
}

/**
 * Both operands must be non-overflown positive; a must be not less than b.
 */
export function addPositive(aPtr: u32, bPtr: u32, cPtr: u32, fracPrecision: u32): void {
    let cOut: u64 = 0;
    for (let i: i32 = intPrecision + fracPrecision - 1; i >= 0; i--) {
        const a_i: u64 = load<u32>(aPtr + 4 * i) as u64;
        const b_i: u64 = load<u32>(bPtr + 4 * i) as u64;
        const c_i = a_i + b_i + cOut;
        store<u32>(cPtr + 4 * i, c_i as u32);
        // noinspection ShiftOutOfRangeJS
        cOut = c_i >>> 32;
    }

    if (cOut !== 0 || isNegative(cPtr)) {
        setOverflow(cPtr);
    }
}

/**
 * Both operands must be non-overflown positive; a must be not less than b.
 */
function subPositive(aPtr: u32, bPtr: u32, cPtr: u32, fracPrecision: u32): void {
    let cOut: u64 = 0;
    for (let i: i32 = intPrecision + fracPrecision - 1; i >= 0; i--) {
        const a_i = load<u32>(aPtr + 4 * i) as u64;
        const b_i = load<u32>(bPtr + 4 * i) as u64 + cOut;
        let c_i: u64;
        if (a_i >= b_i) {
            c_i = a_i - b_i;
            cOut = 0;
        } else {
            c_i = (a_i | 0x1_0000_0000) - b_i;
            cOut = 1;
        }
        store<u32>(cPtr + 4 * i, c_i as u32);
    }
}

/**
 * @param aPtr Positive
 */
function gtEq4Pos(aPtr: u32): boolean {
    return load<u32>(aPtr) >= 4;
}

/**
 * Both operands must be non-overflown positive.
 */
export function cmpPositive(aPtr: u32, bPtr: u32, fracPrecision: u32): i32 {
    const precision = intPrecision + fracPrecision;
    for (let i: u32 = 0; i < precision; i++) {
        const a_i = load<u32>(aPtr + 4 * i);
        const b_i = load<u32>(bPtr + 4 * i);
        if (a_i > b_i) {
            return 1;
        } else if (a_i < b_i) {
            return -1;
        }
    }
    return 0;
}

export function mul(aPtr: u32, bPtr: u32, cPtr: u32, tPtr: u32, fracPrecision: u32): void {
    if (isOverflow(aPtr) || isOverflow(bPtr)) {
        setOverflow(cPtr);
        return;
    }

    const aIsNeg = takeNegative(aPtr);
    const bIsNeg = aPtr === bPtr ? aIsNeg : takeNegative(bPtr);

    const precision = intPrecision + fracPrecision;
    const maxIx = precision - 1;

    memset(cPtr, 0, 4 * precision);
    memset(tPtr, 0, 4);

    let cOut: u64 = 0;
    for (let i: i32 = maxIx; i >= 0; i--) {
        const a: u64 = load<u32>(aPtr + (i << 2));
        if (a === 0) {
            continue;
        }

        for (let j: i32 = maxIx; j >= 0; j--) {
            let pIx = i + j;
            if (pIx > (precision as i32)) {
                continue;
            }
            const b: u64 = load<u32>(bPtr + (j << 2));
            if (b === 0 && cOut === 0) {
                continue;
            }

            const pPtr = pIx < (precision as i32) ? cPtr : tPtr;
            pIx %= precision;

            const _pPtr = pPtr + (pIx << 2);
            let p: u64 = load<u32>(_pPtr);
            p += a * b + cOut;
            store<u32>(_pPtr, p as u32);
            // noinspection ShiftOutOfRangeJS
            cOut = p >>> 32;
        }

        for (let j: i32 = i - 1; j >= 0 && cOut !== 0; j--) {
            const _cPtr = cPtr + (j << 2);
            let p: u64 = load<u32>(_cPtr);
            p += cOut;
            store<u32>(_cPtr, p as u32);
            // noinspection ShiftOutOfRangeJS
            cOut = p >>> 32;
        }

        if (cOut !== 0) {
            break;
        }
    }

    if (aIsNeg) setNegative(aPtr);
    if (bIsNeg && aPtr !== bPtr) setNegative(bPtr);

    if (cOut !== 0 || isOverflow(cPtr) || isNegative(cPtr)) {
        setOverflow(cPtr);
        return;
    }

    if (aIsNeg !== bIsNeg) {
        setNegative(cPtr);
    }
}

export function mulByUint(aPtr: u32, b: u32, cPtr: u32, fracPrecision: u32): void {
    if (isOverflow(aPtr)) {
        setOverflow(cPtr);
        return;
    }

    const aIsNeg = takeNegative(aPtr);
    let cOut: u64 = 0;
    for (let i: i32 = intPrecision + fracPrecision - 1; i >= 0; i--) {
        const a = load<u32>(aPtr + 4 * i) as u64;
        const c: u64 = a * b + cOut;
        // noinspection ShiftOutOfRangeJS
        store<u32>(cPtr + 4 * i, c as u32);
        // noinspection ShiftOutOfRangeJS
        cOut = c >>> 32
    }

    if (cOut !== 0 || isNegative(cPtr)) {
        setOverflow(cPtr);
    }

    if (aIsNeg) {
        setNegative(aPtr);
        setNegative(cPtr);
    }
}

export function twoTimes(aPtr: u32, cPtr: u32, fracPrecision: u32): void {
    if (isOverflow(aPtr)) {
        setOverflow(cPtr);
        return;
    }

    const isNeg = takeNegative(aPtr);

    const precision = intPrecision + fracPrecision;
    let cOut: u64 = 0;
    for (let i: i32 = precision - 1; i >= 0; i--) {
        const a: u64 = load<u32>(aPtr + 4 * i) as u64;
        const c: u64 = (a << 1) | cOut;
        store<u32>(cPtr + 4 * i, c as u32);
        // noinspection ShiftOutOfRangeJS
        cOut = c >>> 32;
    }

    if (cOut !== 0 || isNegative(cPtr)) {
        setOverflow(cPtr);
    }

    if (isNeg) {
        setNegative(aPtr);
        setNegative(cPtr);
    }
}

export function fromDouble(a: f64, cPtr: u32, fracPrecision: u32): void {
    let aPos: f64 = a < 0 ? -a : a;
    if (aPos >= 0x4000_0000) {
        setOverflow(cPtr);
        return;
    }

    const precision: u32 = intPrecision + fracPrecision;
    for (let i: u32 = 0; i < precision; i++) {
        const item: u32 = (aPos as u32);
        aPos = (aPos - item) * 0x1_0000_0000;
        store<u32>(cPtr + 4 * i, item);
    }

    if (a < 0) setNegative(cPtr);
}

function isOverflow(ptr: u32): boolean {
    return (load<u32>(ptr) & 0x8000_0000) !== 0;
}

function isNegative(ptr: u32): boolean {
    return (load<u32>(ptr) & 0x4000_0000) !== 0;
}

export function negate(ptr: u32): void {
    const a = load<u32>(ptr);
    store<u32>(ptr, a ^ 0x4000_0000);
}

function takeNegative(ptr: u32): boolean {
    const a = load<u32>(ptr);
    if ((a & 0x4000_0000) !== 0) {
        store<u32>(ptr, a & (~0x4000_0000));
        return true;
    }
    return false;
}

function setZero(ptr: u32, fracPrecision: u32): void {
    const precision = intPrecision + fracPrecision;
    for (let i: u32 = 0; i < precision; i++) {
        store<u32>(ptr + 4 * i, 0);
    }
}

function setOverflow(ptr: u32): void {
    store<u32>(ptr, 0x8000_0000);
}

function setNegative(ptr: u32): void {
    const a = load<u32>(ptr);
    store<u32>(ptr, a | 0x4000_0000);
}
