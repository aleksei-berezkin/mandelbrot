let xMin: f64;
let w: f64;
let yMax: f64;
let h: f64;

let canvasW: u32;

let maxIterations: u16;

let wStepFraction: f64;
let hStepFraction: f64;

// noinspection JSUnusedGlobalSymbols
export function renderMandelbrot(_xMin: f64, _w: f64, _yMin: f64, _h: f64, _canvasW: u32, _canvasH: u32, _maxIterations: u16): void {
  xMin = _xMin;
  w = _w;
  yMax = _yMin + _h;
  h = _h;

  canvasW = _canvasW;

  maxIterations = _maxIterations;

  wStepFraction = _w * (1.0 / (_canvasW as f64));
  hStepFraction = _h * (1.0 / (_canvasH as f64));

  renderRect(0, 0, _canvasW, _canvasH);
}

const maxSizeToOptimize: u32 = 128;
const minSizeToOptimize: u32 = 6;

function renderRect(pX0: u32, pY0: u32, pX1: u32, pY1: u32): void {
  const pXMid: u32 = (pX0 + pX1) / 2;
  const pYMid: u32 = (pY0 + pY1) / 2;

  if (pX1 - pX0 > maxSizeToOptimize) {
    renderRect(pX0, pY0, pXMid, pY1);
    renderRect(pXMid, pY0, pX1, pY1);
    return;
  }

  if (pY1 - pY0 > maxSizeToOptimize) {
    renderRect(pX0, pY0, pX1, pYMid);
    renderRect(pX0, pYMid, pX1, pY1);
    return;
  }

  const p0 = renderPoint(pX0, pY0);
  if (p0 === renderPoint(pX0, pY1 - 1)
      && p0 === renderPoint(pX1 - 1, pY0)
      && p0 === renderPoint(pX1 - 1, pY1 - 1)

      && p0 === renderPoint((pX0 + pXMid) / 2, pY0)
      && p0 === renderPoint(pXMid, pY0)
      && p0 === renderPoint((pXMid + pX1) / 2, pY0)

      && p0 === renderPoint(pX0, (pY0 + pYMid) / 2)
      && p0 === renderPoint(pX0, pYMid)
      && p0 === renderPoint(pX0, (pYMid + pY1) / 2)

      && p0 === renderPoint((pX0 + pXMid) / 2, pY1 - 1)
      && p0 === renderPoint(pXMid, pY1 - 1)
      && p0 === renderPoint((pXMid + pX1) / 2, pY1 - 1)

      // TODO x1
      && p0 === renderPoint(pXMid, pYMid)
  ) {
    for (let pY: u32 = pY0; pY < pY1; pY++) {
      const rowOffset = pY * canvasW;
      for (let pX: u32 = pX0; pX < pX1; pX++) {
        store<u16>(2 * (rowOffset + pX), p0);
      }
    }
    return;
  }

  if (pX1 - pX0 >= minSizeToOptimize) {
    renderRect(pX0, pY0, pXMid, pY1);
    renderRect(pXMid, pY0, pX1, pY1);
    return;
  }

  if (pY1 - pY0 >= minSizeToOptimize) {
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
  const rowOffset = pY * canvasW;
  const ptr: u32 = 2 * (rowOffset + pX);
  const alreadyRendered = load<u16>(ptr);
  if (alreadyRendered !== 0) {
    return alreadyRendered;
  }

  // canvas has (0, 0) at the left-top, so flip Y
  const x0: f64 = xMin + wStepFraction * pX
  const y0: f64 = yMax - hStepFraction * pY;

  let x = 0 as f64
  let y = 0 as f64

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

  store<u16>(ptr, i);

  return i;
}
