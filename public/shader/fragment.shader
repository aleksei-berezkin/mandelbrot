#version 300 es

precision highp float;
precision highp int;

// ---- Start of transpiled region ----
uint IS_NEGATIVE = 0x80000000u;
uint CLR_NEGATIVE = 0x7fffffffu;

uint IS_OVERFLOW = 0x40000000u;

// positive x (no other in glsl)
uint[_SZ_] intToBigNum(uint x) {
    uint[_SZ_] c = uint[_SZ_](_ARR_INIT_);
    c[_INT_SZ - 1] = x & 0xffffu;
    int upperIx = _INT_SZ - 2;
    if (upperIx >= 0) {
        c[upperIx] = (x >> 16) & 0xffffu;
    }
    return c;
}

// 0 <= x <= 1 (no other floats in shader)
uint[_SZ_] floatToBigNum(float x) {
    uint[_SZ_] c = uint[_SZ_](_ARR_INIT_);
    float val = 1.0;
    for (int i = _INT_SZ; i < _SZ_; i++) {
        for (int j = 15; j >= 0; j--) {
            val /= 2.0;
            if (x >= val) {
                c[i] |= 1u << j;
                x -= val;
                if (x <= 0.0) {
                    return c;
                }
            }
        }
    }

    return c;
}

bool isAbsGreaterThan(uint[_SZ_] a, uint[_SZ_] b) {
    for (int i = 0; i < _SZ_; i++) {
        if (a[i] == b[i]) {
            continue;
        }
        return a[i] > b[i];
    }
    return false;
}

uint[_SZ_] add(uint[_SZ_] a, uint[_SZ_] b) {
    if ((b[0] & IS_OVERFLOW) != 0u) {
        a[0] |= IS_OVERFLOW;
    }
    if ((a[0] & IS_OVERFLOW) != 0u) {
        return a;
    }

    bool negA = (a[0] & IS_NEGATIVE) != 0u;
    bool negB = (b[0] & IS_NEGATIVE) != 0u;

    a[0] &= CLR_NEGATIVE;
    b[0] &= CLR_NEGATIVE;

    uint[_SZ_] c = uint[_SZ_](_ARR_INIT_);
    if (negA == negB) {
        uint cOut = 0u;
        for (int i = _SZ_ - 1; i >= 0; i--) {
            uint sum = a[i] + b[i] + cOut;
            c[i] = sum & 0xffffu;
            cOut = (sum >> 16) & 1u;
        }
        if (negA) {
            c[0] |= IS_NEGATIVE;
        }
        if (cOut != 0u) {
            c[0] |= IS_OVERFLOW;
        }
    } else {
        bool aAbsGTb = isAbsGreaterThan(a, b);
        uint[_SZ_] minuend;
        uint[_SZ_] subtrahend;
        if (aAbsGTb) {
            minuend = a;
            subtrahend = b;
        } else {
            minuend = b;
            subtrahend = a;
        }
        uint cOut = 0u;
        for (int i = _SZ_ - 1; i >= 0; i--) {
            uint difference = minuend[i] - subtrahend[i] - cOut;
            c[i] = difference & 0xffffu;
            cOut = (difference >> 16) & 1u;
        }
        if (negA && aAbsGTb || negB && !aAbsGTb) {
            c[0] |= IS_NEGATIVE;
        }
    }

    return c;
}

// Creates new
uint[_SZ_] mul(uint[_SZ_] a, uint[_SZ_] b) {
    if ((b[0] & IS_OVERFLOW) != 0u) {
        a[0] |= IS_OVERFLOW;
    }
    if ((a[0] & IS_OVERFLOW) != 0u) {
        return a;
    }

    bool neg = (a[0] & IS_NEGATIVE) != (b[0] & IS_NEGATIVE);
    a[0] &= CLR_NEGATIVE;
    b[0] &= CLR_NEGATIVE;

    uint[_SZ_] c = uint[_SZ_](_ARR_INIT_);

    for (int i = _SZ_ - 1; i >= 0; i--) {
        uint cOut = 0u;
        // TODO precision loss, cIx must be twice frac size
        for (int cIx = (_SZ_ - 1) + (_SZ_ - _INT_SZ); cIx >= -_INT_SZ; cIx--) {
            // cIx = intSz - 1 + (i - intSz + 1) + (j - intSz + 1)
            // cIx = i + j - intSz + 1
            int j = cIx - i + _INT_SZ - 1;

            uint product = cOut;
            if (0 <= j && j < _SZ_) {
                product += a[i] * b[j];
            }

            if (product == 0u) {
                cOut = 0u;
                continue;
            }

            if (cIx < 0) {
                cOut = 1u;
                break;
            }

            if (cIx >= _SZ_) {
                cOut = product >> 16;
                continue;
            }

            c[cIx] += product;
            cOut = (c[cIx] >> 16) & 0xffffu;
            c[cIx] &= 0xffffu;
        }

        if (cOut != 0u) {
            c[0] |= IS_OVERFLOW;
            if (neg) c[0] |= IS_NEGATIVE;
            return c;
        }
    }

    if (neg) c[0] |= IS_NEGATIVE;

    return c;
}
// ---- End of transpiled region ----

uniform uint[_SZ_] u_xMin;
uniform uint[_SZ_] u_w;
uniform uint[_SZ_] u_yMin;
uniform uint[_SZ_] u_h;

// 0..1
in vec2 v_position;

out vec4 outColor;

void main() {
    uint[_SZ_] cReal = add(u_xMin, mul(u_w, floatToBigNum(v_position.x)));
    uint[_SZ_] cImg = add(u_yMin, mul(u_h, floatToBigNum(v_position.y)));

    uint[_SZ_] xReal = intToBigNum(0u);
    uint[_SZ_] xImg = xReal;
    uint[_SZ_] two = intToBigNum(2u);
    int i;
    for (i = 1 ; i <= 1000; i++) {
        uint[_SZ_] xRealSq = mul(xReal, xReal);
        uint[_SZ_] xImgSqN = mul(xImg, xImg);
        xImgSqN[0] ^= IS_NEGATIVE;

        xImg = add(mul(two, mul(xReal, xImg)), cImg);
        xReal = add(add(xRealSq, xImgSqN), cReal);

        if (((xReal[0] | xImg[0]) & IS_OVERFLOW) != 0u) {
            break;
        }
    }

    if (((xReal[0] | xImg[0]) & IS_OVERFLOW) != 0u) {
        float col = 1.1 - float(i) / 5.0;
        outColor = vec4(1, col, 1, 1);
    } else {
        // converges
//        uint[_SZ_] n = add(u_xMin, mul(u_w, floatToBigNum(v_position.x)));
//    n = mul(n, n);
//        float col = float(n[0] & CLR_NEGATIVE) / 3.0 + float(n[1]) / 3.0 / 65536.0;
//    
//    uint[_SZ_] nn = add(u_yMin, mul(u_h, floatToBigNum(v_position.y)));
//    float coll = float(nn[0] & CLR_NEGATIVE) / 3.0 + float(nn[1]) / 3.0 / 65536.0;

    //        float col = isNegative(n) ? 0.0 : 1.0;
//        outColor = vec4(col, 0, 0, 1);
        outColor = vec4(0, 0, 0, 1);
    }
}

