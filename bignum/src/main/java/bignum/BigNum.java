package bignum;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Because GLSL is not unit-testable, implemented on Java then transpiled to GLSL.
 * 
 * Fixed-point arithmetic of arbitrary precision. Numbers are unsigned 32-bit ints, 16 bits used.
 * Sign and overflow flags are stored in upper bits of digit[0].
 */
class BigNum {
    /**
     * Number of 16-bits 'digits'. Remains macro in GLSL.
     */
    public static int _SZ_ = 8;
    /**
     * Number of 'digits' in integer part. Remains macro in GLSL.
     */
    public static int _INT_SZ = 1;

    // ---- Transpile to GLSL from here ----
    static boolean isNegative(long[] a) {
        return (a[0] & 1L << 31) != 0;
    }

    static boolean takeNegative(long[] a) {
        if (isNegative(a)) {
            a[0] &= 0x7fff_ffffL;
            return true;
        }
        return false;
    }

    static void setNegative(long[] a) {
        a[0] |= 1L << 31;
    }

    static boolean isOverflow(long[] a) {
        return (a[0] & (1L << 30)) != 0;
    }

    static void setOverflow(long[] a) {
        a[0] |= 1L << 30;
    }

    @SuppressWarnings("DuplicatedCode")
    // positive x (no other in glsl)
    static long[] intToBigNum(long x) {
        /* don't transpile */ if (x < 0) {
        /* don't transpile */     throw new IllegalArgumentException(String.valueOf(x));
        /* don't transpile */ }

        long[] c = new long[_SZ_];
        c[_INT_SZ - 1] = x & 0xffff;
        if (_INT_SZ > 1) {
            c[_INT_SZ - 2] = (x >>> 16) & 0xffff;
        }
        return c;
    }

    // 0 <= x <= 1 (no other floats in shader)
    static long[] floatToBigNum(double x) {
        /* don't transpile */ if (x < 0 || x > 1) {
        /* don't transpile */     throw new IllegalArgumentException(String.valueOf(x));
        /* don't transpile */ }
        long[] c = new long[_SZ_];
        float val = 1;
        for (int i = _INT_SZ; i < _SZ_; i++) {
            for (int j = 15; j >= 0; j--) {
                val /= 2;
                if (x >= val) {
                    c[i] |= 1L << j;
                    x -= val;
                    if (x <= 0) {
                        return c;
                    }
                }
            }
        }

        return c;
    }

    // Writes sum to a
    static void addInPlace(long[] a, long[] b) {
        if (isOverflow(b)) {
            setOverflow(a);
        }
        if (isOverflow(a)) {
            return;
        }

        boolean negA = takeNegative(a);
        boolean negB = takeNegative(b);

        if (negA == negB) {
            long cOut = 0;
            for (int i = _SZ_ - 1; i >= 0; i--) {
                long sum = a[i] + b[i] + cOut;
                a[i] = sum & 0xffff;
                cOut = (sum >>> 16) & 1;
            }
            if (negA) {
                setNegative(a);
            }
            if (cOut != 0) {
                setOverflow(a);
            }
        } else {
            boolean aAbsGTb = isAbsGreaterThan(a, b);
            long[] minuend = aAbsGTb ? a : b;
            long[] subtrahend = aAbsGTb ? b : a;
            long cOut = 0;
            for (int i = _SZ_ - 1; i >= 0; i--) {
                long difference = minuend[i] - subtrahend[i] - cOut;
                a[i] = difference & 0xffff;
                cOut = (difference >>> 16) & 1;
            }
            if (negA && aAbsGTb || negB && !aAbsGTb) {
                setNegative(a);
            }
        }

        if (negB) {
            setNegative(b);
        }
    }

    static boolean isAbsGreaterThan(long[] a, long[] b) {
        for (int i = 0; i < _SZ_; i++) {
            if (a[i] == b[i]) {
                continue;
            }
            return a[i] > b[i];
        }
        return false;
    }

    // Creates new
    static long[] mulToNew(long[] a, long[] b) {
        if (isOverflow(b)) {
            setOverflow(a);
        }
        if (isOverflow(a)) {
            return a;
        }

        boolean bNeg = takeNegative(b);
        boolean neg = takeNegative(a) != bNeg;
        long[] c = new long[_SZ_];

        for (int i = _SZ_ - 1; i >= 0; i--) {
            long cOut = 0;
            for (int cIx = _SZ_ - 1; cIx >= -_INT_SZ; cIx--) {
                // cIx = intSz - 1 + (i - intSz + 1) + (j - intSz + 1)
                // cIx = i + j - intSz + 1
                int j = cIx - i + _INT_SZ - 1;

                long product = cOut;
                if (0 <= j && j < _SZ_) {
                    product += a[i] * b[j];
                }

                if (product == 0) {
                    cOut = 0;
                    continue;
                }

                if (cIx < 0) {
                    cOut = 1;
                    break;
                }

                c[cIx] += product;
                cOut = (c[cIx] >>> 16) & 0xffff;
                c[cIx] &= 0xffff;
            }

            if (cOut != 0) {
                setOverflow(c);
                if (neg) setNegative(c);
                if (bNeg) setNegative(b);
                return c;
            }
        }

        if (neg) setNegative(c);
        if (bNeg) setNegative(b);
        return c;
    }

    // ---- End transpile to GLSL ----


    // ---- Transpile to JS from here ----
    public static int minSignificantDigits = 2;
    public static int intSize = 1;
    public static int maxSize = 100;
    /* don't transpile */ // Disregards macros - precision is adaptive
    static long[] bigIntToBigNum(BigInteger x, BigInteger unit, Integer size) {
        if (unit.compareTo(BigInteger.ZERO) <= 0 || size != null && (size <= intSize || size > maxSize)) {
            throw new IllegalArgumentException("Bad input");
        }

        final boolean isNeg = x.compareTo(BigInteger.ZERO) < 0;
        if (isNeg) {
            x = x.negate();
        }
        long intPart = Number(x.divide(unit));
        List<Long> c = new ArrayList<>();
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

        return negateIf(toArray(c), isNeg);
    }

    static long[] negateIf(long[] a, boolean negative) {
        if (negative) {
            a[0] |= 1L << 31;
        }
        return a;
    }
    // ---- End transpile to JS ----

    static long Number(BigInteger x) {
        return x.longValue();
    }

    static long[] toArray(List<Long> list) {
        return list.stream().mapToLong(l -> l).toArray();
    }

    static double toDouble(long[] a) {
        if (isOverflow(a)) {
            return isNegative(a) ? Double.NEGATIVE_INFINITY : Double.POSITIVE_INFINITY;
        }

        double x = 0;
        boolean isNeg = takeNegative(a);
        for (int i = 0; i < _SZ_; i++) {
            x += a[i] * Math.pow(0x1_0000, _INT_SZ - 1 - i);
        }
        if (isNeg) {
            x *= -1;
            setNegative(a);
        }
        return x;
    }

    static long toLong(long[] a) {
        if (isOverflow(a)) {
            throw new IllegalArgumentException("Overflow");
        }

        boolean isNeg = takeNegative(a);
        long x;
        if (_INT_SZ == 1) {
            x = a[0];
        } else {
            x = (a[_INT_SZ - 2] << 16) + a[_INT_SZ - 1];
        }
        if (isNeg) {
            x = -x;
            setNegative(a);
        }
        return x;
    }

    private BigNum() {
    }
}
