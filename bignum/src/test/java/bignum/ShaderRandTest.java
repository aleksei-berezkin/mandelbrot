package bignum;

import java.util.concurrent.ThreadLocalRandom;

import org.junit.Before;
import org.junit.Test;

import static bignum.BigNum._INT_SZ;
import static bignum.BigNum.addInPlace;
import static bignum.BigNum.floatToBigNum;
import static bignum.BigNum.intToBigNum;
import static bignum.BigNum.isNegative;
import static bignum.BigNum.isOverflow;
import static bignum.BigNum.mulToNew;
import static bignum.BigNum.setNegative;
import static bignum.BigNum.toDouble;
import static bignum.TestUtil.negate;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
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
        addInPlace(a, floatToBigNum(.125F));
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
                    setNegative(bb);
                }

                a = mulToNew(a, bb);
                expected *= b;
            } else if (nextBool()) {
                int b = nextSmallInt();
                double c = nextDouble();

                long[] bb = intToBigNum(b);
                addInPlace(bb, floatToBigNum(c));

                if (nextBool()) {
                    b = -b;
                    c = -c;
                    setNegative(bb);
                }

                a = mulToNew(a, bb);
                expected *= b + c;
            } else {
                int b = nextInt();
                double c = nextDouble();

                long[] bb = intToBigNum(b);
                addInPlace(bb, floatToBigNum(c));

                if (nextBool()) {
                    b = -b;
                    c = -c;
                    setNegative(bb);
                }

                addInPlace(a, bb);

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
        addInPlace(a, floatToBigNum(startDouble));
        double expected = startInt + startDouble;
        double expectedOverflow = 0x1_0000_0000L;
        for (int i = 0; i < 0x40_0000; i++) {
            int nextInt = nextInt();
            double nextDouble = nextDouble();

            expected += nextInt + nextDouble;

            long[] b = intToBigNum(nextInt);
            addInPlace(b, floatToBigNum(nextDouble));

            addInPlace(a, b);

            if (isOverflow(a)) {
                assertEquals(1, expected / expectedOverflow, 0.0001);
                assertFalse(isOverflow(b));
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
        addInPlace(a, negate(floatToBigNum(startDouble)));
        double expected = -startInt - startDouble;
        double expectedOverflow = -0x1_0000_0000L;
        for (int i = 0; i < 0x40_0000; i++) {
            int nextInt = nextInt();
            double nextDouble = nextDouble();

            expected -= nextInt + nextDouble;

            long[] b = negate(intToBigNum(nextInt));
            addInPlace(b, negate(floatToBigNum(nextDouble)));

            addInPlace(a, b);

            if (isOverflow(a)) {
                assertEquals(1, expected / expectedOverflow, 0.0001);
                assertFalse(isOverflow(b));
                assertEquals(-nextInt - nextDouble, toDouble(b), 0.0000000001);
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
        addInPlace(a, floatToBigNum(startDouble));
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
            addInPlace(b, floatToBigNum(nextDouble));

            boolean isBNeg = nextBool();
            if (isBNeg) {
                expected = -expected;
                setNegative(b);
            }

            a = mulToNew(a, b);

            if (isOverflow(a)) {
                assertEquals(isNegative(a) ? -1 : 1, expected / expectedOverflow, 0.002);
                assertFalse(isOverflow(b));
                assertEquals((nextInt + nextDouble) * (isBNeg ? -1 : 1), toDouble(b), 0.0000000001);
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
