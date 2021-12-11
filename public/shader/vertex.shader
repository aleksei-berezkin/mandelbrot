#version 300 es

precision highp float;

//uniform mat4 u_tx;

in vec2 a_position;

out vec2 v_position;

void main() {
    gl_Position = vec4(a_position, 0, 1);

    v_position = (a_position.xy + 1.0) / 2.0;
}
