// import assert from "assert";
// import { add } from "../public/build/debug.js";
// assert.strictEqual(add(1, 2), 3);
// console.log("ok");

import fs from 'fs'

const exports = await instantiate();

/**
 * @return {Promise<{memory: Memory, add: Function, mul: Function}>}
 */
async function instantiate() {
    const memory = new WebAssembly.Memory(
        {initial: 1}
    );

    const instObj = await WebAssembly.instantiate(
        fs.readFileSync('public/build/debug.wasm'),
        {
            env: {memory}
        },
    );

    return instObj.instance.exports
}
