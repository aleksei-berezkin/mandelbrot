// noinspection JSUnusedGlobalSymbols
export function renderMandelbrot(unit: f64, xMinUnit: f64, wUnit: f64, yMinUnit: f64, hUnit: f64, canvasW: u32, canvasH: u32, maxIterations: u16): void {
  const xMin = xMinUnit / unit;
  const w = wUnit / unit;
  const yMin = yMinUnit / unit;
  const h = hUnit / unit;
  const yMax = yMin + h;

  const wStepFraction: f64 = w * (1.0 / (canvasW as f64))
  const hStepFraction: f64 = h * (1.0 / (canvasH as f64))

  for (let pY: u16 = 0; pY < canvasH; pY++) {
    // canvas has (0, 0) at the left-top, so flip Y
    const y0 = yMax - hStepFraction * pY;
    const rowOffset = pY * canvasW;
    for (let pX: u16 = 0; pX < canvasW; pX++) {
      const x0 = xMin + wStepFraction * pX

      let x = 0 as f64
      let y = 0 as f64

      let i: u16 = 0;
      for (i = 0; i < maxIterations; i++) {
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

      store<u16>(2 * (rowOffset + pX), i);
    }
  }
}
