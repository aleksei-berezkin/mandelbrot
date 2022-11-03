import java.math.BigDecimal

const val maxIter = 20

fun draw(unit: BigDecimal, xMinUnit: BigDecimal, wUnit: BigDecimal, yMinUnit: BigDecimal, hUnit: BigDecimal, canvasW: Int, canvasH: Int): Array<Byte> {
    println(Runtime.getRuntime().availableProcessors())
    val xMin = div(xMinUnit, unit)
    val w = div(wUnit, unit)
    val yMin = div(yMinUnit, unit)
    val h = div(hUnit, unit)

    val wStepFraction = mul(w, bigDecimal(1.0 / canvasW))
    val hStepFraction = mul(h, bigDecimal(1.0 / canvasH))
    val outRgbaArray = Array<Byte>(4 * canvasW * canvasH) { 0 }
    for (i in 0 until canvasW) {
        val x0 = add(xMin, mul(wStepFraction, bigDecimal(i)))
        for (j in 0 until canvasH) {
            val y0 = add(yMin, mul(hStepFraction, bigDecimal(j)))
            var x = ZERO
            var y = ZERO
            for (k in 0..maxIter) {
                val xNext = add(sub(sqr(x), sqr(y)), x0)
                val yNext = add(mul(mul(TWO, x), y), y0)
                if (xNext > TWO && yNext > TWO) {
                    outRgbaArray[4 * (j * canvasW + i) + 0] = 1
                    outRgbaArray[4 * (j * canvasW + i) + 1] = 1
                    outRgbaArray[4 * (j * canvasW + i) + 2] = 1
                    outRgbaArray[4 * (j * canvasW + i) + 3] = 1
                    break
                }
                x = xNext
                y = yNext
            }
        }
    }
    return outRgbaArray
}
