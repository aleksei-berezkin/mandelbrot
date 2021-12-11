/**
 * @param gl {WebGL2RenderingContext}
 * @param type {GLenum}
 * @param source {string}
 * @return {WebGLShader}
 */
export function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    if (!shader) {
        throw new Error('Cannot create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    const msg = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);

    throw new Error(String(msg));
}
