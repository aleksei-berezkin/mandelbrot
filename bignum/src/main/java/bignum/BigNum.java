package bignum;

/**
 * Because GLSL is not unit-testable, implemented on Java then transpiled to GLSL.
 * 
 * Fixed-point arithmetic of arbitrary precision. Numbers are unsigned 32-bit ints, 16 bits used.
 * Sign and overflow flags are stored in upper bits of digit[0].
 * 
 * NB: in GLSL arrays are passed by value.
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

    // ---- Start of transpiled region ----
    static long IS_NEGATIVE = 0x8000_0000L;
    static long CLR_NEGATIVE = 0x7fff_ffffL;

    static long IS_OVERFLOW = 0x4000_0000L;

    @SuppressWarnings("DuplicatedCode")
    // positive x (no other in glsl)
    static long[] intToBigNum(long x) {
        /* don't transpile */ if (x < 0) {
        /* don't transpile */     throw new IllegalArgumentException(String.valueOf(x));
        /* don't transpile */ }
        long[] c = new long[_SZ_];
        c[_INT_SZ - 1] = x & 0xffffL;
        int upperIx = _INT_SZ - 2;
        if (upperIx >= 0) {
            c[upperIx] = (x >> 16) & 0xffffL;
        }
        return c;
    }

    // 0 <= x <= 1 (no other floats in shader)
    static long[] floatToBigNum(double x) {
        /* don't transpile */ if (x < 0 || x > 1) {
        /* don't transpile */     throw new IllegalArgumentException(String.valueOf(x));
        /* don't transpile */ }
        long[] c = new long[_SZ_];
        double val = 1.0;
        for (int i = _INT_SZ; i < _SZ_; i++) {
            for (int j = 15; j >= 0; j--) {
                val /= 2.0;
                if (x >= val) {
                    c[i] |= 1L << j;
                    x -= val;
                    if (x <= 0.0) {
                        return c;
                    }
                }
            }
        }

        return c;
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

    static long[] add(long[] a, long[] b) {
        if ((b[0] & IS_OVERFLOW) != 0L) {
            a[0] |= IS_OVERFLOW;
        }
        if ((a[0] & IS_OVERFLOW) != 0L) {
            return a;
        }

        boolean negA = (a[0] & IS_NEGATIVE) != 0L;
        boolean negB = (b[0] & IS_NEGATIVE) != 0L;

        /* don't transpile * These changes won't be seen in GLSL caller
         * don't transpile * but will be seen in Java */
        a[0] &= CLR_NEGATIVE;
        b[0] &= CLR_NEGATIVE;

        long[] c = new long[_SZ_];
        if (negA == negB) {
            long cOut = 0L;
            for (int i = _SZ_ - 1; i >= 0; i--) {
                long sum = a[i] + b[i] + cOut;
                c[i] = sum & 0xffffL;
                cOut = (sum >> 16) & 1L;
            }
            if (negA) {
                c[0] |= IS_NEGATIVE;
            }
            if (cOut != 0L) {
                c[0] |= IS_OVERFLOW;
            }
        } else {
            boolean aAbsGTb = isAbsGreaterThan(a, b);
            long[] minuend;
            long[] subtrahend;
            if (aAbsGTb) {
                minuend = a;
                subtrahend = b;
            } else {
                minuend = b;
                subtrahend = a;
            }
            long cOut = 0L;
            for (int i = _SZ_ - 1; i >= 0; i--) {
                long difference = minuend[i] - subtrahend[i] - cOut;
                c[i] = difference & 0xffffL;
                cOut = (difference >> 16) & 1L;
            }
            if (negA && aAbsGTb || negB && !aAbsGTb) {
                c[0] |= IS_NEGATIVE;
            }
        }

        return c;
    }

    // Creates new
    static long[] mul(long[] a, long[] b) {
        if ((b[0] & IS_OVERFLOW) != 0L) {
            a[0] |= IS_OVERFLOW;
        }
        if ((a[0] & IS_OVERFLOW) != 0L) {
            return a;
        }

        boolean neg = (a[0] & IS_NEGATIVE) != (b[0] & IS_NEGATIVE);
        /* don't transpile * These changes won't be seen in GLSL caller
         * don't transpile * but will be seen in Java */
        a[0] &= CLR_NEGATIVE;
        b[0] &= CLR_NEGATIVE;

        long[] c = new long[_SZ_];

        for (int i = _SZ_ - 1; i >= 0; i--) {
            long cOut = 0L;
            // TODO precision loss, cIx must be twice frac size
            for (int cIx = (_SZ_ - 1) + (_SZ_ - _INT_SZ); cIx >= -_INT_SZ; cIx--) {
                // cIx = intSz - 1 + (i - intSz + 1) + (j - intSz + 1)
                // cIx = i + j - intSz + 1
                int j = cIx - i + _INT_SZ - 1;

                long product = cOut;
                if (0 <= j && j < _SZ_) {
                    product += a[i] * b[j];
                }

                if (product == 0L) {
                    cOut = 0L;
                    continue;
                }

                if (cIx < 0) {
                    cOut = 1L;
                    break;
                }

                if (cIx >= _SZ_) {
                    cOut = product >> 16;
                    continue;
                }

                c[cIx] += product;
                cOut = (c[cIx] >> 16) & 0xffffL;
                c[cIx] &= 0xffffL;
            }

            if (cOut != 0L) {
                c[0] |= IS_OVERFLOW;
                if (neg) c[0] |= IS_NEGATIVE;
                return c;
            }
        }

        if (neg) c[0] |= IS_NEGATIVE;

        return c;
    }
    // ---- End of transpiled region ----

    static double toDouble(long[] a) {
        if ((a[0] & IS_OVERFLOW) != 0L) {
            return ((a[0] & IS_NEGATIVE) != 0L)
                    ? Double.NEGATIVE_INFINITY
                    : Double.POSITIVE_INFINITY;
        }

        double x = 0;
        boolean isNeg = (a[0] & IS_NEGATIVE) != 0L;
        a[0] &= CLR_NEGATIVE;
        for (int i = 0; i < _SZ_; i++) {
            x += a[i] * Math.pow(0x1_0000, _INT_SZ - 1 - i);
        }
        if (isNeg) {
            x *= -1;
            a[0] |= IS_NEGATIVE;
        }
        return x;
    }

    static long toLong(long[] a) {
        if ((a[0] & IS_OVERFLOW) != 0) {
            throw new IllegalArgumentException("Overflow");
        }

        boolean isNeg = (a[0] & IS_NEGATIVE) != 0L;
        a[0] &= CLR_NEGATIVE;
        
        long x;
        if (_INT_SZ == 1) {
            x = a[0];
        } else {
            x = (a[_INT_SZ - 2] << 16) + a[_INT_SZ - 1];
        }
        if (isNeg) {
            x = -x;
            a[0] |= IS_NEGATIVE;
        }
        return x;
    }

    private BigNum() {
    }
}
