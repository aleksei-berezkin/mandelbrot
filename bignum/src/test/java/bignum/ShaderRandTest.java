package bignum;

import java.util.concurrent.ThreadLocalRandom;

import org.junit.Before;
import org.junit.Test;

import static bignum.BigNum.IS_NEGATIVE;
import static bignum.BigNum.IS_OVERFLOW;
import static bignum.BigNum._INT_SZ;
import static bignum.BigNum.add;
import static bignum.BigNum.floatToBigNum;
import static bignum.BigNum.intToBigNum;
import static bignum.BigNum.mul;
import static bignum.BigNum.toDouble;
import static bignum.TestUtil.negate;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.fail;


public class ShaderRandTest extends RestoreGlobalsTest {
    @Before
    public void before() {
        super.before();
        _INT_SZ = 2;
    }

    @Test
    public void noOverflow() {
        long[] a = intToBigNum(1);
        a = add(a, floatToBigNum(.125F));
        double expected = 1.125;
        int iterations = 1000;
        double startDelta = .00001;
        double endDelta = .002;
        for (int i = 0; i < iterations; i++) {
            if (Math.abs(expected) > 0x100_000) {
                // Prevent overflow
                double b = nextDouble() * .0078125F;
                long[] bb = floatToBigNum(b);

                if (nextBool()) {
                    b = -b;
                    bb[0] |= IS_NEGATIVE;
                }

                a = mul(a, bb);
                expected *= b;
            } else if (nextBool()) {
                int b = nextSmallInt();
                double c = nextDouble();

                long[] bb = intToBigNum(b);
                bb = add(bb, floatToBigNum(c));

                if (nextBool()) {
                    b = -b;
                    c = -c;
                    bb[0] |= IS_NEGATIVE;
                }

                a = mul(a, bb);
                expected *= b + c;
            } else {
                int b = nextInt();
                double c = nextDouble();

                long[] bb = intToBigNum(b);
                bb = add(bb, floatToBigNum(c));

                if (nextBool()) {
                    b = -b;
                    c = -c;
                    bb[0] |= IS_NEGATIVE;
                }

                a = add(a, bb);

                expected += b + c;
            }

            if (expected == 0) {
                assertEquals(0, toDouble(a), 0);
            } else {
                assertEquals(
                        "Iter " + i + ": " + expected + " / " + toDouble(a),
                        1,
                        toDouble(a) / expected,
                        startDelta + (endDelta - startDelta) * ((double) i / iterations)
                );
            }
        }
    }

    @Test
    public void addPosToOverflow() {
        int startInt = nextSmallInt();
        double startDouble = nextDouble();
        long[] a = intToBigNum(startInt);
        a = add(a, floatToBigNum(startDouble));
        double expected = startInt + startDouble;
        double expectedOverflow = 0x1_0000_0000L;
        for (int i = 0; i < 0x40_0000; i++) {
            int nextInt = nextInt();
            double nextDouble = nextDouble();

            expected += nextInt + nextDouble;

            long[] b = intToBigNum(nextInt);
            b = add(b, floatToBigNum(nextDouble));

            a = add(a, b);

            if ((a[0] & IS_OVERFLOW) != 0L) {
                assertEquals(1, expected / expectedOverflow, 0.0001);
                assertEquals(nextInt + nextDouble, toDouble(b), 0.0000000001);
                return;
            }
        }

        fail("Not overflown");
    }

    @Test
    public void addNegToOverflow() {
        int startInt = nextSmallInt();
        double startDouble = nextDouble();
        long[] a = negate(intToBigNum(startInt));
        a = add(a, negate(floatToBigNum(startDouble)));
        double expected = -startInt - startDouble;
        double expectedOverflow = -0x1_0000_0000L;
        for (int i = 0; i < 0x40_0000; i++) {
            int nextInt = nextInt();
            double nextDouble = nextDouble();

            expected -= nextInt + nextDouble;

            long[] b = negate(intToBigNum(nextInt));
            b = add(b, negate(floatToBigNum(nextDouble)));

            a = add(a, b);

            if ((a[0] & IS_OVERFLOW) != 0L) {
                assertEquals(1, expected / expectedOverflow, 0.0001);
                return;
            }
        }

        fail("Not overflown");
    }

    @Test
    public void mulToOverflow() {
        int startInt = nextInt();
        double startDouble = nextDouble();
        long[] a = intToBigNum(startInt);
        a = add(a, floatToBigNum(startDouble));
        double expected = startInt + startDouble;
        double expectedOverflow = 0x1_0000_0000L;
        for (int i = 0; i < 100000; i++) {
            int nextInt;
            double nextDouble;
            if (Math.abs(expected) < 0x10_0000) {
                nextInt = nextSmallInt();
                nextDouble = nextDouble();
            } else {
                nextInt = 1;
                nextDouble = nextDouble() / 1000;
            }

            expected *= nextInt + nextDouble;

            long[] b = intToBigNum(nextInt);
            b = add(b, floatToBigNum(nextDouble));

            boolean isBNeg = nextBool();
            if (isBNeg) {
                expected = -expected;
                b[0] |= IS_NEGATIVE;
            }

            a = mul(a, b);

            if ((a[0] & IS_OVERFLOW) != 0L) {
                assertEquals(((a[0] & IS_NEGATIVE) != 0L) ? -1 : 1, expected / expectedOverflow, 0.002);
                return;
            }
        }

        fail("Not overflown");
    }

    private boolean nextBool() {
        return ThreadLocalRandom.current().nextBoolean();
    }

    private int nextInt() {
        return ThreadLocalRandom.current().nextInt(0x1_000);
    }

    private int nextSmallInt() {
        return ThreadLocalRandom.current().nextInt(0x1a);
    }

    private double nextDouble() {
        return ThreadLocalRandom.current().nextFloat();
    }
}
