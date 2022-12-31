import { memset } from 'util/memory';

// Input: shared
export let canvasW: u32;
export let canvasH: u32;
export let maxIterations: u16;
export let isBigNum: boolean;

// Input: only double arithmetic
export let xMin: f64;
export let w: f64;
export let yMin: f64;
export let h: f64;

// Input: only BigNum
export let precision: u32;
export let fracPrecision: u32;

// Internal: shared
let outArrayOffset: u32;


// Internal: only double
let yMax: f64;
let wStepFraction: f64;
let hStepFraction: f64;

// Internal: only BigNum
let xMinPtr: u32;
let wPtr: u32;
let yMinPtr: u32;
let hPtr: u32;
let yMaxPtr: u32;
let t0Ptr: u32;
let t1Ptr: u32;
let t2Ptr: u32;

let wStepFractionPtr: u32;
let hStepFractionPtr: u32;

let x0Ptr: u32;
let y0Ptr: u32;
let xPtr: u32;
let yPtr: u32;
let xNextPtr: u32;
let yNextPtr: u32;


// noinspection JSUnusedGlobalSymbols
export function renderMandelbrot(): void {
  if (!isBigNum) {
    yMax = yMin + h;
    wStepFraction = w * (1.0 / (canvasW as f64));
    hStepFraction = h * (1.0 / (canvasH as f64));
    outArrayOffset = 0;
  } else {
    if (precision - fracPrecision !== 1) {
      // Must be 1
      return;
    }

    xMinPtr = 0;
    wPtr = 4 * precision;
    yMinPtr = 2 * 4 * precision;
    hPtr = 3 * 4 * precision;
    yMaxPtr = 4 * 4 * precision;
    t0Ptr = 5 * 4 * precision;
    t1Ptr = 6 * 4 * precision;
    t2Ptr = 7 * 4 * precision;

    wStepFractionPtr = 8 * 4 * precision;
    hStepFractionPtr = 9 * 4 * precision;

    x0Ptr = 10 * 4 * precision;
    y0Ptr = 11 * 4 * precision;
    xPtr = 12 * 4 * precision;
    yPtr = 13 * 4 * precision;
    xNextPtr = 14 * 4 * precision;
    yNextPtr = 15 * 4 * precision;

    outArrayOffset = 16 * 4 * precision;

    add(yMinPtr, hPtr, yMaxPtr);

    // wStepFraction = w * (1.0 / canvasW)(t0)
    fromDouble(1.0 / (canvasW as f64), t0Ptr);
    mul(wPtr, t0Ptr, wStepFractionPtr, t2Ptr);

    fromDouble(1.0 / (canvasH as f64), t0Ptr);
    mul(hPtr, t0Ptr, hStepFractionPtr, t2Ptr);
  }

  renderRect(0, 0, canvasW, canvasH);
}

const minSizeToSplit: u32 = 6;

function renderRect(pX0: u32, pY0: u32, pX1: u32, pY1: u32): void {
  const pXMid: u32 = (pX0 + pX1) / 2;
  const pYMid: u32 = (pY0 + pY1) / 2;

  const p0 = renderPoint(pX0, pY0);
  if (
      // TODO depending on size, take more points
      // Corners
      p0 === renderPoint(pX0, pY1 - 1)
      && p0 === renderPoint(pX1 - 1, pY0)
      && p0 === renderPoint(pX1 - 1, pY1 - 1)

      // Sides in the middle
      && p0 === renderPoint(pX0, pYMid)
      && p0 === renderPoint(pXMid, pY0)
      && p0 === renderPoint(pX1 - 1, pYMid)
      && p0 === renderPoint(pXMid, pY1 - 1)

      && p0 === renderPoint(pXMid, pYMid)
  ) {
    for (let pY: u32 = pY0; pY < pY1; pY++) {
      for (let pX: u32 = pX0; pX < pX1; pX++) {
        store<u16>(outArrayOffset + 2 * (pY * canvasW + pX), p0);
      }
    }
    return;
  }

  if (pX1 - pX0 >= minSizeToSplit) {
    renderRect(pX0, pY0, pXMid, pY1);
    renderRect(pXMid, pY0, pX1, pY1);
    return;
  }

  if (pY1 - pY0 >= minSizeToSplit) {
    renderRect(pX0, pY0, pX1, pYMid);
    renderRect(pX0, pYMid, pX1, pY1);
    return;
  }

  for (let pY: u32 = pY0; pY < pY1; pY++) {
    for (let pX: u32 = pX0; pX < pX1; pX++) {
      renderPoint(pX, pY);
    }
  }
}

function renderPoint(pX: u32, pY: u32): u16 {
  const iterPtr = outArrayOffset + 2 * (pY * canvasW + pX);
  const alreadyRendered = load<u16>(iterPtr);
  if (alreadyRendered !== 0) {
    return alreadyRendered;
  }

  const iterNum = isBigNum
      ? doRenderPointBigNum(pX, pY)
      : doRenderPointDouble(pX, pY);
  store<u16>(iterPtr, iterNum);
  return iterNum;
}

function doRenderPointDouble(pX: u32, pY: u32): u16 {
  // canvas has (0, 0) at the left-top, so flip Y
  const x0: f64 = xMin + wStepFraction * pX
  const y0: f64 = yMax - hStepFraction * pY;

  let x = 0 as f64;
  let y = 0 as f64;

  let i: u16 = 0;
  for ( ; i < maxIterations; i++) {
    const xSqr = x * x;
    const ySqr = y * y;
    if (xSqr + ySqr > 4.0) {
      break;
    }
    const xNext = xSqr - ySqr + x0;
    const yNext = 2.0 * x * y + y0;
    x = xNext
    y = yNext
  }

  return i;
}

function doRenderPointBigNum(pX: u32, pY: u32): u16 {
  // x0 = xMin + wStepFraction * pX
  mulByUint(wStepFractionPtr, pX, t0Ptr);
  add(xMinPtr, t0Ptr, x0Ptr);

  // canvas has (0, 0) at the left-top, so flip Y
  // y0 = yMax - hStepFraction * pY
  mulByUint(hStepFractionPtr, pY, t0Ptr);
  negate(t0Ptr);
  add(yMaxPtr, t0Ptr, y0Ptr);

  // x0 = 0; y0 = 0
  setZero(xPtr);
  setZero(yPtr);

  let i: u16 = 0;
  for ( ; i < maxIterations; i++) {
    // t0 = xSqr = x * x;
    // t1 = ySqr = y * y;
    mul(xPtr, xPtr, t0Ptr, t2Ptr);
    if (gtEq4Pos(t0Ptr)) {
      break;
    }
    mul(yPtr, yPtr, t1Ptr, t2Ptr);
    // t2 = xSqr(t0) + ySqr(t1)
    add(t0Ptr, t1Ptr, t2Ptr);
    if (gtEq4Pos(t2Ptr)) {
      break;
    }

    // xNext = (xSqr(t0) - ySqr(t1))(t2) + x0;
    negate(t1Ptr);
    add(t0Ptr, t1Ptr, t2Ptr);
    add(t2Ptr, x0Ptr, xNextPtr);

    // yNext = (2.0 * (x * y)(t0))(t1) + y0;
    mul(xPtr, yPtr, t0Ptr, t2Ptr);
    twoTimes(t0Ptr, t1Ptr);
    add(t1Ptr, y0Ptr, yNextPtr);

    // Swap x and xNext
    let t: u32 = xPtr;
    xPtr = xNextPtr;
    xNextPtr = t;

    t = yPtr;
    yPtr = yNextPtr;
    yNextPtr = t;
  }

  return i;
}

/*
 * Arbitrary-precision fixed-point numbers. Stored as u32 components, most significant component first.
 * The most significant component is an integer part, and it always has one component. Fractional part size
 * (fracPrecision) varies, minimum is 1.
 *
 * Integer part stores also 2 flags: overflow (0x8000_0000) and negative (0x4000_0000).
 * So the greatest (by abs) number is 0x3fff_ffff.0xffff_ffff... (= 1_073_741_823.99999...).
 */


export function add(aPtr: u32, bPtr: u32, cPtr: u32): void {
  if (isOverflow(aPtr) || isOverflow(bPtr)) {
    setOverflow(cPtr);
    return;
  }

  const aIsNeg = takeNegative(aPtr);
  const bIsNeg = takeNegative(bPtr);

  if (aIsNeg === bIsNeg) {
    addPositive(aPtr, bPtr, cPtr);
    if (aIsNeg) {
      setNegative(cPtr);
    }
  } else {
    const cmp = cmpPositive(aPtr, bPtr);
    if (cmp === 1) {
      subPositive(aPtr, bPtr, cPtr);
      if (aIsNeg) {
        setNegative(cPtr);
      }
    } else if (cmp === -1) {
      subPositive(bPtr, aPtr, cPtr);
      if (bIsNeg) {
        setNegative(cPtr);
      }
    } else {
      setZero(cPtr);
    }
  }

  if (aIsNeg) setNegative(aPtr);
  if (bIsNeg) setNegative(bPtr);
}

/**
 * Both operands must be non-overflown positive; a must be not less than b.
 */
export function addPositive(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64 = 0;
  for (let i: i32 = precision - 1; i >= 0; i--) {
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
function subPositive(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64 = 0;
  for (let i: i32 = precision - 1; i >= 0; i--) {
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
export function cmpPositive(aPtr: u32, bPtr: u32): i32 {
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

export function mul(aPtr: u32, bPtr: u32, cPtr: u32, tPtr: u32): void {
  if (isOverflow(aPtr) || isOverflow(bPtr)) {
    setOverflow(cPtr);
    return;
  }

  const aIsNeg = takeNegative(aPtr);
  const bIsNeg = aPtr === bPtr ? aIsNeg : takeNegative(bPtr);

  const swapArgs = aPtr !== bPtr && countZeroItems(bPtr) > countZeroItems(aPtr);
  if (swapArgs) {
    const t: u32 = aPtr;
    aPtr = bPtr;
    bPtr = t;
  }

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

  if (aIsNeg) setNegative(swapArgs ? bPtr : aPtr);
  if (bIsNeg && aPtr !== bPtr) setNegative(swapArgs ? aPtr : bPtr);

  if (cOut !== 0 || isOverflow(cPtr) || isNegative(cPtr)) {
    setOverflow(cPtr);
    return;
  }

  if (aIsNeg !== bIsNeg) {
    setNegative(cPtr);
  }
}

export function mulByUint(aPtr: u32, b: u32, cPtr: u32): void {
  if (isOverflow(aPtr)) {
    setOverflow(cPtr);
    return;
  }

  const aIsNeg = takeNegative(aPtr);
  let cOut: u64 = 0;
  for (let i: i32 = precision - 1; i >= 0; i--) {
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

export function twoTimes(aPtr: u32, cPtr: u32): void {
  if (isOverflow(aPtr)) {
    setOverflow(cPtr);
    return;
  }

  const isNeg = takeNegative(aPtr);

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

export function fromDouble(a: f64, cPtr: u32): void {
  let aPos: f64 = a < 0 ? -a : a;
  if (aPos >= 0x4000_0000) {
    setOverflow(cPtr);
    return;
  }

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

function setZero(ptr: u32): void {
  for (let i: u32 = 0; i < precision; i++) {
    store<u32>(ptr + 4 * i, 0);
  }
}

function countZeroItems(ptr: u32): u32 {
  let zeros: u32 = 0;
  for (let i: u32 = 0; i < precision; i++) {
    if (load<u32>(ptr + 4 * i) === 0) {
      zeros++;
    }
  }
  return zeros;
}

function setOverflow(ptr: u32): void {
  store<u32>(ptr, 0x8000_0000);
}

function setNegative(ptr: u32): void {
  const a = load<u32>(ptr);
  store<u32>(ptr, a | 0x4000_0000);
}
