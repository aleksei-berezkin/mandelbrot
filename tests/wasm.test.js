import fs from 'fs'
import { expect, test } from '@jest/globals';

const wExports = await instantiate();

test('asdf', () => {
    const buf = new Uint32Array(wExports.memory.buffer);
    buf[0] = 1;
    buf[2] = 2;
    wExports.add(0, 4 * 2, 4 * 4, 1);
    debugger;
})


/**
 * @return {Promise<{memory: Memory, add: Function, mul: Function}>}
 */
async function instantiate() {
    const memory = new WebAssembly.Memory(
        {initial: 1}
    );

    const wasmModule = await WebAssembly.compile(
        fs.readFileSync('public/bigNum/debug.wasm'),
    );

    const instObj = await WebAssembly.instantiate(
        wasmModule,
        {
            env: {memory}
        },
    )

    return instObj.exports;
}
