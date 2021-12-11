package bignum;

import static bignum.BigNum.isNegative;
import static bignum.BigNum.setNegative;
import static bignum.BigNum.takeNegative;

class TestUtil {
    static long[] negate(long[] x) {
        if (isNegative(x)) {
            takeNegative(x);
        } else {
            setNegative(x);
        }
        return x;
    }

    private TestUtil() {
    }
}
