
import java.math.BigDecimal
import java.util.concurrent.Future
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import kotlin.math.ceil
import kotlin.math.log10
import kotlin.math.min
import kotlin.math.sin

val nThreads = Runtime.getRuntime().availableProcessors() + 1

const val taskSize = 20

const val minIterations = 70

val executorService = ThreadPoolExecutor(
    nThreads,
    nThreads,
    0L,
    TimeUnit.MILLISECONDS,
    LinkedBlockingQueue(nThreads),
    ThreadPoolExecutor.CallerRunsPolicy()
)

fun draw(unit: BigDecimal, xMinUnit: BigDecimal, wUnit: BigDecimal, yMinUnit: BigDecimal, hUnit: BigDecimal, canvasW: Int, canvasH: Int): ByteArray {
    val a = createArithmetic(6)

    val xMin = a.div(xMinUnit, unit)
    val w = a.div(wUnit, unit)
    val yMin = a.div(yMinUnit, unit)
    val h = a.div(hUnit, unit)
    val yMax = a.add(yMin, h)

    val sizeLog = log10(min(w.toDouble(), h.toDouble()))
    val maxIterations = if (sizeLog < -1) ceil(-sizeLog * minIterations).toInt() else minIterations

    val wStepFraction = a.mul(w, a.oneOver(canvasW))
    val hStepFraction = a.mul(h, a.oneOver(canvasH))
    val rgbaArray = ByteArray(4 * canvasW * canvasH) { i -> if (i % 4 == 3) 0xff.toByte() else 0 }
    val tasksNum = ceil(canvasH.toDouble() / taskSize).toInt()
    val futures = Array<Future<*>?>(tasksNum) { null }
    for (task in 0 until tasksNum) {
        futures[task] = executorService.submit{
            for (pY in task * taskSize until min((task + 1) * taskSize, canvasH)) {
                // canvas has (0, 0) at the left-top, so flip Y
                val y0 = a.sub(yMax, a.mul(hStepFraction, a.fromInt(pY)))
                for (pX in 0 until canvasW) {
                    val arrayOffset = 4 * (pY * canvasW + pX)
                    val x0 = a.add(xMin, a.mul(wStepFraction, a.fromInt(pX)))
                    var x = a.zero
                    var y = a.zero
                    for (k in 0..maxIterations) {
                        try {
                            val xSqr = a.sqr(x)
                            val ySqr = a.sqr(y)
                            val xNext = a.add(a.sub(xSqr, ySqr), x0)
                            val yNext = a.add(a.twoTimesMul(x, y), y0)
                            if (a.sumGt4(xSqr, ySqr)) {
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
    }
    futures.forEach { it?.get() }
    return rgbaArray
}

fun setDiverges(rgbaArray: ByteArray, offset: Int, iteration: Int) {
    rgbaArray[offset + 0] = ((sin(iteration.toDouble() / 10 + 0) + 1) / 2 * 255).toInt().toByte()
    rgbaArray[offset + 1] = ((sin(iteration.toDouble() / 10 + 5) + 1) / 2 * 255).toInt().toByte()
    rgbaArray[offset + 2] = ((sin(iteration.toDouble() / 10 + 9) + 1) / 2 * 255).toInt().toByte()
}
