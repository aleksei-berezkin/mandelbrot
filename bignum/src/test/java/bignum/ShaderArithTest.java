package bignum;

import org.junit.Test;

import static bignum.BigNum.CLR_NEGATIVE;
import static bignum.BigNum.IS_OVERFLOW;
import static bignum.BigNum._INT_SZ;
import static bignum.BigNum._SZ_;
import static bignum.BigNum.add;
import static bignum.BigNum.floatToBigNum;
import static bignum.BigNum.intToBigNum;
import static bignum.BigNum.mul;
import static bignum.BigNum.toDouble;
import static bignum.BigNum.toLong;
import static bignum.TestUtil.negate;
import static org.junit.Assert.assertEquals;

public class ShaderArithTest extends RestoreGlobalsTest {
    @Test
    public void zeroInt() {
        assertEquals(0, toDouble(intToBigNum(0)), 0);
    }

    @Test
    public void oneInt() {
        assertEquals(1, toDouble(intToBigNum(1)), 0);
    }

    @Test
    public void someInt() {
        assertEquals(0x7fff, toDouble(intToBigNum(0x7fff)), 0);
    }

    @Test
    public void negInt() {
        assertEquals(-0x8123L, toDouble(negate(intToBigNum(0x8123L))), 0);
    }

    @Test
    public void negInt2() {
        assertEquals(-0x0123, toDouble(negate(intToBigNum(0x0123))), 0);
    }

    @Test
    public void minInt() {
        assertEquals(-0xffffL, toLong(negate(maxPositive())), 0);
    }

    @Test
    public void simpleFloat() {
        assertEquals(.625, toDouble(floatToBigNum(.625F)), 0);
    }

    @Test
    public void addition() {
        long[] a = intToBigNum(0xffff);
        long[] c = add(a, floatToBigNum(.625F));
        assertEquals(0xffff + .625F, toDouble(c), 0);
    }

    @Test
    public void additionNeg() {
        long[] a = negate(intToBigNum(0xffff));
        long[] c = add(a, floatToBigNum(.625F));
        assertEquals(-0xffffL + .625F, toDouble(c), 0);
    }

    @Test
    public void additionMaxOverflow() {
        long[] a = maxPositive();
        assertEquals(0L, a[0] & IS_OVERFLOW);
        long[] c = add(a, smallestFraction());
        assertEquals(IS_OVERFLOW, c[0] & IS_OVERFLOW);
    }

    @Test
    public void additionNegOverflow() {
        long[] a = negate(intToBigNum(0xfff0));
        long[] c = add(a, negate(intToBigNum(0x10)));
        assertEquals(IS_OVERFLOW, c[0] & IS_OVERFLOW);
    }

    @Test
    public void subtractionAB() {
        long[] a = intToBigNum(0x2345);
        long[] c = add(a, negate(intToBigNum(0x4523)));
        assertEquals(0x2345 - 0x4523, toLong(c));
    }

    @Test
    public void subtractionBA() {
        long[] a = negate(intToBigNum(0x1881));
        long[] c = add(a, intToBigNum(0xabed));
        assertEquals(0xabed - 0x1881, toLong(c));
    }

    @Test
    public void multiplication() {
        long[] a0 = intToBigNum(0x12);
        long[] a1 = add(a0, floatToBigNum(.125F));
        long[] b0 = negate(intToBigNum(0x23));
        long[] b1 = add(b0, floatToBigNum(.5F));

        long[] c = mul(a1, b1);
        assertEquals((0x12 + .125) * (-0x23 + .5F), toDouble(c), 0);
    }

    @Test
    public void multiplicationLargerIntPart() {
        _INT_SZ = 2;
        long[] a0 = intToBigNum(0x1_0034);
        long[] a1 = add(a0, floatToBigNum(.125));
        long[] b0 = intToBigNum(0xe0ab);
        long[] b1 = add(b0, floatToBigNum(.5));

        long[] c = mul(a1, b1);
        assertEquals((0x1_0034 + .125) * (0xe0ab + .5), toDouble(c), 0);
    }

    @Test
    public void mulOnlyInt() {
        _INT_SZ = 2;
        _SZ_ = 2;
        long[] a = intToBigNum(0x3_000a);
        long[] b = intToBigNum(0x20bb);

        long[] c = mul(a, b);
        assertEquals(0x3_000a * 0x20bb, toLong(c));
    }

    @Test
    public void mulOnlyIntOverflow() {
        _INT_SZ = 2;
        _SZ_ = 2;
        long[] a = intToBigNum(0x1_0000);
        long[] b = intToBigNum(0x2_0000);

        long[] c = mul(a, b);
        assertEquals(IS_OVERFLOW, c[0] & IS_OVERFLOW);
    }

    @Test
    public void mulMinimalOverflow() {
        long[] a = intToBigNum(0x8000L);
        long[] c = mul(a, intToBigNum(2));
        assertEquals(Double.POSITIVE_INFINITY, toDouble(c), 0);
    }

    @Test
    public void mulToMinNeg() {
        long[] a = negate(intToBigNum(0x7fffL));
        long[] c = mul(a, intToBigNum(2));
        assertEquals(-0xfffeL, toDouble(c), 0);
    }

    private long[] maxPositive() {
        long[] d = new long[_SZ_];
        for (int i = 0; i < _SZ_; i++) {
            d[i] = 0xffff;
        }
        d[0] &= CLR_NEGATIVE;
        d[0] &= ~IS_OVERFLOW;
        return d;
    }

    private long[] smallestFraction() {
        long[] d = new long[_SZ_];
        d[_SZ_ - 1] = 1;
        return d;
    }
}
