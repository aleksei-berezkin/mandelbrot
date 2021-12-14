package bignum;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class BigNumJs {
    // ---- Start of transpiled region ----
    public static int minSignificantDigits = 2;
    public static int intSize = 1;
    public static int maxSize = 100;

    static long[] bigIntToBigNum(BigInteger x, BigInteger unit, Integer size) {
        if (unit.compareTo(BigInteger.ZERO) <= 0 || size != null && (size <= intSize || size > maxSize)) {
            throw new IllegalArgumentException("Bad input");
        }

        final boolean isNeg = x.compareTo(BigInteger.ZERO) < 0;
        if (isNeg) {
            x = x.negate();
        }
        long intPart = Number(x.divide(unit));
        final List<Long> c = new ArrayList<>();
        int significantIntDigits = 0;
        for (int i = 0; i < intSize; i++) {
            final long d = intPart & 0xffff;
            c.add(d);
            intPart = intPart >>> 16;
            if (d != 0) {
                significantIntDigits = i + 1;
            }
        }
        Collections.reverse(c);

        BigInteger frPart = x.remainder(unit);
        BigInteger val = unit;
        int significantFrDigits = 0;
        // Allow at least 1 fractional digit
        for (int i = intSize; i < maxSize; i++) {
            long d = 0;
            if (val.compareTo(BigInteger.ZERO) != 0) {
                for (int j = 15; j >= 0; j--) {
                    val = val.divide(BigInteger.TWO);
                    if (val.compareTo(BigInteger.ZERO) == 0) {
                        break;
                    }
                    if (frPart.compareTo(val) >= 0) {
                        d |= 1L << j;
                        frPart = frPart.subtract(val);
                    }
                }
            }
            c.add(d);
            if (d != 0 || significantIntDigits > 0 || significantFrDigits > 0) {
                significantFrDigits++;
            }
            if (size != null) {
                if (c.size() >= size) {
                    break;
                }
            } else if (significantIntDigits + significantFrDigits >= minSignificantDigits) {
                break;
            }
        }

        if (isNeg) {
            c.set(0, c.get(0) | 1L << 31);
        }
        return toArray(c);
    }
    // ---- End of transpiled region ----

    static long Number(BigInteger x) {
        return x.longValue();
    }

    static long[] toArray(List<Long> list) {
        return list.stream().mapToLong(l -> l).toArray();
    }
}
