// noinspection DuplicatedCode, ShiftOutOfRangeJS, JSUnusedGlobalSymbols

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
    mul(yPtr, yPtr, t1Ptr, t2Ptr);
    // t2 = xSqr(t0) + ySqr(t1)
    const sumIntPart: u32 = add(t0Ptr, t1Ptr, 0);
    if (sumIntPart >= 4) {
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
 * (fracPrecision) varies, minimum is 1. Negatives are 2's complement
 */


export function add(aPtr: u32, bPtr: u32, cPtr: u32): u32 {
  let cOut: u64 = 0;
  let c_i: u64 = 0;
  for (let i: i32 = precision - 1; i >= 0; i--) {
    const a_i: u64 = load<u32>(aPtr + 4 * i) as u64;
    const b_i: u64 = load<u32>(bPtr + 4 * i) as u64;
    c_i = a_i + b_i + cOut;
    if (cPtr !== 0) store<u32>(cPtr + 4 * i, c_i as u32);
    cOut = c_i >>> 32;
  }
  return c_i as u32;
}

export function mul(aPtr: u32, bPtr: u32, cPtr: u32, tPtr: u32): void {
  if (precision === 2) {
    mul2(aPtr, bPtr, cPtr);
  } else if (precision === 3) {
    mul3(aPtr, bPtr, cPtr);
  } else if (precision === 4) {
    mul4(aPtr, bPtr, cPtr);
  } else {
    mulGeneral(aPtr, bPtr, cPtr, tPtr);
  }
}


export function mul2(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64;

  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  const aIsNeg = (a0 & 0x8000_0000) !== 0;
  if (aIsNeg) {
    cOut = 1;
    a1 = (a1 ^ 0xffff_ffff) + cOut;
    cOut = a1 >>> 32;
    a1 = a1 & 0xffff_ffff;

    a0 = (a0 ^ 0xffff_ffff) + cOut;
    a0 = a0 & 0xffff_ffff;
  }

  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000) !== 0;
  if (bIsNeg && !same) {
    cOut = 1;
    b1 = (b1 ^ 0xffff_ffff) + cOut;
    cOut = b1 >>> 32;
    b1 = b1 & 0xffff_ffff;

    b0 = (b0 ^ 0xffff_ffff) + cOut;
    b0 = b0 & 0xffff_ffff;
  }

  const cIsNeg = aIsNeg !== bIsNeg;
  cOut = 1;

  let curr: u64 = 0;
  let next: u64 = 0;

  let m: u64;

  // c2
  m = a1 * b1;
  curr += m;

  curr = curr >>> 32;

  // c1
  m = a0 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 4, m as u32);
  curr = curr >>> 32 | next;

  // c0
  m = a0 * b0;
  curr += m;


  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
  } else {
    m = curr;
  }
  store<u32>(cPtr, m as u32);
}

export function mul3(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64;

  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  let a2 = load<u32>(aPtr + 8) as u64;
  const aIsNeg = a0 & 0x8000_0000;
  if (aIsNeg) {
    cOut = 1;

    a2 = (a2 ^ 0xffff_ffff) + cOut;
    cOut = a2 >>> 32;
    a2 = a2 & 0xffff_ffff;

    a1 = (a1 ^ 0xffff_ffff) + cOut;
    cOut = a1 >>> 32;
    a1 = a1 & 0xffff_ffff;

    a0 = (a0 ^ 0xffff_ffff) + cOut;
    a0 = a0 & 0xffff_ffff;
  }

  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  let b2 = same ? a2 : load<u32>(bPtr + 8) as u64;

  const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000);
  if (bIsNeg && !same) {
    cOut = 1;

    b2 = (b2 ^ 0xffff_ffff) + cOut;
    cOut = b2 >>> 32;
    b2 = b2 & 0xffff_ffff;

    b1 = (b1 ^ 0xffff_ffff) + cOut;
    cOut = b1 >>> 32;
    b1 = b1 & 0xffff_ffff;

    b0 = (b0 ^ 0xffff_ffff) + cOut;
    b0 = b0 & 0xffff_ffff;
  }

  const cIsNeg = aIsNeg !== bIsNeg;
  cOut = 1;

  let curr: u64 = 0;
  let next: u64 = 0;

  let m: u64;

  // c3
  m = a1 * b2;
  curr += m;

  m = a2 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  curr = curr >>> 32 | next;
  next = 0;

  // c2
  m = a0 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 8, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c1
  m = a0 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 4, m as u32);
  curr = curr >>> 32 | next;

  // c0
  m = a0 * b0;
  curr += m;

  if (aIsNeg !== bIsNeg) curr |= 0x8000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
  } else {
    m = curr;
  }
  store<u32>(cPtr, m as u32);
}

export function mul4(aPtr: u32, bPtr: u32, cPtr: u32): void {
  // TODO not 2's complement
  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  let a2 = load<u32>(aPtr + 8) as u64;
  let a3 = load<u32>(aPtr + 12) as u64;
  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  let b2 = same ? a2 : load<u32>(bPtr + 8) as u64;
  let b3 = same ? a3 : load<u32>(bPtr + 12) as u64;

  const aIsNeg = (a0 & 0x8000_0000) !== 0;
  const bIsNeg = (b0 & 0x8000_0000) !== 0;
  if (aIsNeg) a0 &= ~0x8000_0000;
  if (bIsNeg) b0 &= ~0x8000_0000;

  let curr: u64 = 0;
  let next: u64 = 0;

  let m: u64;

  // c4
  m = a1 * b3;
  curr += m;

  m = a2 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  curr = curr >>> 32 | next;
  next = 0;

  // c3
  m = a0 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  store<u32>(cPtr + 12, curr as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c2
  m = a0 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  store<u32>(cPtr + 8, curr as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c1
  m = a0 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  store<u32>(cPtr + 4, curr as u32);
  curr = curr >>> 32 | next;

  // c0
  m = a0 * b0;
  curr += m;

  if (aIsNeg !== bIsNeg) curr |= 0x8000_0000;

  store<u32>(cPtr, curr as u32);
}

export function mulGeneral(aPtr: u32, bPtr: u32, cPtr: u32, tPtr: u32): void {
  // TODO not 2's complement
  const aIsNeg = takeNegative(aPtr);
  const bIsNeg = aPtr === bPtr ? aIsNeg : takeNegative(bPtr);

  // const swapArgs = aPtr !== bPtr && countZeroItems(bPtr) > countZeroItems(aPtr);
  // if (swapArgs) {
  //   const t: u32 = aPtr;
  //   aPtr = bPtr;
  //   bPtr = t;
  // }

  const maxIx = precision - 1;

  // memset(cPtr, 0, 4 * precision);
  // memset(tPtr, 0, 4);

  let cOut: u64 = 0;
  for (let i: i32 = maxIx; i >= 0; i--) {
    const a: u64 = load<u32>(aPtr + (i << 2));
    if (a === 0) {
      continue;
    }

    // Max pIx === i + j === precision (product is +1 width)
    // <=>
    // max j === precision - i
    for (let j: i32 = precision - i; j >= 0; j--) {
      let pIx = i + j;
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
      cOut = p >>> 32;
    }

    for (let j: i32 = i - 1; j >= 0 && cOut !== 0; j--) {
      const _cPtr = cPtr + (j << 2);
      let p: u64 = load<u32>(_cPtr);
      p += cOut;
      store<u32>(_cPtr, p as u32);
      cOut = p >>> 32;
    }

    if (cOut !== 0) {
      break;
    }
  }

  // if (aIsNeg) setNegative(swapArgs ? bPtr : aPtr);
  // if (bIsNeg && aPtr !== bPtr) setNegative(swapArgs ? aPtr : bPtr);
  // if (aIsNeg !== bIsNeg) setNegative(cPtr);
}

export function mulByUint(aPtr: u32, b: u32, cPtr: u32): void {
  const aIsNeg = takeNegative(aPtr);
  let cOut: u64 = 0;
  for (let i: i32 = precision - 1; i >= 0; i--) {
    const a = load<u32>(aPtr + 4 * i) as u64;
    const c: u64 = a * b + cOut;
    store<u32>(cPtr + 4 * i, c as u32);
    cOut = c >>> 32
  }

  if (aIsNeg) {
    negate(aPtr);
    negate(cPtr);
  }
}

export function twoTimes(aPtr: u32, cPtr: u32): void {
  let cOut: u64 = 0;
  for (let i: i32 = precision - 1; i >= 0; i--) {
    const a: u64 = load<u32>(aPtr + 4 * i) as u64;
    const c: u64 = (a << 1) | cOut;
    store<u32>(cPtr + 4 * i, c as u32);
    cOut = c >>> 32;
  }
}

export function fromDouble(a: f64, cPtr: u32): void {
  let aPos: f64 = a < 0 ? -a : a;
  for (let i: u32 = 0; i < precision; i++) {
    const item: u32 = (aPos as u32);
    aPos = (aPos - item) * 0x1_0000_0000;
    store<u32>(cPtr + 4 * i, item);
  }
  if (a < 0) negate(cPtr);
}

export function negate(ptr: u32): void {
  let cOut: u64 = 1;
  for (let i: i32 = precision - 1; i >= 0; i--) {
    let a = load<u32>(ptr + 4 * i) as u64;
    a = (a ^ 0xffff_ffff) + cOut;
    store<u32>(ptr + 4 * i, a as u32);
    cOut = a >>> 32;
  }
}

function takeNegative(ptr: u32): boolean {
  const a = load<u32>(ptr);
  if ((a & 0x8000_0000) !== 0) {
    negate(ptr);
    return true;
  }
  return false;
}

function setZero(ptr: u32): void {
  for (let i: u32 = 0; i < precision; i++) {
    store<u32>(ptr + 4 * i, 0);
  }
}
