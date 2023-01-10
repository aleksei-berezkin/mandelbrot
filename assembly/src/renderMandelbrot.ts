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

let xMin0: u64;
let xMin1: u64;
let yMax0: u64;
let yMax1: u64;

let wStepFraction0: u64;
let wStepFraction1: u64;
let hStepFraction0: u64;
let hStepFraction1: u64;



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

    xMin0 = load<u32>(xMinPtr) as u64;
    xMin1 = load<u32>(xMinPtr + 4) as u64;
    yMax0 = load<u32>(yMaxPtr) as u64;
    yMax1 = load<u32>(yMaxPtr + 4) as u64;

    wStepFraction0 = load<u32>(wStepFractionPtr) as u64;
    wStepFraction1 = load<u32>(wStepFractionPtr + 4) as u64;
    hStepFraction0 = load<u32>(hStepFractionPtr) as u64;
    hStepFraction1 = load<u32>(hStepFractionPtr + 4) as u64;
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

  return i as u16;
}

function doRenderPointBigNum(pX: u32, pY: u32): u16 {
  let a0: u64;
  let a1: u64;
  let b0: u64;
  let b1: u64;
  let x0: u64;
  let x1: u64;
  let y0: u64;
  let y1: u64;
  let x0_0: u64;
  let x0_1: u64;
  let y0_0: u64;
  let y0_1: u64;
  let t0_0: u64;
  let t0_1: u64;
  let t1_0: u64;
  let t1_1: u64;
  let m: u64;
  let cOut: u64;
  let curr: u64 = 0;
  let next: u64 = 0;
  let isNeg: boolean;

  // Mul positive by uint x0_ = wStepFraction * pX
  cOut = 0;
  x0_1 = wStepFraction1 * pX + cOut;
  cOut = x0_1 >>> 32;
  x0_1 &= 0xffff_ffff;
  x0_0 = wStepFraction0 * pX + cOut;
  x0_0 &= 0xffff_ffff;

  // add x0_ = xMin + x0_
  cOut = 0;
  x0_1 = xMin1 + x0_1 + cOut;
  cOut = x0_1 >>> 32;
  x0_1 &= 0xffff_ffff;
  x0_0 = xMin0 + x0_0 + cOut;
  x0_0 &= 0xffff_ffff;

  // Mul positive by uint y0_ = hStepFraction * pY
  cOut = 0;
  y0_1 = hStepFraction1 * pY + cOut;
  cOut = y0_1 >>> 32;
  y0_1 &= 0xffff_ffff;
  y0_0 = hStepFraction0 * pY + cOut;
  y0_0 &= 0xffff_ffff;

  // negate y0_
  cOut = 1;
  y0_1 = (y0_1 ^ 0xffff_ffff) + cOut;
  cOut = y0_1 >>> 32;
  y0_1 &= 0xffff_ffff;
  y0_0 = (y0_0 ^ 0xffff_ffff) + cOut;
  y0_0 &= 0xffff_ffff;

  // add y0_ = yMax + y0_
  cOut = 0;
  y0_1 = yMax1 + y0_1 + cOut;
  cOut = y0_1 >>> 32;
  y0_1 &= 0xffff_ffff;
  y0_0 = yMax0 + y0_0 + cOut;
  y0_0 &= 0xffff_ffff;

  x1 = 0;
  x0 = 0;
  y1 = 0;
  y0 = 0;

  let i: u32 = 0;
  for ( ; i < maxIterations; i++) {
    // Mul t0_ = x * x
    a0 = x0;
    a1 = x1;
    if ((a0 & 0x8000_0000) !== 0) {
      // negate a
      cOut = 1;
      a1 = (a1 ^ 0xffff_ffff) + cOut;
      cOut = a1 >>> 32;
      a1 &= 0xffff_ffff;
      a0 = (a0 ^ 0xffff_ffff) + cOut;
      a0 &= 0xffff_ffff;

    }

    // t0_2
    m = a1 * a1;
    curr += m;

    curr = curr >>> 32 | next;
    next = 0;

    // t0_1
    m = a0 * a1;
    curr += m;
    if (curr < m) next += 0x1_0000_0000;

    m = a1 * a0;
    curr += m;
    if (curr < m) next += 0x1_0000_0000;

    t0_1 = curr & 0xffff_ffff
    curr = curr >>> 32 | next;
    next = 0;

    // t0_0
    m = a0 * a0;
    curr += m;

    t0_0 = curr & 0xffff_ffff

    // Mul t1_ = y * y
    a0 = y0;
    a1 = y1;
    if ((a0 & 0x8000_0000) !== 0) {
      // negate a
      cOut = 1;
      a1 = (a1 ^ 0xffff_ffff) + cOut;
      cOut = a1 >>> 32;
      a1 &= 0xffff_ffff;
      a0 = (a0 ^ 0xffff_ffff) + cOut;
      a0 &= 0xffff_ffff;

    }

    // t1_2
    m = a1 * a1;
    curr += m;

    curr = curr >>> 32 | next;
    next = 0;

    // t1_1
    m = a0 * a1;
    curr += m;
    if (curr < m) next += 0x1_0000_0000;

    m = a1 * a0;
    curr += m;
    if (curr < m) next += 0x1_0000_0000;

    t1_1 = curr & 0xffff_ffff
    curr = curr >>> 32 | next;
    next = 0;

    // t1_0
    m = a0 * a0;
    curr += m;

    t1_0 = curr & 0xffff_ffff

    // add a = t0_ + t1_
    cOut = 0;
    a1 = t0_1 + t1_1 + cOut;
    cOut = a1 >>> 32;
    a1 &= 0xffff_ffff;
    a0 = t0_0 + t1_0 + cOut;
    a0 &= 0xffff_ffff;

    if (a0 >= 4) {
      break;
    }

    // negate t1_
    cOut = 1;
    t1_1 = (t1_1 ^ 0xffff_ffff) + cOut;
    cOut = t1_1 >>> 32;
    t1_1 &= 0xffff_ffff;
    t1_0 = (t1_0 ^ 0xffff_ffff) + cOut;
    t1_0 &= 0xffff_ffff;

    // add t1_ = t0_ + t1_
    cOut = 0;
    t1_1 = t0_1 + t1_1 + cOut;
    cOut = t1_1 >>> 32;
    t1_1 &= 0xffff_ffff;
    t1_0 = t0_0 + t1_0 + cOut;
    t1_0 &= 0xffff_ffff;

    // add t1_ = t1_ + x0_
    cOut = 0;
    t1_1 = t1_1 + x0_1 + cOut;
    cOut = t1_1 >>> 32;
    t1_1 &= 0xffff_ffff;
    t1_0 = t1_0 + x0_0 + cOut;
    t1_0 &= 0xffff_ffff;

    // Mul t0_ = x * y
    a0 = x0;
    a1 = x1;
    if ((a0 & 0x8000_0000) !== 0) {
      // negate a
      cOut = 1;
      a1 = (a1 ^ 0xffff_ffff) + cOut;
      cOut = a1 >>> 32;
      a1 &= 0xffff_ffff;
      a0 = (a0 ^ 0xffff_ffff) + cOut;
      a0 &= 0xffff_ffff;

    }
    b0 = y0;
    b1 = y1;
    if ((b0 & 0x8000_0000) !== 0) {
      // negate b
      cOut = 1;
      b1 = (b1 ^ 0xffff_ffff) + cOut;
      cOut = b1 >>> 32;
      b1 &= 0xffff_ffff;
      b0 = (b0 ^ 0xffff_ffff) + cOut;
      b0 &= 0xffff_ffff;

    }
    isNeg = (x0 & 0x8000_0000) !== (y0 & 0x8000_0000);

    cOut = 1;

    // t0_2
    m = a1 * b1;
    curr += m;

    curr = curr >>> 32 | next;
    next = 0;

    // t0_1
    m = a0 * b1;
    curr += m;
    if (curr < m) next += 0x1_0000_0000;

    m = a1 * b0;
    curr += m;
    if (curr < m) next += 0x1_0000_0000;

    if (isNeg) {
      m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
      cOut = m >>> 32;
    } else {
      m = curr;
    }
    t0_1 = m & 0xffff_ffff;
    curr = curr >>> 32 | next;
    next = 0;

    // t0_0
    m = a0 * b0;
    curr += m;

    if (isNeg) {
      m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
      cOut = m >>> 32;
    } else {
      m = curr;
    }
    t0_0 = m & 0xffff_ffff;

    // 2 times: t0_ = 2 * t0_
    cOut = 0;
    t0_1 = (t0_1 << 1) | cOut;
    cOut = t0_1 >>> 32;
    t0_1 &= 0xffff_ffff;
    t0_0 = (t0_0 << 1) | cOut;
    t0_0 &= 0xffff_ffff;

    // add y = t0_ + y0_
    cOut = 0;
    y1 = t0_1 + y0_1 + cOut;
    cOut = y1 >>> 32;
    y1 &= 0xffff_ffff;
    y0 = t0_0 + y0_0 + cOut;
    y0 &= 0xffff_ffff;

    x0 = t1_0;
    x1 = t1_1;
  }

  return i as u16;
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
  switch (precision) {
    case 2:
      mul2(aPtr, bPtr, cPtr);
      break;
    case 3:
      mul3(aPtr, bPtr, cPtr);
      break;
    case 4:
      mul4(aPtr, bPtr, cPtr);
      break;
    case 5:
      mul5(aPtr, bPtr, cPtr);
      break;
    case 6:
      mul6(aPtr, bPtr, cPtr);
      break;
    case 7:
      mul7(aPtr, bPtr, cPtr);
      break;
    case 8:
      mul8(aPtr, bPtr, cPtr);
      break;
    case 9:
      mul9(aPtr, bPtr, cPtr);
      break;
    case 10:
      mul10(aPtr, bPtr, cPtr);
      break;
    default:
      mulGeneral(aPtr, bPtr, cPtr, tPtr);
      break;
  }
}

function mul2(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64;

  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  const aIsNeg = a0 & 0x8000_0000;
  if (aIsNeg) {
    cOut = 1;
    a1 = (a1 ^ 0xffff_ffff) + cOut;
    cOut = a1 >>> 32;
    a1 &= 0xffff_ffff;
    a0 = (a0 ^ 0xffff_ffff) + cOut;
    a0 &= 0xffff_ffff;
  }

  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000);
  if (!same && bIsNeg) {
    cOut = 1;
    b1 = (b1 ^ 0xffff_ffff) + cOut;
    cOut = b1 >>> 32;
    b1 &= 0xffff_ffff;
    b0 = (b0 ^ 0xffff_ffff) + cOut;
    b0 &= 0xffff_ffff;
  }
  const cIsNeg = aIsNeg !== bIsNeg;

  cOut = 1;
  let curr: u64 = 0;
  let next: u64 = 0;
  let m: u64;

  // c2
  m = a1 * b1;
  curr += m;

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
  next = 0;

  // c0
  m = a0 * b0;
  curr += m;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr, m as u32);
}
function mul3(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64;

  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  let a2 = load<u32>(aPtr + 8) as u64;
  const aIsNeg = a0 & 0x8000_0000;
  if (aIsNeg) {
    cOut = 1;
    a2 = (a2 ^ 0xffff_ffff) + cOut;
    cOut = a2 >>> 32;
    a2 &= 0xffff_ffff;
    a1 = (a1 ^ 0xffff_ffff) + cOut;
    cOut = a1 >>> 32;
    a1 &= 0xffff_ffff;
    a0 = (a0 ^ 0xffff_ffff) + cOut;
    a0 &= 0xffff_ffff;
  }

  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  let b2 = same ? a2 : load<u32>(bPtr + 8) as u64;
  const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000);
  if (!same && bIsNeg) {
    cOut = 1;
    b2 = (b2 ^ 0xffff_ffff) + cOut;
    cOut = b2 >>> 32;
    b2 &= 0xffff_ffff;
    b1 = (b1 ^ 0xffff_ffff) + cOut;
    cOut = b1 >>> 32;
    b1 &= 0xffff_ffff;
    b0 = (b0 ^ 0xffff_ffff) + cOut;
    b0 &= 0xffff_ffff;
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
  next = 0;

  // c0
  m = a0 * b0;
  curr += m;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr, m as u32);
}
function mul4(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64;

  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  let a2 = load<u32>(aPtr + 8) as u64;
  let a3 = load<u32>(aPtr + 12) as u64;
  const aIsNeg = a0 & 0x8000_0000;
  if (aIsNeg) {
    cOut = 1;
    a3 = (a3 ^ 0xffff_ffff) + cOut;
    cOut = a3 >>> 32;
    a3 &= 0xffff_ffff;
    a2 = (a2 ^ 0xffff_ffff) + cOut;
    cOut = a2 >>> 32;
    a2 &= 0xffff_ffff;
    a1 = (a1 ^ 0xffff_ffff) + cOut;
    cOut = a1 >>> 32;
    a1 &= 0xffff_ffff;
    a0 = (a0 ^ 0xffff_ffff) + cOut;
    a0 &= 0xffff_ffff;
  }

  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  let b2 = same ? a2 : load<u32>(bPtr + 8) as u64;
  let b3 = same ? a3 : load<u32>(bPtr + 12) as u64;
  const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000);
  if (!same && bIsNeg) {
    cOut = 1;
    b3 = (b3 ^ 0xffff_ffff) + cOut;
    cOut = b3 >>> 32;
    b3 &= 0xffff_ffff;
    b2 = (b2 ^ 0xffff_ffff) + cOut;
    cOut = b2 >>> 32;
    b2 &= 0xffff_ffff;
    b1 = (b1 ^ 0xffff_ffff) + cOut;
    cOut = b1 >>> 32;
    b1 &= 0xffff_ffff;
    b0 = (b0 ^ 0xffff_ffff) + cOut;
    b0 &= 0xffff_ffff;
  }
  const cIsNeg = aIsNeg !== bIsNeg;

  cOut = 1;
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

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 12, m as u32);
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
  next = 0;

  // c0
  m = a0 * b0;
  curr += m;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr, m as u32);
}
function mul5(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64;

  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  let a2 = load<u32>(aPtr + 8) as u64;
  let a3 = load<u32>(aPtr + 12) as u64;
  let a4 = load<u32>(aPtr + 16) as u64;
  const aIsNeg = a0 & 0x8000_0000;
  if (aIsNeg) {
    cOut = 1;
    a4 = (a4 ^ 0xffff_ffff) + cOut;
    cOut = a4 >>> 32;
    a4 &= 0xffff_ffff;
    a3 = (a3 ^ 0xffff_ffff) + cOut;
    cOut = a3 >>> 32;
    a3 &= 0xffff_ffff;
    a2 = (a2 ^ 0xffff_ffff) + cOut;
    cOut = a2 >>> 32;
    a2 &= 0xffff_ffff;
    a1 = (a1 ^ 0xffff_ffff) + cOut;
    cOut = a1 >>> 32;
    a1 &= 0xffff_ffff;
    a0 = (a0 ^ 0xffff_ffff) + cOut;
    a0 &= 0xffff_ffff;
  }

  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  let b2 = same ? a2 : load<u32>(bPtr + 8) as u64;
  let b3 = same ? a3 : load<u32>(bPtr + 12) as u64;
  let b4 = same ? a4 : load<u32>(bPtr + 16) as u64;
  const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000);
  if (!same && bIsNeg) {
    cOut = 1;
    b4 = (b4 ^ 0xffff_ffff) + cOut;
    cOut = b4 >>> 32;
    b4 &= 0xffff_ffff;
    b3 = (b3 ^ 0xffff_ffff) + cOut;
    cOut = b3 >>> 32;
    b3 &= 0xffff_ffff;
    b2 = (b2 ^ 0xffff_ffff) + cOut;
    cOut = b2 >>> 32;
    b2 &= 0xffff_ffff;
    b1 = (b1 ^ 0xffff_ffff) + cOut;
    cOut = b1 >>> 32;
    b1 &= 0xffff_ffff;
    b0 = (b0 ^ 0xffff_ffff) + cOut;
    b0 &= 0xffff_ffff;
  }
  const cIsNeg = aIsNeg !== bIsNeg;

  cOut = 1;
  let curr: u64 = 0;
  let next: u64 = 0;
  let m: u64;

  // c5
  m = a1 * b4;
  curr += m;

  m = a2 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  curr = curr >>> 32 | next;
  next = 0;

  // c4
  m = a0 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 16, m as u32);
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

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 12, m as u32);
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
  next = 0;

  // c0
  m = a0 * b0;
  curr += m;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr, m as u32);
}
function mul6(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64;

  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  let a2 = load<u32>(aPtr + 8) as u64;
  let a3 = load<u32>(aPtr + 12) as u64;
  let a4 = load<u32>(aPtr + 16) as u64;
  let a5 = load<u32>(aPtr + 20) as u64;
  const aIsNeg = a0 & 0x8000_0000;
  if (aIsNeg) {
    cOut = 1;
    a5 = (a5 ^ 0xffff_ffff) + cOut;
    cOut = a5 >>> 32;
    a5 &= 0xffff_ffff;
    a4 = (a4 ^ 0xffff_ffff) + cOut;
    cOut = a4 >>> 32;
    a4 &= 0xffff_ffff;
    a3 = (a3 ^ 0xffff_ffff) + cOut;
    cOut = a3 >>> 32;
    a3 &= 0xffff_ffff;
    a2 = (a2 ^ 0xffff_ffff) + cOut;
    cOut = a2 >>> 32;
    a2 &= 0xffff_ffff;
    a1 = (a1 ^ 0xffff_ffff) + cOut;
    cOut = a1 >>> 32;
    a1 &= 0xffff_ffff;
    a0 = (a0 ^ 0xffff_ffff) + cOut;
    a0 &= 0xffff_ffff;
  }

  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  let b2 = same ? a2 : load<u32>(bPtr + 8) as u64;
  let b3 = same ? a3 : load<u32>(bPtr + 12) as u64;
  let b4 = same ? a4 : load<u32>(bPtr + 16) as u64;
  let b5 = same ? a5 : load<u32>(bPtr + 20) as u64;
  const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000);
  if (!same && bIsNeg) {
    cOut = 1;
    b5 = (b5 ^ 0xffff_ffff) + cOut;
    cOut = b5 >>> 32;
    b5 &= 0xffff_ffff;
    b4 = (b4 ^ 0xffff_ffff) + cOut;
    cOut = b4 >>> 32;
    b4 &= 0xffff_ffff;
    b3 = (b3 ^ 0xffff_ffff) + cOut;
    cOut = b3 >>> 32;
    b3 &= 0xffff_ffff;
    b2 = (b2 ^ 0xffff_ffff) + cOut;
    cOut = b2 >>> 32;
    b2 &= 0xffff_ffff;
    b1 = (b1 ^ 0xffff_ffff) + cOut;
    cOut = b1 >>> 32;
    b1 &= 0xffff_ffff;
    b0 = (b0 ^ 0xffff_ffff) + cOut;
    b0 &= 0xffff_ffff;
  }
  const cIsNeg = aIsNeg !== bIsNeg;

  cOut = 1;
  let curr: u64 = 0;
  let next: u64 = 0;
  let m: u64;

  // c6
  m = a1 * b5;
  curr += m;

  m = a2 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  curr = curr >>> 32 | next;
  next = 0;

  // c5
  m = a0 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 20, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c4
  m = a0 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 16, m as u32);
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

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 12, m as u32);
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
  next = 0;

  // c0
  m = a0 * b0;
  curr += m;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr, m as u32);
}
function mul7(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64;

  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  let a2 = load<u32>(aPtr + 8) as u64;
  let a3 = load<u32>(aPtr + 12) as u64;
  let a4 = load<u32>(aPtr + 16) as u64;
  let a5 = load<u32>(aPtr + 20) as u64;
  let a6 = load<u32>(aPtr + 24) as u64;
  const aIsNeg = a0 & 0x8000_0000;
  if (aIsNeg) {
    cOut = 1;
    a6 = (a6 ^ 0xffff_ffff) + cOut;
    cOut = a6 >>> 32;
    a6 &= 0xffff_ffff;
    a5 = (a5 ^ 0xffff_ffff) + cOut;
    cOut = a5 >>> 32;
    a5 &= 0xffff_ffff;
    a4 = (a4 ^ 0xffff_ffff) + cOut;
    cOut = a4 >>> 32;
    a4 &= 0xffff_ffff;
    a3 = (a3 ^ 0xffff_ffff) + cOut;
    cOut = a3 >>> 32;
    a3 &= 0xffff_ffff;
    a2 = (a2 ^ 0xffff_ffff) + cOut;
    cOut = a2 >>> 32;
    a2 &= 0xffff_ffff;
    a1 = (a1 ^ 0xffff_ffff) + cOut;
    cOut = a1 >>> 32;
    a1 &= 0xffff_ffff;
    a0 = (a0 ^ 0xffff_ffff) + cOut;
    a0 &= 0xffff_ffff;
  }

  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  let b2 = same ? a2 : load<u32>(bPtr + 8) as u64;
  let b3 = same ? a3 : load<u32>(bPtr + 12) as u64;
  let b4 = same ? a4 : load<u32>(bPtr + 16) as u64;
  let b5 = same ? a5 : load<u32>(bPtr + 20) as u64;
  let b6 = same ? a6 : load<u32>(bPtr + 24) as u64;
  const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000);
  if (!same && bIsNeg) {
    cOut = 1;
    b6 = (b6 ^ 0xffff_ffff) + cOut;
    cOut = b6 >>> 32;
    b6 &= 0xffff_ffff;
    b5 = (b5 ^ 0xffff_ffff) + cOut;
    cOut = b5 >>> 32;
    b5 &= 0xffff_ffff;
    b4 = (b4 ^ 0xffff_ffff) + cOut;
    cOut = b4 >>> 32;
    b4 &= 0xffff_ffff;
    b3 = (b3 ^ 0xffff_ffff) + cOut;
    cOut = b3 >>> 32;
    b3 &= 0xffff_ffff;
    b2 = (b2 ^ 0xffff_ffff) + cOut;
    cOut = b2 >>> 32;
    b2 &= 0xffff_ffff;
    b1 = (b1 ^ 0xffff_ffff) + cOut;
    cOut = b1 >>> 32;
    b1 &= 0xffff_ffff;
    b0 = (b0 ^ 0xffff_ffff) + cOut;
    b0 &= 0xffff_ffff;
  }
  const cIsNeg = aIsNeg !== bIsNeg;

  cOut = 1;
  let curr: u64 = 0;
  let next: u64 = 0;
  let m: u64;

  // c7
  m = a1 * b6;
  curr += m;

  m = a2 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  curr = curr >>> 32 | next;
  next = 0;

  // c6
  m = a0 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 24, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c5
  m = a0 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 20, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c4
  m = a0 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 16, m as u32);
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

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 12, m as u32);
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
  next = 0;

  // c0
  m = a0 * b0;
  curr += m;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr, m as u32);
}
function mul8(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64;

  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  let a2 = load<u32>(aPtr + 8) as u64;
  let a3 = load<u32>(aPtr + 12) as u64;
  let a4 = load<u32>(aPtr + 16) as u64;
  let a5 = load<u32>(aPtr + 20) as u64;
  let a6 = load<u32>(aPtr + 24) as u64;
  let a7 = load<u32>(aPtr + 28) as u64;
  const aIsNeg = a0 & 0x8000_0000;
  if (aIsNeg) {
    cOut = 1;
    a7 = (a7 ^ 0xffff_ffff) + cOut;
    cOut = a7 >>> 32;
    a7 &= 0xffff_ffff;
    a6 = (a6 ^ 0xffff_ffff) + cOut;
    cOut = a6 >>> 32;
    a6 &= 0xffff_ffff;
    a5 = (a5 ^ 0xffff_ffff) + cOut;
    cOut = a5 >>> 32;
    a5 &= 0xffff_ffff;
    a4 = (a4 ^ 0xffff_ffff) + cOut;
    cOut = a4 >>> 32;
    a4 &= 0xffff_ffff;
    a3 = (a3 ^ 0xffff_ffff) + cOut;
    cOut = a3 >>> 32;
    a3 &= 0xffff_ffff;
    a2 = (a2 ^ 0xffff_ffff) + cOut;
    cOut = a2 >>> 32;
    a2 &= 0xffff_ffff;
    a1 = (a1 ^ 0xffff_ffff) + cOut;
    cOut = a1 >>> 32;
    a1 &= 0xffff_ffff;
    a0 = (a0 ^ 0xffff_ffff) + cOut;
    a0 &= 0xffff_ffff;
  }

  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  let b2 = same ? a2 : load<u32>(bPtr + 8) as u64;
  let b3 = same ? a3 : load<u32>(bPtr + 12) as u64;
  let b4 = same ? a4 : load<u32>(bPtr + 16) as u64;
  let b5 = same ? a5 : load<u32>(bPtr + 20) as u64;
  let b6 = same ? a6 : load<u32>(bPtr + 24) as u64;
  let b7 = same ? a7 : load<u32>(bPtr + 28) as u64;
  const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000);
  if (!same && bIsNeg) {
    cOut = 1;
    b7 = (b7 ^ 0xffff_ffff) + cOut;
    cOut = b7 >>> 32;
    b7 &= 0xffff_ffff;
    b6 = (b6 ^ 0xffff_ffff) + cOut;
    cOut = b6 >>> 32;
    b6 &= 0xffff_ffff;
    b5 = (b5 ^ 0xffff_ffff) + cOut;
    cOut = b5 >>> 32;
    b5 &= 0xffff_ffff;
    b4 = (b4 ^ 0xffff_ffff) + cOut;
    cOut = b4 >>> 32;
    b4 &= 0xffff_ffff;
    b3 = (b3 ^ 0xffff_ffff) + cOut;
    cOut = b3 >>> 32;
    b3 &= 0xffff_ffff;
    b2 = (b2 ^ 0xffff_ffff) + cOut;
    cOut = b2 >>> 32;
    b2 &= 0xffff_ffff;
    b1 = (b1 ^ 0xffff_ffff) + cOut;
    cOut = b1 >>> 32;
    b1 &= 0xffff_ffff;
    b0 = (b0 ^ 0xffff_ffff) + cOut;
    b0 &= 0xffff_ffff;
  }
  const cIsNeg = aIsNeg !== bIsNeg;

  cOut = 1;
  let curr: u64 = 0;
  let next: u64 = 0;
  let m: u64;

  // c8
  m = a1 * b7;
  curr += m;

  m = a2 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a7 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  curr = curr >>> 32 | next;
  next = 0;

  // c7
  m = a0 * b7;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a7 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 28, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c6
  m = a0 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 24, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c5
  m = a0 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 20, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c4
  m = a0 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 16, m as u32);
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

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 12, m as u32);
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
  next = 0;

  // c0
  m = a0 * b0;
  curr += m;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr, m as u32);
}
function mul9(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64;

  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  let a2 = load<u32>(aPtr + 8) as u64;
  let a3 = load<u32>(aPtr + 12) as u64;
  let a4 = load<u32>(aPtr + 16) as u64;
  let a5 = load<u32>(aPtr + 20) as u64;
  let a6 = load<u32>(aPtr + 24) as u64;
  let a7 = load<u32>(aPtr + 28) as u64;
  let a8 = load<u32>(aPtr + 32) as u64;
  const aIsNeg = a0 & 0x8000_0000;
  if (aIsNeg) {
    cOut = 1;
    a8 = (a8 ^ 0xffff_ffff) + cOut;
    cOut = a8 >>> 32;
    a8 &= 0xffff_ffff;
    a7 = (a7 ^ 0xffff_ffff) + cOut;
    cOut = a7 >>> 32;
    a7 &= 0xffff_ffff;
    a6 = (a6 ^ 0xffff_ffff) + cOut;
    cOut = a6 >>> 32;
    a6 &= 0xffff_ffff;
    a5 = (a5 ^ 0xffff_ffff) + cOut;
    cOut = a5 >>> 32;
    a5 &= 0xffff_ffff;
    a4 = (a4 ^ 0xffff_ffff) + cOut;
    cOut = a4 >>> 32;
    a4 &= 0xffff_ffff;
    a3 = (a3 ^ 0xffff_ffff) + cOut;
    cOut = a3 >>> 32;
    a3 &= 0xffff_ffff;
    a2 = (a2 ^ 0xffff_ffff) + cOut;
    cOut = a2 >>> 32;
    a2 &= 0xffff_ffff;
    a1 = (a1 ^ 0xffff_ffff) + cOut;
    cOut = a1 >>> 32;
    a1 &= 0xffff_ffff;
    a0 = (a0 ^ 0xffff_ffff) + cOut;
    a0 &= 0xffff_ffff;
  }

  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  let b2 = same ? a2 : load<u32>(bPtr + 8) as u64;
  let b3 = same ? a3 : load<u32>(bPtr + 12) as u64;
  let b4 = same ? a4 : load<u32>(bPtr + 16) as u64;
  let b5 = same ? a5 : load<u32>(bPtr + 20) as u64;
  let b6 = same ? a6 : load<u32>(bPtr + 24) as u64;
  let b7 = same ? a7 : load<u32>(bPtr + 28) as u64;
  let b8 = same ? a8 : load<u32>(bPtr + 32) as u64;
  const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000);
  if (!same && bIsNeg) {
    cOut = 1;
    b8 = (b8 ^ 0xffff_ffff) + cOut;
    cOut = b8 >>> 32;
    b8 &= 0xffff_ffff;
    b7 = (b7 ^ 0xffff_ffff) + cOut;
    cOut = b7 >>> 32;
    b7 &= 0xffff_ffff;
    b6 = (b6 ^ 0xffff_ffff) + cOut;
    cOut = b6 >>> 32;
    b6 &= 0xffff_ffff;
    b5 = (b5 ^ 0xffff_ffff) + cOut;
    cOut = b5 >>> 32;
    b5 &= 0xffff_ffff;
    b4 = (b4 ^ 0xffff_ffff) + cOut;
    cOut = b4 >>> 32;
    b4 &= 0xffff_ffff;
    b3 = (b3 ^ 0xffff_ffff) + cOut;
    cOut = b3 >>> 32;
    b3 &= 0xffff_ffff;
    b2 = (b2 ^ 0xffff_ffff) + cOut;
    cOut = b2 >>> 32;
    b2 &= 0xffff_ffff;
    b1 = (b1 ^ 0xffff_ffff) + cOut;
    cOut = b1 >>> 32;
    b1 &= 0xffff_ffff;
    b0 = (b0 ^ 0xffff_ffff) + cOut;
    b0 &= 0xffff_ffff;
  }
  const cIsNeg = aIsNeg !== bIsNeg;

  cOut = 1;
  let curr: u64 = 0;
  let next: u64 = 0;
  let m: u64;

  // c9
  m = a1 * b8;
  curr += m;

  m = a2 * b7;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a7 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a8 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  curr = curr >>> 32 | next;
  next = 0;

  // c8
  m = a0 * b8;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b7;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a7 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a8 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 32, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c7
  m = a0 * b7;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a7 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 28, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c6
  m = a0 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 24, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c5
  m = a0 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 20, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c4
  m = a0 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 16, m as u32);
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

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 12, m as u32);
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
  next = 0;

  // c0
  m = a0 * b0;
  curr += m;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr, m as u32);
}
function mul10(aPtr: u32, bPtr: u32, cPtr: u32): void {
  let cOut: u64;

  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  let a2 = load<u32>(aPtr + 8) as u64;
  let a3 = load<u32>(aPtr + 12) as u64;
  let a4 = load<u32>(aPtr + 16) as u64;
  let a5 = load<u32>(aPtr + 20) as u64;
  let a6 = load<u32>(aPtr + 24) as u64;
  let a7 = load<u32>(aPtr + 28) as u64;
  let a8 = load<u32>(aPtr + 32) as u64;
  let a9 = load<u32>(aPtr + 36) as u64;
  const aIsNeg = a0 & 0x8000_0000;
  if (aIsNeg) {
    cOut = 1;
    a9 = (a9 ^ 0xffff_ffff) + cOut;
    cOut = a9 >>> 32;
    a9 &= 0xffff_ffff;
    a8 = (a8 ^ 0xffff_ffff) + cOut;
    cOut = a8 >>> 32;
    a8 &= 0xffff_ffff;
    a7 = (a7 ^ 0xffff_ffff) + cOut;
    cOut = a7 >>> 32;
    a7 &= 0xffff_ffff;
    a6 = (a6 ^ 0xffff_ffff) + cOut;
    cOut = a6 >>> 32;
    a6 &= 0xffff_ffff;
    a5 = (a5 ^ 0xffff_ffff) + cOut;
    cOut = a5 >>> 32;
    a5 &= 0xffff_ffff;
    a4 = (a4 ^ 0xffff_ffff) + cOut;
    cOut = a4 >>> 32;
    a4 &= 0xffff_ffff;
    a3 = (a3 ^ 0xffff_ffff) + cOut;
    cOut = a3 >>> 32;
    a3 &= 0xffff_ffff;
    a2 = (a2 ^ 0xffff_ffff) + cOut;
    cOut = a2 >>> 32;
    a2 &= 0xffff_ffff;
    a1 = (a1 ^ 0xffff_ffff) + cOut;
    cOut = a1 >>> 32;
    a1 &= 0xffff_ffff;
    a0 = (a0 ^ 0xffff_ffff) + cOut;
    a0 &= 0xffff_ffff;
  }

  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  let b2 = same ? a2 : load<u32>(bPtr + 8) as u64;
  let b3 = same ? a3 : load<u32>(bPtr + 12) as u64;
  let b4 = same ? a4 : load<u32>(bPtr + 16) as u64;
  let b5 = same ? a5 : load<u32>(bPtr + 20) as u64;
  let b6 = same ? a6 : load<u32>(bPtr + 24) as u64;
  let b7 = same ? a7 : load<u32>(bPtr + 28) as u64;
  let b8 = same ? a8 : load<u32>(bPtr + 32) as u64;
  let b9 = same ? a9 : load<u32>(bPtr + 36) as u64;
  const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000);
  if (!same && bIsNeg) {
    cOut = 1;
    b9 = (b9 ^ 0xffff_ffff) + cOut;
    cOut = b9 >>> 32;
    b9 &= 0xffff_ffff;
    b8 = (b8 ^ 0xffff_ffff) + cOut;
    cOut = b8 >>> 32;
    b8 &= 0xffff_ffff;
    b7 = (b7 ^ 0xffff_ffff) + cOut;
    cOut = b7 >>> 32;
    b7 &= 0xffff_ffff;
    b6 = (b6 ^ 0xffff_ffff) + cOut;
    cOut = b6 >>> 32;
    b6 &= 0xffff_ffff;
    b5 = (b5 ^ 0xffff_ffff) + cOut;
    cOut = b5 >>> 32;
    b5 &= 0xffff_ffff;
    b4 = (b4 ^ 0xffff_ffff) + cOut;
    cOut = b4 >>> 32;
    b4 &= 0xffff_ffff;
    b3 = (b3 ^ 0xffff_ffff) + cOut;
    cOut = b3 >>> 32;
    b3 &= 0xffff_ffff;
    b2 = (b2 ^ 0xffff_ffff) + cOut;
    cOut = b2 >>> 32;
    b2 &= 0xffff_ffff;
    b1 = (b1 ^ 0xffff_ffff) + cOut;
    cOut = b1 >>> 32;
    b1 &= 0xffff_ffff;
    b0 = (b0 ^ 0xffff_ffff) + cOut;
    b0 &= 0xffff_ffff;
  }
  const cIsNeg = aIsNeg !== bIsNeg;

  cOut = 1;
  let curr: u64 = 0;
  let next: u64 = 0;
  let m: u64;

  // c10
  m = a1 * b9;
  curr += m;

  m = a2 * b8;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b7;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a7 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a8 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a9 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  curr = curr >>> 32 | next;
  next = 0;

  // c9
  m = a0 * b9;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b8;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b7;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a7 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a8 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a9 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 36, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c8
  m = a0 * b8;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b7;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a7 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a8 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 32, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c7
  m = a0 * b7;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a7 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 28, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c6
  m = a0 * b6;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a6 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 24, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c5
  m = a0 * b5;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a5 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 20, m as u32);
  curr = curr >>> 32 | next;
  next = 0;

  // c4
  m = a0 * b4;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a1 * b3;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a2 * b2;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a3 * b1;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  m = a4 * b0;
  curr += m;
  if (curr < m) next += 0x1_0000_0000;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 16, m as u32);
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

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr + 12, m as u32);
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
  next = 0;

  // c0
  m = a0 * b0;
  curr += m;

  if (cIsNeg) {
    m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;
    cOut = m >>> 32;
  } else {
    m = curr;
  }
  store<u32>(cPtr, m as u32);
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

/**
 * Both ops positive
 */
export function mulByUintPositive(aPtr: u32, b: u32, cPtr: u32): void {
  let cOut: u64 = 0;
  for (let i: i32 = precision - 1; i >= 0; i--) {
    const a = load<u32>(aPtr + 4 * i) as u64;
    const c: u64 = a * b + cOut;
    store<u32>(cPtr + 4 * i, c as u32);
    cOut = c >>> 32
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
  if ((load<u32>(ptr) & 0x8000_0000) !== 0) {
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
