const minIterations: u32 = 70

export function renderMandelbrot(unit: f64, xMinUnit: f64, wUnit: f64, yMinUnit: f64, hUnit: f64, canvasW: u32, canvasH: u32): Uint8ClampedArray {
  const xMin = xMinUnit / unit;
  const w = wUnit / unit;
  const yMin = yMinUnit / unit;
  const h = hUnit / unit;
  const yMax = yMin + h;

  const sizeLog = Math.log10(Math.min(w, h))
  const maxIterations: u32 = (sizeLog < -1 ? Math.ceil(-sizeLog * minIterations) : minIterations) as u32

  const wStepFraction: f64 = w * (1.0 / (canvasW as f64))
  const hStepFraction: f64 = h * (1.0 / (canvasH as f64))
  const rgbaArray = new Uint8ClampedArray(4 * canvasW * canvasH)

  for (let pY: u32 = 0; pY < canvasH; pY++) {
    // canvas has (0, 0) at the left-top, so flip Y
    const y0 = yMax - hStepFraction * pY;
    for (let pX: u32 = 0; pX < canvasW; pX++) {
      const x0 = xMin + wStepFraction * pX

      let x = 0 as f64
      let y = 0 as f64
      const arrOffset = 4 * (pY * canvasW + pX)
      rgbaArray[arrOffset + 3] = 255 as u8;
      for (let k: u32 = 0; k < maxIterations; k++) {
        const xSqr = x * x;
        const ySqr = y * y;
        const xNext = xSqr - ySqr + x0;
        const yNext = 2.0 * x * y + y0;
        if (xSqr + ySqr > 4.0) {
          rgbaArray[arrOffset]     = ((Math.sin((k as f64) / 10.0 + 0.1) + 1.0) / 2.0 * 255.0) as u8;
          rgbaArray[arrOffset + 1] = ((Math.sin((k as f64) / 10.0 + 5.0) + 1.0) / 2.0 * 255.0) as u8;
          rgbaArray[arrOffset + 2] = ((Math.sin((k as f64) / 10.0 + 9.0) + 1.0) / 2.0 * 255.0) as u8;
          break;
        }
        x = xNext
        y = yNext
      }
    }
  }

  return rgbaArray;
}
