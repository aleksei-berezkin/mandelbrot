/**
 * @param gl {WebGL2RenderingContext}
 * @param vertexShader {WebGLShader}
 * @param fragmentShader {WebGLShader}
 * @return {WebGLProgram}
 */
export function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    if (!program) {
        throw new Error('Cannot create program');
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);

    throw new Error(String(message));
}
