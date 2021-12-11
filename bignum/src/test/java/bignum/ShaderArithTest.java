package bignum;

import org.junit.Test;

import static bignum.BigNum._INT_SZ;
import static bignum.BigNum._SZ_;
import static bignum.BigNum.addInPlace;
import static bignum.BigNum.floatToBigNum;
import static bignum.BigNum.intToBigNum;
import static bignum.BigNum.isOverflow;
import static bignum.BigNum.mulToNew;
import static bignum.BigNum.toDouble;
import static bignum.BigNum.toLong;
import static bignum.TestUtil.negate;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

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
        addInPlace(a, floatToBigNum(.625F));
        assertEquals(0xffff + .625F, toDouble(a), 0);
    }

    @Test
    public void additionNeg() {
        long[] a = negate(intToBigNum(0xffff));
        addInPlace(a, floatToBigNum(.625F));
        assertEquals(-0xffffL + .625F, toDouble(a), 0);
    }

    @Test
    public void additionMaxOverflow() {
        long[] a = maxPositive();
        assertFalse(isOverflow(a));
        addInPlace(a, smallestFraction());
        assertTrue(isOverflow(a));
    }

    @Test
    public void additionNegOverflow() {
        long[] a = negate(intToBigNum(0xfff0));
        addInPlace(a, negate(intToBigNum(0x10)));
        assertTrue(isOverflow(a));
    }

    @Test
    public void subtractionAB() {
        long[] a = intToBigNum(0x2345);
        addInPlace(a, negate(intToBigNum(0x4523)));
        assertEquals(0x2345 - 0x4523, toLong(a));
    }

    @Test
    public void subtractionBA() {
        long[] a = negate(intToBigNum(0x1881));
        addInPlace(a, intToBigNum(0xabed));
        assertEquals(0xabed - 0x1881, toLong(a));
    }

    @Test
    public void multiplication() {
        long[] a = intToBigNum(0x12);
        addInPlace(a, floatToBigNum(.125F));
        long[] b = negate(intToBigNum(0x23));
        addInPlace(b, floatToBigNum(.5F));

        long[] c = mulToNew(a, b);
        assertEquals((0x12 + .125) * (-0x23 + .5F), toDouble(c), 0);

        assertEquals(0x12 + .125F, toDouble(a), 0);
        assertEquals(-0x23 + .5F, toDouble(b), 0);
    }

    @Test
    public void multiplicationLargerIntPart() {
        _INT_SZ = 2;
        long[] a = intToBigNum(0x1_0034);
        addInPlace(a, floatToBigNum(.125));
        long[] b = intToBigNum(0xe0ab);
        addInPlace(b, floatToBigNum(.5));

        long[] c = mulToNew(a, b);
        assertEquals((0x1_0034 + .125) * (0xe0ab + .5), toDouble(c), 0);
    }

    @Test
    public void mulOnlyInt() {
        _INT_SZ = 2;
        _SZ_ = 2;
        long[] a = intToBigNum(0x3_000a);
        long[] b = intToBigNum(0x20bb);

        long[] c = mulToNew(a, b);
        assertEquals(0x3_000a * 0x20bb, toLong(c));
    }

    @Test
    public void mulOnlyIntOverflow() {
        _INT_SZ = 2;
        _SZ_ = 2;
        long[] a = intToBigNum(0x1_0000);
        long[] b = intToBigNum(0x2_0000);

        long[] c = mulToNew(a, b);
        assertTrue(isOverflow(c));
    }

    @Test
    public void mulMinimalOverflow() {
        long[] a = intToBigNum(0x8000L);
        long[] c = mulToNew(a, intToBigNum(2));
        assertEquals(Double.POSITIVE_INFINITY, toDouble(c), 0);
    }

    @Test
    public void mulToMinNeg() {
        long[] a = negate(intToBigNum(0x7fffL));
        long[] c = mulToNew(a, intToBigNum(2));
        assertEquals(-0xfffeL, toDouble(c), 0);
    }

    private long[] maxPositive() {
        long[] d = new long[_SZ_];
        for (int i = 0; i < _SZ_; i++) {
            d[i] = 0xffff;
        }
        return d;
    }

    private long[] smallestFraction() {
        long[] d = new long[_SZ_];
        d[_SZ_ - 1] = 1;
        return d;
    }
}
