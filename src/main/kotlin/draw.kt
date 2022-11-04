
import java.math.BigDecimal
import java.util.concurrent.Future
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

const val maxIter = 50

val nThreads = Runtime.getRuntime().availableProcessors() + 1

val executorService = ThreadPoolExecutor(
    nThreads,
    nThreads,
    0L,
    TimeUnit.MILLISECONDS,
    LinkedBlockingQueue(nThreads * 2),
    ThreadPoolExecutor.CallerRunsPolicy()
)

fun draw(unit: BigDecimal, xMinUnit: BigDecimal, wUnit: BigDecimal, yMinUnit: BigDecimal, hUnit: BigDecimal, canvasW: Int, canvasH: Int): ByteArray {
    val xMin = div(xMinUnit, unit)
    val w = div(wUnit, unit)
    val yMin = div(yMinUnit, unit)
    val h = div(hUnit, unit)

    val wStepFraction = mul(w, bigDecimal(1.0 / canvasW))
    val hStepFraction = mul(h, bigDecimal(1.0 / canvasH))
    val outRgbaArray = ByteArray(4 * canvasW * canvasH) { i -> if (i % 4 == 3) 0xff.toByte() else 0 }
    val futures = Array<Future<*>?>(canvasH) { null }
    for (pY in 0 until canvasH) {
        val y0 = add(yMin, mul(hStepFraction, bigDecimal(pY)))
        futures[pY] = executorService.submit {
            for (pX in 0 until canvasW) {
                val x0 = add(xMin, mul(wStepFraction, bigDecimal(pX)))
                var x = ZERO
                var y = ZERO
                for (k in 0..maxIter) {
                    try {
                        val xNext = add(sub(sqr(x), sqr(y)), x0)
                        val yNext = add(mul(mul(TWO, x), y), y0)
                        if (xNext > TWO && yNext > TWO) {
                            outRgbaArray[4 * (pY * canvasW + pX) + 0] = 0xff.toByte()
                            outRgbaArray[4 * (pY * canvasW + pX) + 1] = 0xff.toByte()
                            outRgbaArray[4 * (pY * canvasW + pX) + 2] = 0xff.toByte()
                            break
                        }
                        x = xNext
                        y = yNext
                    } catch (e: ArithmeticException) {
                        outRgbaArray[4 * (pY * canvasW + pX) + 0] = 0xff.toByte()
                        outRgbaArray[4 * (pY * canvasW + pX) + 1] = 0xff.toByte()
                        outRgbaArray[4 * (pY * canvasW + pX) + 2] = 0xff.toByte()
                        break
                    }
                }
            }
        }
    }
    futures.forEach { it?.get() }
    return outRgbaArray
}
