import { createProgram } from './createProgram.mjs';
import { createShader } from './createShader.mjs';
import { bigIntToBigNum } from './bigNum.js';

const responses = await Promise.all([fetch('shader/vertex.shader'), fetch('shader/fragment.shader')]);
const [vText, fText] = await Promise.all(responses.map(r => r.text()));

/**
 * 
 * @param canvasEl {HTMLCanvasElement}
 * @param unit {BigInt}
 * @param xMin {BigInt}
 * @param yMin {BigInt}
 * @param w {BigInt}
 * @param h {BigInt}
 */
export function drawScene(canvasEl, unit, xMin, yMin, w, h) {
    const gl = canvasEl.getContext('webgl2');
    if (!gl) {
        throw new Error('webgl2 not supported');
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vText);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fText);
    const program = createProgram(gl, vertexShader, fragmentShader);

    const vSize = 2;
    const triangles = [
        -1, -1,   1, -1,   -1, 1,   1, 1,
    ];

    // Vertices to buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangles), gl.STATIC_DRAW);

    // Buffer to attribute
    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, vSize, gl.FLOAT, false, 0, 0);

    // Units to bignum
    const hBigNum = bigIntToBigNum(h, unit);
    const yMinBigNum = bigIntToBigNum(yMin, unit, hBigNum.length);
    const wBigNum = bigIntToBigNum(w, unit, hBigNum.length);
    const xMinBigNum = bigIntToBigNum(xMin, unit, hBigNum.length);
    
    // Program and uniforms
    gl.useProgram(program);
    const xMinLoc = gl.getUniformLocation(program, 'u_xMin');
    gl.uniform1uiv(xMinLoc, xMinBigNum);

    const wLoc = gl.getUniformLocation(program, 'u_w');
    gl.uniform1uiv(wLoc, wBigNum);

    const yMinLoc = gl.getUniformLocation(program, 'u_yMin');
    gl.uniform1uiv(yMinLoc, yMinBigNum);

    const hLoc = gl.getUniformLocation(program, 'u_h');
    gl.uniform1uiv(hLoc, hBigNum);

    // Translate -1...+1 to:
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(0, 0, 0, .06);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Go
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, triangles.length / vSize);
}
