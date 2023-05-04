// noinspection DuplicatedCode, ShiftOutOfRangeJS, JSUnusedGlobalSymbols,JSSuspiciousNameCombination

// Shared
export let isBigNum: boolean;
export let canvasW: u32;
export let canvasH: u32;
export let maxIterations: u32;

// Only double
export let xMin: f64;
export let w: f64;
export let yMin: f64;
export let h: f64;
let yMax: f64;
let wStepFraction: f64;
let hStepFraction: f64;
let wStepFractionVec: v128;
let hStepFractionVec: v128;


// Only BigNum
export let precision: u32;
export let fracPrecision: u32;
// +++ Generate global declarations


export function renderMandelbrot(): void {
  if (!isBigNum) {
    yMax = yMin + h;
    wStepFraction = w * (1.0 / (canvasW as f64));
    hStepFraction = h * (1.0 / (canvasH as f64));
    wStepFractionVec = v128.splat<f64>(wStepFraction);
    hStepFractionVec = v128.splat<f64>(hStepFraction);
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

const minSizeToSplit: u32 = 5;

const NULL_XY: u64 = 0xffff_ffff_ffff_ffff;
const NOT_RENDERED_COLOR: u32 = 0;


function renderRect(x0: u32, y0: u32, x1: u32, y1: u32): void {
  const contourColor: u32 = getContourAndMidPointColor(x0, y0, x1, y1);
  if (contourColor !== NOT_RENDERED_COLOR) {
    for (let y: u32 = y0; y < y1; y++) {
      for (let x: u32 = x0; x < x1; x++) {
        store<u32>(4 * (y * canvasW + x), contourColor);
      }
    }
    return;
  }


  if (x1 - x0 >= minSizeToSplit && x1 - x0 > y1 - y0) {
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
          renderAndStoreTwoPoints(pendingXY, xy);
          pendingXY = NULL_XY;
        }
      }
    }
  }

  if (pendingXY !== NULL_XY) {
    const otherXY: u64 = ((x1 + canvasW - 1) / 2 as u64) | ((y1 + canvasH - 1) / 2 as u64) << 32;
    renderAndStoreTwoPoints(pendingXY, otherXY);
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
    const xy = generateContourAndMidPoints((prevTwoColors as u32) !== maxIterations);
    if (xy === NULL_XY) {
      break;
    }

    const currOneColor: u32 = loadRendered(xy);
    if (currOneColor === NOT_RENDERED_COLOR) {
      if (pendingXY === NULL_XY) {
        pendingXY = xy;
      } else {
        const currTwoColors = renderAndStoreTwoPoints(pendingXY, xy);
        if (currTwoColors as u32 !== (currTwoColors >>> 32) as u32) {
          return NOT_RENDERED_COLOR;
        }
        if (prevTwoColors === NOT_RENDERED_COLOR) {
          prevTwoColors = currTwoColors
        } else if (prevTwoColors !== currTwoColors) {
          return NOT_RENDERED_COLOR;
        }
        pendingXY = NULL_XY;
      }
    } else {
      if (prevTwoColors === NOT_RENDERED_COLOR) {
        prevTwoColors = (currOneColor as u64) | ((currOneColor as u64) << 32);
      } else if ((prevTwoColors as u32) !== currOneColor) {
        return NOT_RENDERED_COLOR;
      }
    }
  }

  if (pendingXY !== NULL_XY) {
    const otherXY: u64 = (((pendingXY as u32) + canvasW - 1) / 2 as u64) | (((pendingXY >>> 32 as u32) + canvasH - 1) / 2 as u64) << 32;
    const currTwoColors = renderAndStoreTwoPoints(pendingXY, otherXY);
    if (currTwoColors as u32 !== prevTwoColors as u32) {
      return NOT_RENDERED_COLOR;
    }
  }

  return prevTwoColors as u32;
}

const stepDiverged: u64 = 48;
const stepConverged: u64 = 9;
const minSizeForMidPoint: u64 = 18;
let genState: u64 = 0;
let genX0: u64 = 0;
let genY0: u64 = 0;
let genX1: u64 = 0;
let genY1: u64 = 0;

/**
 * For diverged (colored) rectangles can take larger step
 */
function generateContourAndMidPoints(diverged: boolean): u64 {
  const step = diverged ? stepDiverged : stepConverged;
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
      if (genX1 - genX0 >= minSizeForMidPoint || genY1 - genY0 >= minSizeForMidPoint) {
        genState = 5 | (genY0 + step / 3) << 4;
        return ((genX0 + genX1 - 1) / 2) | ((genY0 + genY1 - 1) / 2) << 32;
      }
      p = genY0 + step / 3;
      // fall-through
    case 5:
      // x0 (y0 -> y1)
      if (p < genY1) {
        genState = 5 | (p + step) << 4;
        return genX0 | p << 32;
      }
      p = genX0 + step / 3;
      // fall-through
    case 6:
      // (x0->x1) y1
      if (p < genX1) {
        genState = 6 | (p + step) << 4;
        return p | (genY1 - 1) << 32;
      }
      p = genX0 + step * 2 / 3;
      // fall-through
    case 7:
      // (x0 -> x1) y0
      if (p < genX1) {
        genState = 7 | (p + step) << 4;
        return p | genY0 << 32;
      }
      p = genY0 + step * 2 / 3;
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
  return load<u32>(4 * (y * canvasW + x));
}

function renderAndStoreTwoPoints(xy0: u64, xy1: u64): u64 {
  const c0c1 = isBigNum
      ? renderTwoPointsBigNum(xy0, xy1)
      : renderTwoPointsDouble(xy0, xy1);

  // ptr = 4 * (y * canvasW + x)
  store<u32>(4 * (((xy0 >>> 32) as u32) * canvasW + (xy0 as u32)), c0c1 as u32);
  store<u32>(4 * (((xy1 >>> 32) as u32) * canvasW + (xy1 as u32)), (c0c1 >>> 32) as u32);

  return c0c1;
}

const two = v128.splat<f64>(2.0);
const four = v128.splat<f64>(4.0);

function renderTwoPointsDouble(xy0: u64, xy1: u64): u64 {
  let pX = v128.splat<f64>((xy0 & 0xffff_ffff) as f64);
  pX = v128.replace_lane<f64>(pX, 1, (xy1 & 0xffff_ffff) as f64);

  let pY = v128.splat<f64>((xy0 >>> 32) as f64);
  pY = v128.replace_lane<f64>(pY, 1, (xy1 >>> 32) as f64);

  // canvas has (0, 0) at the left-top, so flip Y
  // x0 = xMin + wStepFraction * pX
  // y0 = yMax - hStepFraction * pY;
  const x0 = v128.add<f64>(v128.splat<f64>(xMin), v128.mul<f64>(wStepFractionVec, pX));
  const y0 = v128.sub<f64>(v128.splat<f64>(yMax), v128.mul<f64>(hStepFractionVec, pY));

  let x = f64x2(0, 0);
  let y = f64x2(0, 0);

  let divergedAtIter0: u32 = 0;
  let divergedAtIter1: u32 = 0;

  for (let i: u32 = 0; i < maxIterations; i++) {
    const xSqr = v128.mul<f64>(x, x);
    const ySqr = v128.mul<f64>(y, y);
    const gt4 = v128.gt<f64>(v128.add<f64>(xSqr, ySqr), four);

    if (!divergedAtIter0 && v128.extract_lane<u64>(gt4, 0)) {
      divergedAtIter0 = i;
    }
    if (!divergedAtIter1 && v128.extract_lane<u64>(gt4, 1)) {
      divergedAtIter1 = i;
    }

    if (divergedAtIter0 && divergedAtIter1) {
      break;
    }

    // xNext = xSqr - ySqr + x0;
    // yNext = 2.0 * x * y + y0;
    const xNext = v128.add<f64>(v128.sub<f64>(xSqr, ySqr), x0);
    y = v128.add<f64>(v128.mul<f64>(v128.mul<f64>(two, x), y), y0);

    x = xNext;
  }

  if (!divergedAtIter0) {
    divergedAtIter0 = maxIterations;
  }
  if (!divergedAtIter1) {
    divergedAtIter1 = maxIterations;
  }

  return (divergedAtIter1 as u64) << 32 | divergedAtIter0 as u64;
}

// noinspection JSUnusedLocalSymbols
function renderTwoPointsBigNum(xy0: u64, xy1: u64): u64 { /* +++ Generate render vectorized */ return 0 }
