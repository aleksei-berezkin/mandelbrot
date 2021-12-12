package bignum;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.MathContext;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.Test;

import static bignum.BigNum._INT_SZ;
import static bignum.BigNum._SZ_;
import static bignum.BigNum.bigIntToBigNum;
import static bignum.BigNum.intSize;
import static bignum.BigNum.toDouble;
import static org.junit.Assert.assertEquals;

public class JsRandTest extends RestoreGlobalsTest {
    @Test
    public void defaultSize() {
        for (int i = 0; i < 10_000; i++) {
            int magOffset = nextInt(8, 100);
            int magBound = magOffset + 4;
            BigInteger p = nextBigInt(nextInt(magOffset, magBound), nextBoolean());
            BigInteger q = nextBigInt(nextInt(magOffset, magBound), false);
            long[] a = bigIntToBigNum(p, q, null);
            _SZ_ = a.length;
            double expected = new BigDecimal(p, MathContext.DECIMAL128)
                    .divide(new BigDecimal(q, MathContext.DECIMAL128), MathContext.DECIMAL128)
                    .doubleValue();
            assertEquals(
                    expected,
                    toDouble(a),
                    1e-4
            );
        }
    }

    @Test
    public void definedSize() {
        for (int i = 0; i < 10_000; i++) {
            intSize = nextInt(10, 20);
            int _size = intSize + nextInt(10, 20);
            int magOffset = nextInt(15, 100);
            int magBound = magOffset + 15;

            BigInteger p = nextBigInt(nextInt(magOffset, magBound), nextBoolean());
            BigInteger q = nextBigInt(nextInt(magOffset, magBound), false);
            long[] a = bigIntToBigNum(p, q, _size);

            assertEquals(a.length, _size);
            _INT_SZ = intSize;
            _SZ_ = _size;
            double expected = new BigDecimal(p, MathContext.DECIMAL128)
                    .divide(new BigDecimal(q, MathContext.DECIMAL128), MathContext.DECIMAL128)
                    .doubleValue();
            assertEquals(
                    expected,
                    toDouble(a),
                    Math.abs(expected) * 1e-10
            );
        }
    }

    private BigInteger nextBigInt(int magnitude, boolean negative) {
        return new BigInteger((negative ? "-" : "+")
                + nextNonZeroDigit()
                + Stream.generate(this::nextDigit).limit(magnitude - 1).collect(Collectors.joining())
        );
    }

    private int nextInt(int origin, int bound) {
        return ThreadLocalRandom.current().nextInt(origin, bound);
    }

    private String nextNonZeroDigit() {
        return String.valueOf(ThreadLocalRandom.current().nextInt(1, 10));
    }

    private String nextDigit() {
        return String.valueOf(ThreadLocalRandom.current().nextInt(10));
    }

    private boolean nextBoolean() {
        return ThreadLocalRandom.current().nextBoolean();
    }
}
