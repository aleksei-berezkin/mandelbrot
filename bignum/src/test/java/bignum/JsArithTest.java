package bignum;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.MathContext;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.junit.Test;

import static bignum.BigNum._INT_SZ;
import static bignum.BigNum._SZ_;
import static bignum.BigNum.bigIntToBigNum;
import static bignum.BigNum.intSize;
import static bignum.BigNum.toDouble;
import static org.junit.Assert.assertEquals;

public class JsArithTest extends RestoreGlobalsTest {
    @Test
    public void intPositive() {
        long[] a = bigIntToBigNum(
                BigInteger.valueOf(5_123_000_000L),
                BigInteger.valueOf(1_000_000L),
                null
        );
        _SZ_ = 2;
        assertEquals(_SZ_, a.length);
        assertEquals(5_123, toDouble(a), 0);
    }

    @Test
    public void intLargeNegative() {
        intSize = 3;
        long[] a = bigIntToBigNum(
                BigInteger.valueOf(-2_999_335_123_456_000_000L),
                BigInteger.valueOf(1_000_000L),
                null
        );
        _INT_SZ = 3;
        _SZ_ = 4;
        assertEquals(_SZ_, a.length);
        assertEquals(-2_999_335_123_456L, toDouble(a), 0);
    }

    @Test
    public void fractionalMid() {
        long[] a = bigIntToBigNum(
                BigInteger.valueOf(1_234_567_890L),
                BigInteger.valueOf(1_000_000),
                null
        );
        _SZ_ = 2;
        assertEquals(_SZ_, a.length);
        assertEquals(1234.56789, toDouble(a), 2.0 / 65536);
    }

    @Test
    public void fractionalSmall() {
        long[] a = bigIntToBigNum(
                BigInteger.valueOf(-0x1030_5078L),
                BigInteger.valueOf(0x1000_0000_0000_0000L),
                null
        );
        _SZ_ = 4;
        assertEquals(_SZ_, a.length);
        assertEquals((double) -0x1030_5078L / 0x1000_0000_0000_0000L, toDouble(a), 1e-10);
    }

    @Test
    public void fractionalVerySmall() {
        long[] a = bigIntToBigNum(
                BigInteger.valueOf(123),
                new BigInteger("1" + Stream.generate(() -> "0").limit(150).collect(Collectors.joining())),
                null
        );
        _SZ_ = 33;
        assertEquals(_SZ_, a.length);
        assertEquals(123 / 1e150, toDouble(a), 1e-10);
    }

    @Test
    public void definedSmall() {
        long p = 848289943712L;
        long q = 424116878428L;
        long[] a = bigIntToBigNum(
                BigInteger.valueOf(p),
                BigInteger.valueOf(q),
                70
        );
        _SZ_ = 70;
        assertEquals(_SZ_, a.length);
        assertEquals(toDouble(a), 2.0, 0.001);
        assertEquals((double) p / q, toDouble(a), 1e-10);
        
    }

    @Test
    public void definedLarge() {
        BigInteger p = new BigInteger("-936309516237492634789127365917234928472501872329015710597908759485613979994149587451236466435656362999242934968454766227");
        BigInteger q = new BigInteger("+312157195814950498106019302481629754871238995740986274728167516523135431313035646512326456135466310315415151518773468461");
        long[] a = bigIntToBigNum(p, q, 90);
        _SZ_ = 90;
        assertEquals(_SZ_, a.length);
        assertEquals(toDouble(a), -3.0, 0.001);
        assertEquals(
                new BigDecimal(p, MathContext.DECIMAL128)
                        .divide(new BigDecimal(q, MathContext.DECIMAL128), MathContext.DECIMAL128)
                        .doubleValue(),
                toDouble(a),
                1e-10
        );
    }
}
