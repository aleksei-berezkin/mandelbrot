/*
 * Because debugging WASM in a browser is easier
 */

const wExports = await instantiate();

const buf = new Uint32Array(wExports.memory.buffer);

const w = 4;

test('Simple add', () => {
    writeBigNum(0, [1, 0]);
    writeBigNum(2, [2, 0]);
    wExports.add(0, w * 2, w * 4, 1);
    assertEquals([3, 0], readBigNum(4, 1));
});

test('Add with frac', () => {
    writeBigNum(0, [10, 0x8000_0000]);
    writeBigNum(2, [21, 0x8800_0000]);
    wExports.add(0, w * 2, w * 4, 1);

    const cBigNum = readBigNum(4, 1);
    assertEquals([32, 0x0800_0000], cBigNum);
    assertEquals(32.03125, toDouble(cBigNum))
});

test('Test from/to double randomized', () => {
    for (let i = 0; i < 2000; i++) {
        const sourceDouble = Math.random() * 0x3999_9999 * (Math.random() > .5 ? -1 : -1);
        const bigNum = fromDouble(sourceDouble, 2);
        const targetDouble = toDouble(bigNum);
        assertEquals(sourceDouble, targetDouble);
    }
});

function readBigNum(offsetU32, fracPrecision) {
    const precision = 1 + fracPrecision;
    return Array.from({length: precision}).map((_, i) => buf[offsetU32 + i]);
}

function writeBigNum(offsetU32, bigNum) {
    bigNum.forEach((v, i) => buf[offsetU32 + i] = v);
}

function fromDouble(double, fracPrecision) {
    const precision = 1 + fracPrecision;
    if (!Number.isFinite(double) || Math.abs(double) >= 0x4000_0000) {
        return Array.from({length: precision}).map((_, i) => !i ? 0x8000_0000 : 0);
    }

    const isNeg = double < 0;
    if (isNeg) {
        double = -double;
    }

    const mask = 0x1_0000_0000;
    const bigNum = Array.from({length: precision}).map(() => {
        const v =  Math.floor(double % mask);
        double *= 0x1_0000_0000;
        return v;
    })
    if (isNeg) {
        bigNum[0] |= 0x4000_0000;
    }
    return bigNum;
}

function toDouble(bigNum) {
    if ((bigNum[0] & 0x8000_0000) !== 0) {
        return Number.POSITIVE_INFINITY;
    }
    const isNeg = (bigNum[0] & 0x4000_0000) !== 0;
    if (isNeg) {
        bigNum[0] &= ~0x4000_0000;
    }

    let res = 0;
    let mask = 1;
    bigNum.forEach(i => {
        res += i * mask;
        mask /= 0x1_0000_0000;
    });
    if (isNeg) {
        bigNum[0] |= 0x4000_0000;
        res = -res;
    }
    return res;
}

function test(description, cb) {
    try {
        cb();
        console.log(`\u001b[32;1m[pass]\u001b[0m \"${description}\"`);
    } catch (e) {
        if (Array.isArray(e) && e.length === 2) {
            console.error(
                `\u001b[31;1m[fail]\u001b[0m \"${description}\" expected \u001b[34;1m${fmt(e[0])}\u001b[0m actual \u001b[34;1m${fmt(e[1])}\u001b[0m`
            );
        } else {
            throw e;
        }
    }
}

function fmt(x) {
    if (Number.isFinite(x) && Number.isInteger(x) && typeof x === 'number') {
        return `0x${x.toString(16)}`;
    }
    if (Array.isArray(x)) {
        return `[${x.map(fmt).join(', ')}]`;
    }
    return x;
}

function assertEquals(expected, actual) {
    if (Array.isArray(expected)
        && Array.isArray(actual)
        && expected.length === actual.length
        && expected.every((v, i) => v === actual[i])
    ) {
        return;
    }
    if (expected !== actual) {
        throw [expected, actual];
    }
}

/**
 * @return {Promise<{memory: Memory, add: Function, mul: Function}>}
 */
async function instantiate() {
    const memory = new WebAssembly.Memory(
        {initial: 1}
    );

    const instObj = await WebAssembly.instantiateStreaming(
        fetch('asmBigNum/debug.wasm'),
        {
            env: {memory}
        },
    )

    return instObj.instance.exports;
}
