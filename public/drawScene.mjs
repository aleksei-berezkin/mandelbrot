import { createProgram } from './createProgram.mjs';
import { createShader } from './createShader.mjs';

const responses = await Promise.all([fetch('shader/vertex.shader'), fetch('shader/fragment.shader')]);
const [vText, fText] = await Promise.all(responses.map(r => r.text()));

/**
 * 
 * @param canvasEl {HTMLCanvasElement}
 * @param xMin {number}
 * @param yMin {number}
 * @param w {number}
 * @param h {number}
 */
export function drawScene(canvasEl, xMin, yMin, w, h) {
    console.log(xMin, yMin, w, h);
    const gl = canvasEl.getContext('webgl2');
    if (!gl) {
        throw new Error('webgl2 not supported');
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vText);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fText);
    const program = createProgram(gl, vertexShader, fragmentShader);

    // const vSize = 3;
    // const triangles = [
    //     xMin, yMin, 0,   xMin + w , yMin, 0,   xMin, yMin + h, 0,   xMin + w, yMin + h, 0,
    // ];

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

    // Program and uniforms
    gl.useProgram(program);
    // const toClipSpaceMatrix = [
    //     2 / w, 0, 0, -2*xMin/w - 1,
    //     0, 2 / h, 0, -2*yMin/h - 1,
    //     0, 0, 1, 0,
    //     0, 0, 0, 1,
    // ];
    // const txLocation = gl.getUniformLocation(program, 'u_tx');
    // gl.uniformMatrix4fv(txLocation, false, toClipSpaceMatrix);
    const xMinLoc = gl.getUniformLocation(program, 'u_xMin');
    gl.uniform1f(xMinLoc, xMin);

    const wLoc = gl.getUniformLocation(program, 'u_w');
    gl.uniform1f(wLoc, w);

    const yMinLoc = gl.getUniformLocation(program, 'u_yMin');
    // noinspection JSSuspiciousNameCombination
    gl.uniform1f(yMinLoc, yMin);

    const hLoc = gl.getUniformLocation(program, 'u_h');
    gl.uniform1f(hLoc, h);

    // Translate -1...+1 to:
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(0, 0, 0, .06);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Go
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, triangles.length / vSize);
}
