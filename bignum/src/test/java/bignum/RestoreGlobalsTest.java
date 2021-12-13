package bignum;

import org.junit.After;
import org.junit.Before;

import static bignum.BigNum._INT_SZ;
import static bignum.BigNum._SZ_;
import static bignum.BigNumJs.intSize;

public class RestoreGlobalsTest {
    private int initialSz;
    private int initialIntSz;
    private int initialIntSize;

    @Before
    public void before() {
        initialSz = _SZ_;
        initialIntSz = _INT_SZ;
        initialIntSize = intSize;
    }

    @After
    public void after() {
        _SZ_ = initialSz;
        _INT_SZ = initialIntSz;
        intSize = initialIntSize;
    }

}
