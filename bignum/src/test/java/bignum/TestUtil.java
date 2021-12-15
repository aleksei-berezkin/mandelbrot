package bignum;

import static bignum.BigNum.CLR_NEGATIVE;
import static bignum.BigNum.IS_NEGATIVE;

class TestUtil {
    static long[] negate(long[] x) {
        if ((x[0] & IS_NEGATIVE) != 0L) {
            x[0] &= CLR_NEGATIVE;
        } else {
            x[0] |= IS_NEGATIVE;
        }
        return x;
    }

    private TestUtil() {
    }
}
