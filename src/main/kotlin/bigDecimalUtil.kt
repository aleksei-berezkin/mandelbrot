import java.math.BigDecimal
import java.math.MathContext
import java.math.RoundingMode

val PR: MathContext = MathContext(6, RoundingMode.HALF_EVEN)
val TWO: BigDecimal = bigDecimal(2)
val FOUR: BigDecimal = bigDecimal(4)
val ZERO: BigDecimal = bigDecimal(0)
fun bigDecimal(v: String) = BigDecimal(v.toCharArray(), 0, v.length, PR)
fun bigDecimal(v: Double) = BigDecimal(v, PR)
fun bigDecimal(v: Int) = BigDecimal(v, PR)
fun add(a: BigDecimal, b: BigDecimal): BigDecimal = a.add(b, PR)
fun sub(a: BigDecimal, b: BigDecimal): BigDecimal = a.subtract(b, PR)
fun mul(a: BigDecimal, b: BigDecimal): BigDecimal = a.multiply(b, PR)
fun div(a: BigDecimal, b: BigDecimal): BigDecimal = a.divide(b, PR)
fun sqr(a: BigDecimal): BigDecimal = mul(a, a)
