/*
 * Arbitrary-precision fixed-point numbers. Stored in u32 arrays. Integer part is always at [0].
 * Overflow is 0x8000_0000 bit in [0], negative flag is 0x4000_0000 bit in [0];
 */

import { memmove, memset } from "util/memory";

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
    for (let i: i32 = intPrecision + fracPrecision - 1; i > 0; i--) {
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
function cmpPositive(aPtr: u32, bPtr: u32, fracPrecision: u32): i32 {
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

/**
 * Size of tPtr memory must be 2*precision
 */
export function mul(aPtr: u32, bPtr: u32, cPtr: u32, tPtr: u32, fracPrecision: u32): void {
    if (isOverflow(aPtr) || isOverflow(bPtr)) {
        setOverflow(cPtr);
        return;
    }

    const aIsNeg = takeNegative(aPtr);
    const bIsNeg = takeNegative(bPtr);

    const precision = intPrecision + fracPrecision;

    memset(tPtr, 0, 4 * 2 * precision);

    let cOut: u64 = 0;
    for (let i: i32 = precision - 1; i >= 0; i--) {
        for (let j: i32 = precision - 1; j >= 0; j--) {
            const a: u64 = load<u32>(aPtr + 4 * i);
            const b: u64 = load<u32>(bPtr + 4 * j);
            const t_ix = i + j + 1;
            let t: u64 = load<u32>(tPtr + 4 * t_ix);
            t += a * b + cOut;
            store<u32>(tPtr + 4 * t_ix, t as u32);
            // noinspection ShiftOutOfRangeJS
            cOut = t >>> 32;
        }

        for (let j: i32 = i; j >= 0 && cOut > 0; j--) {
            let t: u64 = load<u32>(tPtr + 4 * j);
            t += cOut;
            store<u32>(tPtr + 4 * j, t as u32);
            // noinspection ShiftOutOfRangeJS
            cOut = t >>> 32;
        }
    }

    if (aIsNeg) setNegative(aPtr);
    if (bIsNeg) setNegative(bPtr);

    if (load<u32>(tPtr) !== 0       // Int precision === 1, that's why only [0]
        || isOverflow(cPtr + 4 * intPrecision)
        || isNegative(cPtr + 4 * intPrecision)
    ) {
        setOverflow(cPtr);
        return;
    }

    memmove(cPtr, tPtr + 4 * intPrecision, 4 * precision);

    if (aIsNeg !== bIsNeg) {
        setNegative(cPtr);
    }
}

function mulByUint(aPtr: u32, b: u32, cPtr: u32, fracPrecision: u32): void {
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

    if (aIsNeg) setNegative(aPtr);

    if (cOut !== 0 || isNegative(cPtr)) {
        setOverflow(cPtr);
    }
}

function twoTimes(aPtr: u32, cPtr: u32, fracPrecision: u32): void {
    if (isOverflow(aPtr)) {
        setOverflow(cPtr);
        return;
    }

    const isNeg = takeNegative(aPtr);

    const precision = intPrecision + fracPrecision;
    let cOut: u32 = 0;
    for (let i: i32 = precision - 1; i >= 0; i++) {
        const c = (load<u32>(aPtr + 4 * i) as u64) << 2;
        store<u32>(cPtr + 4 * i, (c as u32) | cOut);
        // noinspection ShiftOutOfRangeJS
        cOut = (c >>> 32) as u32;
    }

    if (cOut !== 0 || isNegative(cPtr)) {
        setOverflow(cPtr);
        return;
    }

    if (isNeg) setNegative(cPtr);
}

function fromDouble(a: f64, cPtr: u32, fracPrecision: u32): void {
    let aPos = a < 0 ? -a : a;
    let i = 29;
    const minI = -32 * fracPrecision;
    let mask = 1 << 29;
    if (aPos > mask) {
        setOverflow(cPtr);
        return;
    }

    setZero(cPtr, fracPrecision);

    for ( ; i >= minI && aPos > 0; i--) {
        const word = i >= 0
            ? 0                     // 31..0 => 0
            : ((-i + 31) >>> 5)     // -1..-32 => (32..63) => 1
        const bit = i >= 0
            ? i                     // 31..0 => 31..0
            : ((-i - 1) & 0x1f)     // -1..-32 => (0..31)
        if (aPos >= mask) {
            const w = load<u32>(cPtr + 4 * word);
            store<u32>(cPtr + 4 * word, w | (1 << bit));
            aPos -= mask;
        }
    }

    if (a < 0) setNegative(cPtr);
}

function isOverflow(ptr: u32): boolean {
    return (load<u32>(ptr) & 0x8000_0000) !== 0;
}

function isNegative(ptr: u32): boolean {
    return (load<u32>(ptr) & 0x4000_0000) !== 0;
}

function negate(ptr: u32): void {
    const a = load<u32>(ptr);
    store<u32>(ptr, a ^ 0x4000_0000);
}

function takeNegative(ptr: u32): boolean {
    const upper = load<u32>(ptr);
    if ((upper & 0x4000_0000) !== 0) {
        store<u32>(ptr, upper & (~0x4000_0000));
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
