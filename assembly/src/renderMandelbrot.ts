// noinspection DuplicatedCode, ShiftOutOfRangeJS, JSUnusedGlobalSymbols

// Shared
export let isBigNum: boolean;
export let canvasW: u32;
export let canvasH: u32;
export let maxIterations: u16;

// Only double
export let xMin: f64;
export let w: f64;
export let yMin: f64;
export let h: f64;
let yMax: f64;
let wStepFraction: f64;
let hStepFraction: f64;


// Only BigNum
export let precision: u32;
export let fracPrecision: u32;
// +++ Generate global declarations


export function renderMandelbrot(): void {
  if (!isBigNum) {
    yMax = yMin + h;
    wStepFraction = w * (1.0 / (canvasW as f64));
    hStepFraction = h * (1.0 / (canvasH as f64));
  } else {
    if (precision - fracPrecision !== 1) {
      // Must be 1
      return;
    }

    initializeBigNum();
  }

  renderRect(0, 0, canvasW, canvasH);
}

function initializeBigNum() { /* +++ Generate initialization */ }

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
        store<u16>(2 * (pY * canvasW + pX), p0);
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
  const iterPtr = 2 * (pY * canvasW + pX);
  const alreadyRendered = load<u16>(iterPtr);
  if (alreadyRendered !== 0) {
    return alreadyRendered;
  }

  const iterNum = isBigNum
      ? renderPointBigNum(pX, pY)
      : renderPointDouble(pX, pY);
  store<u16>(iterPtr, iterNum);
  return iterNum;
}

function renderPointDouble(pX: u32, pY: u32): u16 {
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

function renderPointBigNum(pX: u32, pY: u32): u16 { /* +++ Generate render */ return 0 }
