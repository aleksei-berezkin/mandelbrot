#version 300 es

precision highp float;

//uniform uint[16] u_min_x1;


uniform float u_xMin;
uniform float u_w;
uniform float u_yMin;
uniform float u_h;

in vec2 v_position;

out vec4 outColor;

void main() {
    vec2 c = vec2(u_xMin + v_position.x * u_w, u_yMin + v_position.y * u_h);;
    vec2 a = vec2(0, 0);    // x_i

//    float rSq;
//    float divergeRSq = 4.0;
    int i;
    for (i = 1 ; i <= (0x20 << 4); i++) {
        a = vec2(a.x * a.x - a.y * a.y, 2.0 * a.x * a.y) + c;
        if (isinf(a.x) || isinf(a.y)) {
            break;
        }
//        rSq = a.x * a.x + a.y * a.y;
//        if (isinf(rSq)) {
//            break;
//        }
    }

    if (isinf(a.x) || isinf(a.y)) {
//    if (rSq > 4.0) {
        // diverges
        float col = 1.1 - float(i) / 50.0;
        outColor = vec4(col, col, 1, 1);
    } else {
        // converges
        outColor = vec4(0, 0, 0, 1);
    }
}


struct BigNum {
    bool neg;
    int[32] digits;
    bool overflow;
};

// ---- Start of transpiled region ----

// ---- End of transpiled region ----
