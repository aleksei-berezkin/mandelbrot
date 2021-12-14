#version 300 es

precision highp float;
precision highp uint;

uniform uint[_SZ_] u_xMin;
uniform uint[_SZ_] u_w;
uniform uint[_SZ_] u_yMin;
uniform uint[_SZ_] u_h;

// 0..1
in vec2 v_position;

out vec4 outColor;

void main() {
    uint[_SZ_] cReal = addInPlace(mulToNew(u_w, floatToBigNum(v_position.x)), u_xMin);
    uint[_SZ_] cImg = addInPlace(mulToNew(u_h, floatToBigNum(v_position.y)), u_yMin);

    uint[_SZ_] xReal = intToBigNum(0);
    uint[_SZ_] xImg = xReal;
    uint[_SZ_] two = intToBitNum(2);
    int i;
    for (i = 1 ; i <= 100; i++) {
        uint[_SZ_] xRealSq = mulToNew(xReal, xReal);
        uint[_SZ_] xImgSqN = mulToNew(xImg, xImg);
        setNegative(xImgSqN, !isNegative(xImgSqN));

        xReal = addInPlace(addInPlace(xRealSq, yImgSqN), cReal);
        xImg = addInPlace(mulToNew(mulToNew(xReal, xImg), two), cImg);

        if (isOverflow(xReal) || isOverflow(xImg)) {
            break;
        }
    }

    if (isOverflow(xReal) || isOverflow(xImg)) {
        float col = 1.1 - float(i) / 50.0;
        outColor = vec4(col, col, 1, 1);
    } else {
        // converges
        outColor = vec4(0, 0, 0, 1);
    }
}


// ---- Start of transpiled region ----
bool isNegative(uint[_SZ_] a) {
    return (a[0] & uint(1) << 31) != 0;
}

bool takeNegative(uint[_SZ_] a) {
    if (isNegative(a)) {
        a[0] &= uint(0x7fffffff);
        return true;
    }
    return false;
}

void setNegative(uint[_SZ_] a) {
    a[0] |= uint(1) << 31;
}

bool isOverflow(uint[_SZ_] a) {
    return (a[0] & (uint(1) << 30)) != 0;
}

void setOverflow(uint[_SZ_] a) {
    a[0] |= uint(1) << 30;
}

// positive x (no other in glsl)
uint[_SZ_] intToBigNum(uint x) {
    uint[_SZ_] c = uint[_SZ_](_ARR_INIT_);
    c[_INT_SZ - 1] = x & uint(0xffff);
    if (_INT_SZ > 1) {
        c[_INT_SZ - 2] = (x >> 16) & uint(0xffff);
    }
    return c;
}

// 0 <= x <= 1 (no other floats in shader)
uint[_SZ_] floatToBigNum(double x) {
    uint[_SZ_] c = uint[_SZ_](_ARR_INIT_);
    float val = 1;
    for (int i = _INT_SZ; i < _SZ_; i++) {
        for (int j = 15; j >= 0; j--) {
            val /= 2;
            if (x >= val) {
                c[i] |= uint(1) << j;
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
void addInPlace(uint[_SZ_] a, uint[_SZ_] b) {
    if (isOverflow(b)) {
        setOverflow(a);
    }
    if (isOverflow(a)) {
        return;
    }

    bool negA = takeNegative(a);
    bool negB = takeNegative(b);

    if (negA == negB) {
        uint cOut = 0;
        for (int i = _SZ_ - 1; i >= 0; i--) {
            uint sum = a[i] + b[i] + cOut;
            a[i] = sum & uint(0xffff);
            cOut = (sum >> 16) & uint(1);
        }
        if (negA) {
            setNegative(a);
        }
        if (cOut != 0) {
            setOverflow(a);
        }
    } else {
        bool aAbsGTb = isAbsGreaterThan(a, b);
        uint[_SZ_] minuend = aAbsGTb ? a : b;
        uint[_SZ_] subtrahend = aAbsGTb ? b : a;
        uint cOut = 0;
        for (int i = _SZ_ - 1; i >= 0; i--) {
            uint difference = minuend[i] - subtrahend[i] - cOut;
            a[i] = difference & uint(0xffff);
            cOut = (difference >> 16) & uint(1);
        }
        if (negA && aAbsGTb || negB && !aAbsGTb) {
            setNegative(a);
        }
    }

    if (negB) {
        setNegative(b);
    }
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

// Creates new
uint[_SZ_] mulToNew(uint[_SZ_] a, uint[_SZ_] b) {
    if (isOverflow(b)) {
        setOverflow(a);
    }
    if (isOverflow(a)) {
        return a;
    }

    bool bNeg = takeNegative(b);
    bool neg = takeNegative(a) != bNeg;
    uint[_SZ_] c = uint[_SZ_](_ARR_INIT_);

    for (int i = _SZ_ - 1; i >= 0; i--) {
        uint cOut = 0;
        // TODO precision loss, cIx must be twice frac size
        for (int cIx = _SZ_ - 1; cIx >= -_INT_SZ; cIx--) {
            // cIx = intSz - 1 + (i - intSz + 1) + (j - intSz + 1)
            // cIx = i + j - intSz + 1
            int j = cIx - i + _INT_SZ - 1;

            uint product = cOut;
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
            cOut = (c[cIx] >> 16) & uint(0xffff);
            c[cIx] &= uint(0xffff);
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
// ---- End of transpiled region ----
