
import java.math.BigDecimal
import java.math.MathContext

fun createArithmetic(precision: Int) = DoubleArithmetic()

interface Arithmetic {
    val zero: Number
    fun fromInt(a: Int): Number
    fun add(a: Number, b: Number): Number
    fun sub(a: Number, b: Number): Number
    fun mul(a: Number, b: Number): Number
    fun div(a: Number, b: Number): Number
    fun oneOver(a: Int): Number
    fun twoTimesMul(a: Number, b: Number): Number
    fun sqr(a: Number): Number = mul(a, a)
    fun sumGt4(a: Number, b: Number): Boolean
}

class BigDecimalArithmetic(precision: Int): Arithmetic {
    private val mathContext = MathContext(precision)
    private val one = BigDecimal.ONE
    private val two = one.add(one, mathContext)
    private val four = BigDecimal(4)

    override val zero: BigDecimal = BigDecimal.ZERO
    override fun fromInt(a: Int) = BigDecimal(a)
    override fun add(a: Number, b: Number): Number = (a as BigDecimal).add(b as BigDecimal, mathContext)
    override fun sub(a: Number, b: Number): Number = (a as BigDecimal).subtract(b as BigDecimal, mathContext)
    override fun mul(a: Number, b: Number): Number = (a as BigDecimal).multiply(b as BigDecimal, mathContext)
    override fun div(a: Number, b: Number): Number = (a as BigDecimal).divide(b as BigDecimal, mathContext)
    override fun oneOver(a: Int): Number = div(one, BigDecimal(a))
    override fun twoTimesMul(a: Number, b: Number): Number = mul(two, mul(a, b))
    override fun sumGt4(a: Number, b: Number) = add(a, b) as BigDecimal >= four
}

class DoubleArithmetic: Arithmetic {
    override val zero = 0.0
    override fun fromInt(a: Int): Number = a.toDouble()
    override fun add(a: Number, b: Number) = a.toDouble() + b.toDouble()
    override fun sub(a: Number, b: Number) = a.toDouble() - b.toDouble()
    override fun mul(a: Number, b: Number) = a.toDouble() * b.toDouble()
    override fun div(a: Number, b: Number) = a.toDouble() / b.toDouble()
    override fun oneOver(a: Int): Number = 1.0 / a
    override fun twoTimesMul(a: Number, b: Number) = 2.0 * a.toDouble() * b.toDouble()
    override fun sumGt4(a: Number, b: Number) = a.toDouble() + b.toDouble() >= 4.0
}
