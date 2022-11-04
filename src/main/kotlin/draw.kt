
import java.math.BigDecimal
import java.util.concurrent.Future
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import kotlin.math.sin

const val maxIter = 50

val nThreads = Runtime.getRuntime().availableProcessors() + 1

val executorService = ThreadPoolExecutor(
    nThreads,
    nThreads,
    0L,
    TimeUnit.MILLISECONDS,
    LinkedBlockingQueue(nThreads * 4),
    ThreadPoolExecutor.CallerRunsPolicy()
)

fun draw(unit: BigDecimal, xMinUnit: BigDecimal, wUnit: BigDecimal, yMinUnit: BigDecimal, hUnit: BigDecimal, canvasW: Int, canvasH: Int): ByteArray {
    val xMin = div(xMinUnit, unit)
    val w = div(wUnit, unit)
    val yMin = div(yMinUnit, unit)
    val h = div(hUnit, unit)
    val yMax = add(yMin, h)

    val wStepFraction = mul(w, bigDecimal(1.0 / canvasW))
    val hStepFraction = mul(h, bigDecimal(1.0 / canvasH))
    val rgbaArray = ByteArray(4 * canvasW * canvasH) { i -> if (i % 4 == 3) 0xff.toByte() else 0 }
    val futures = Array<Future<*>?>(canvasH) { null }
    for (pY in 0 until canvasH) {
        // canvas has (0, 0) at the left-top, so flip Y
        val y0 = sub(yMax, mul(hStepFraction, bigDecimal(pY)))
        futures[pY] = executorService.submit {
            for (pX in 0 until canvasW) {
                val arrayOffset = 4 * (pY * canvasW + pX)
                val x0 = add(xMin, mul(wStepFraction, bigDecimal(pX)))
                var x = ZERO
                var y = ZERO
                for (k in 0..maxIter) {
                    try {
                        val xSqr = sqr(x)
                        val ySqr = sqr(y)
                        val xNext = add(sub(xSqr, ySqr), x0)
                        val yNext = add(mul(mul(TWO, x), y), y0)
                        if (add(xSqr, ySqr) > FOUR) {
                            setDiverges(rgbaArray, arrayOffset, k)
                            break
                        }
                        x = xNext
                        y = yNext
                    } catch (e: ArithmeticException) {
                        setDiverges(rgbaArray, arrayOffset, k)
                        break
                    }
                }
            }
        }
    }
    futures.forEach { it?.get() }
    return rgbaArray
}

fun setDiverges(rgbaArray: ByteArray, offset: Int, iteration: Int) {
    rgbaArray[offset + 0] = ((sin(iteration.toDouble() / 10 + 0) + 1) / 2 * 255).toInt().toByte()
    rgbaArray[offset + 1] = ((sin(iteration.toDouble() / 10 + 5) + 1) / 2 * 255).toInt().toByte()
    rgbaArray[offset + 2] = ((sin(iteration.toDouble() / 10 + 9) + 1) / 2 * 255).toInt().toByte()
}
