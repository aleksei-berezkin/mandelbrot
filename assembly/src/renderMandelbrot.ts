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

const NULL_XY: u64 = 0xffff_ffff_ffff_ffff;
const NOT_RENDERED_COLOR: u32 = 0;


function renderRect(x0: u32, y0: u32, x1: u32, y1: u32): void {
  const contourColor = getContourAndMidPointColor(x0, y0, x1, y1);
  if (contourColor !== NOT_RENDERED_COLOR) {
    for (let y: u32 = y0; y < y1; y++) {
      for (let x: u32 = x0; x < x1; x++) {
        store<u16>(2 * (y * canvasW + x), contourColor as u16);
      }
    }
    return;
  }


  if (x1 - x0 >= minSizeToSplit) {
    const xMid: u32 = (x0 + x1) / 2;
    renderRect(x0, y0, xMid, y1);
    renderRect(xMid, y0, x1, y1);
    return;
  }

  if (y1 - y0 >= minSizeToSplit) {
    const yMid: u32 = (y0 + y1) / 2;
    renderRect(x0, y0, x1, yMid);
    renderRect(x0, yMid, x1, y1);
    return;
  }

  let pendingXY: u64 = NULL_XY;
  for (let y: u32 = y0; y < y1; y++) {
    for (let x: u32 = x0; x < x1; x++) {
      const xy: u64 = (x as u64) | (y as u64) << 32;
      if (loadRendered(xy) === NOT_RENDERED_COLOR) {
        if (pendingXY === NULL_XY) {
          pendingXY = xy;
        } else {
          renderTwoPoints(pendingXY, xy);
          pendingXY = NULL_XY;
        }
      }
    }
  }

  if (pendingXY !== NULL_XY) {
    const otherXY: u64 = ((x1 + canvasW - 1) / 2 as u64) | ((y1 + canvasH - 1) / 2 as u64) << 32;
    renderTwoPoints(pendingXY, otherXY);
  }
}

/**
 * @return True if the same color
 */
function getContourAndMidPointColor(x0: u32, y0: u32, x1: u32, y1: u32): u32 {
  // return NOT_RENDERED_COLOR;
  genState = 0;
  genX0 = x0;
  genY0 = y0;
  genX1 = x1;
  genY1 = y1;

  let pendingXY: u64 = NULL_XY;
  let prevTwoColors: u64 = NOT_RENDERED_COLOR;

  for (let i: u32 = 0; ; i++) {
    const xy = generateContourAndMidPoints();
    if (xy === NULL_XY) {
      // disregard pending XY
      return prevTwoColors as u32;
    }

    const currOneColor: u32 = loadRendered(xy);
    if (currOneColor === NOT_RENDERED_COLOR) {
      if (pendingXY === NULL_XY) {
        pendingXY = xy;
      } else {
        const currTwoColors = renderTwoPoints(pendingXY, xy);
        if (prevTwoColors === NOT_RENDERED_COLOR) {
          prevTwoColors = currTwoColors
        } else if (prevTwoColors !== currTwoColors) {
          return NOT_RENDERED_COLOR;
        }
        pendingXY = NULL_XY;
      }
    } else {
      if (prevTwoColors === NOT_RENDERED_COLOR) {
        prevTwoColors = currOneColor | (currOneColor << 32);
      } else if ((prevTwoColors as u32) !== currOneColor) {
        return NOT_RENDERED_COLOR;
      }
    }

    if (i === 5 && (prevTwoColors as u32) !== maxIterations) {
      // Quicker check for colored (diverging) rects
      // disregard pendingXY
      return prevTwoColors as u32;
    }
  }

  // Unreachable in fact
  // noinspection UnreachableCodeJS,JSUnusedAssignment
  return prevTwoColors as u32;
}

const step: u64 = 10;
let genState: u64 = 0;
let genX0: u64 = 0;
let genY0: u64 = 0;
let genX1: u64 = 0;
let genY1: u64 = 0;

function generateContourAndMidPoints(): u64 {
  const baseState = genState & 0xf;
  let p = genState >>> 4;
  switch (baseState as u32) {
    case 0:
      genState = 1;
      return genX0 | (genY0 << 32);
    case 1:
      genState = 2;
      return genX0 | (genY1 - 1) << 32;
    case 2:
      genState = 3;
      return (genX1 - 1) | genY0 << 32;
    case 3:
      genState = 4;
      return (genX1 - 1) | (genY1 - 1) << 32;
    case 4:
      genState = 5 | (genY0 + step) << 4;
      return ((genX0 + genX1 - 1) / 2) | ((genY0 + genY1 - 1) / 2) << 32;
    case 5:
      // x0 (y0 -> y1)
      if (p < genY1) {
        genState = 5 | (p + step) << 4;
        return genX0 | p << 32;
      }
      p = genX0 + step
      // fall-through
    case 6:
      // (x0->x1) y1
      if (p < genX1) {
        genState = 6 | (p + step) << 4;
        return p | (genY1 - 1) << 32;
      }
      p = genX0 + step;
      // fall-through
    case 7:
      // (x0 -> x1) y0
      if (p < genX1) {
        genState = 7 | (p + step) << 4;
        return p | genY0 << 32;
      }
      p = genY0 + step;
      // fall-through
    case 8:
      // x1 (y0 -> y1)
      if (p < genY1) {
        genState = 8 | (p + step) << 4;
        return (genX1 - 1) | p << 32;
      }
      // fall-through
    default:
      return NULL_XY;
  }
}


function loadRendered(xy: u64): u32 {
  const y = (xy >>> 32) as u32;
  const x = xy as u32;
  return load<u16>(2 * (y * canvasW + x)) as u32;
}

function renderTwoPoints(xy1: u64, xy2: u64): u64 {
  // TODO vectorize
  const c1 = renderPoint(xy1 as u32, (xy1 >>> 32) as u32) as u64;
  const c2 = renderPoint(xy2 as u32, (xy2 >>> 32) as u32) as u64;

  return c1 | (c2 << 32);
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

// noinspection JSUnusedLocalSymbols
function renderPointBigNum(pX: u32, pY: u32): u16 { /* +++ Generate render */ return 0 }
