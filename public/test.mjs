/*
 * Because debugging WASM in a browser is easier
 */

import { bigIntToBigNum } from './bigIntToBigNum.mjs';

const wExports = await instantiate();
wExports.fracPrecision.value = 1;
wExports.precision.value = 2

const buf = new Uint32Array(wExports.memory.buffer);

const w = 4;

test('Test from/to double randomized', () => {
    for (let i = 0; i < 2000; i++) {
        const sourceDouble = Math.random() * 0x3fff_ffff * randomSign();
        const targetDouble = toDouble(fromDouble(sourceDouble, 2));
        assertEquals(sourceDouble, targetDouble);
    }
});

test('Simple add', () => {
    writeBigNum(0, fromDouble(10.5, 1));
    writeBigNum(2, fromDouble(21.75, 1));
    wExports.add(0, w * 2, w * 4);
    assertEquals(10.5, toDouble(readBigNum(0, 1)));
    assertEquals(21.75, toDouble(readBigNum(2, 1)));
    assertEquals(32.25, toDouble(readBigNum(4, 1)))
});

test('Add near overflow', () => {
    writeBigNum(0, [0x6fff_fffe, 0xffff_ffff]);
    writeBigNum(2, [0x1000_0000, 0x0000_0001]);
    wExports.add(0, w * 2, w * 4);
    assertEquals([0x7fff_ffff, 0], readBigNum(4, 1));
});

// test('cmpPositive', () => {
//     writeBigNum(0, fromDouble(1.5, 1));
//     writeBigNum(2, fromDouble(2.25, 1));
//     assertEquals(-1, wExports.cmpPositive(0, w * 2));
//     assertEquals(+1, wExports.cmpPositive(w * 2, 0));
//     assertEquals(0, wExports.cmpPositive(0, 0));
// });

// test('Subtract simple a-b', () => {
//     writeBigNum(0, fromDouble(3.5, 1));
//     writeBigNum(2, fromDouble(-1.125, 1));
//     wExports.add(0, w * 2, w * 4);
//     assertEquals(3.5, toDouble(readBigNum(0, 1)));
//     assertEquals(-1.125, toDouble(readBigNum(2, 1)));
//     assertEquals(2.375, toDouble(readBigNum(4, 1)));
// });
//
// test('Subtract simple b-a', () => {
//     writeBigNum(0, fromDouble(-13.5, 1));
//     writeBigNum(2, fromDouble(1.125, 1));
//     wExports.add(0, w * 2, w * 4);
//     assertEquals(-13.5, toDouble(readBigNum(0, 1)));
//     assertEquals(1.125, toDouble(readBigNum(2, 1)));
//     assertEquals(-12.375, toDouble(readBigNum(4, 1)));
// });
//
// test('Subtract near overflow', () => {
//     writeBigNum(0, [0xffff_ffff, 0]);
//     writeBigNum(2, [0, 1]);
//     wExports.add(0, w * 2, w * 4);
//     assertEquals([0xffff_fffe, 0xffff_ffff], readBigNum(4, 1));
// });

test('Randomized add', () => withHigherPrecision(() => {
    for (let i = 0; i < 20000; i++) {
        const a = Math.random() * 0x1fff_ffff * randomSign();
        const b = Math.random() * 0x1fff_ffff * randomSign();
        writeBigNum(0, fromDouble(a, 2));
        writeBigNum(3, fromDouble(b, 2));
        wExports.add(0, w * 3, w * 6);
        assertEquals(a, toDouble(readBigNum(0, 2)));
        assertEquals(b, toDouble(readBigNum(3, 2)));
        assertEquals(a + b, toDouble(readBigNum(6, 2)), 1e-7);
    }
}));

test('Multiply simple', () => {
    writeBigNum(0, fromDouble(1.5, 1));
    writeBigNum(2, fromDouble(2.25, 1));
    wExports.mul(0, w * 2, w * 4, w * 6);
    assertEquals(3.375, toDouble(readBigNum(4, 1)));
});

test('Multiply randomized', () => withHigherPrecision(() => {
    for (let i = 0; i < 1000; i++) {
        const a = Math.random() * 0x8000 * randomSign();
        const b = Math.random() * 0x8000 * randomSign();
        writeBigNum(0, fromDouble(a, 2));
        writeBigNum(3, fromDouble(b, 2));
        wExports.mul(0, w * 3, w * 6, w * 9);
        assertEquals(a, toDouble(readBigNum(0, 2)));
        assertEquals(b, toDouble(readBigNum(3, 2)));
        assertEquals(a * b, toDouble(readBigNum(6, 2)), 1e-6);
    }
}));

test('Square', () => {
    writeBigNum(0, fromDouble(-2.5, 1));
    wExports.mul(0, 0, w * 2, w * 4);
    assertEquals(-2.5, toDouble(readBigNum(0, 1)));
    assertEquals(6.25, toDouble(readBigNum(2, 1)));
});

test('Mul by uint simple', () => {
    writeBigNum(0, fromDouble(-1.25, 1));
    wExports.mulByUint(0, 10, w * 2);
    assertEquals(-12.5, toDouble(readBigNum(2, 1)));
});

test('Mul by uint randomized', () => withHigherPrecision(() => {
    for (let i = 0; i < 1000; i++) {
        const a = Math.random() * 0x8000 * randomSign();
        const b = Math.round(Math.random() * 0x8000);
        const aBigNum = fromDouble(a, 2);
        writeBigNum(0, aBigNum);
        wExports.mulByUint(0, b, w * 3);
        assertEquals(aBigNum, readBigNum(0, 2));
        assertEquals(a * b, toDouble(readBigNum(3, 2)), 1e-5);
    }
}));

test('Two times simple', () => {
    writeBigNum(0, fromDouble(11.25, 1));
    wExports.twoTimes(0, w * 2);
    assertEquals(22.5, toDouble(readBigNum(2, 1)));
});

test('Two times randomized', () => withHigherPrecision(() => {
    for (let i = 0; i < 2000; i++) {
        const a = Math.random() * 0x4000_0000 * randomSign();
        const aBigNum = fromDouble(a, 2);
        writeBigNum(0, aBigNum);
        wExports.twoTimes(0, w * 3);
        assertEquals(aBigNum, readBigNum(0, 2));
        assertEquals(2 * a, toDouble(readBigNum(3, 2)));
    }
}));

test('From double asm simple', () => {
    wExports.fromDouble(-2.25, 0);
    assertEquals(-2.25, toDouble(readBigNum(0, 1)));
});

test('From double asm randomized', () => withHigherPrecision(() => {
    for (let i = 0; i < 2000; i++) {
        const a = Math.random() * 0x4000_0000 * randomSign();
        wExports.fromDouble(a, 0);
        assertEquals(a, toDouble(readBigNum(0, 2)));
    }
}));

test('Negate', () => {
    writeBigNum(0, fromDouble(-1.5, 1));
    wExports.negate(0);
    assertEquals(1.5, toDouble(readBigNum(0, 1)));
    wExports.negate(0);
    assertEquals(-1.5, toDouble(readBigNum(0, 1)));
});

test('bigIntToBigNum', () => {
    for (let i = 0; i < 1000; i++) {
        const a = BigInt(Math.round(Math.random() * 0x3fff_0000) * randomSign());
        const unit = BigInt(Math.round(Math.random() * 0x3fff_0000) + 1);
        const bigNum = bigIntToBigNum(a, unit, 3);
        assertEquals(Number(a) / Number(unit), toDouble(bigNum), 1e-9);
    }
});

test('bigIntToBigNum 2', () => {
    // FIXME
    const unit = 8_000_000_000_000n;
    const yMin0 = -1537236428030n;
    const h0 = 6704822n;
    const yMin1 = -1537229723208n;
    // const yMin0 = 1537229723208n;
    // const h0 = 6704822n;
    // const yMin1 = 1537236428030n;

    assertEquals(yMin1, yMin0 + h0);

    const yMin0BigInt = bigIntToBigNum(yMin0, unit, 1);
    const h0BigInt = bigIntToBigNum(h0, unit, 1);
    const yMin1BigInt = bigIntToBigNum(yMin1, unit, 1);

    assertEquals(yMin1BigInt[0], yMin0BigInt[0]);
    assertEquals(yMin1BigInt[1], yMin0BigInt[1] + h0BigInt[1]);
});

/*
canvasH
:
1291
canvasYMin
:
0
h
:
6704822n
yMin
:
-1537236428030n
[[Prototype]]
:
Object

Object
canvasH
:
661
canvasYMin
:
1291
h
:
3426294n
yMin
:
-1537229723208n
[[Prototype]]
:
Object

unit=8e12

 */
test('bigIntToBigNum very large and very small', () => {
    for (let i = 0; i < 10000; i++) {
        let p = BigInt(Math.round(Math.random() * 0x100) * randomSign());
        let q = BigInt(Math.round(Math.random() * 0x8000_0000) + 1);

        const verySmall = bigIntToBigNum(p, q, 5);
        assertEquals(Number(p) / Number(q), toDouble(verySmall), 1e-7);

        p = (p < 0 ? -p : p) + 1n;
        q *= BigInt(randomSign());
        const veryLarge = bigIntToBigNum(q, p, 5);
        assertEquals(Number(q) / Number(p), toDouble(veryLarge), 1e-7);
    }
});

function readBigNum(offsetU32, fracPrecision) {
    if (!fracPrecision) {
        throw 'No fracPrecision';
    }
    const precision = 1 + fracPrecision;
    return Array.from({length: precision}).map((_, i) => buf[offsetU32 + i]);
}

function writeBigNum(offsetU32, bigNum) {
    bigNum.forEach((v, i) => buf[offsetU32 + i] = v);
}

function fromDouble(double, fracPrecision) {
    if (!fracPrecision) {
        throw 'No precision';
    }
    const precision = 1 + fracPrecision;
    const isNeg = double < 0;
    if (isNeg) {
        double = -double;
    }

    const mask = 0x1_0000_0000;
    let bigNum = Array.from({length: precision}).map(() => {
        const v =  Math.floor(double % mask);
        double *= 0x1_0000_0000;
        return v;
    })
    if (isNeg) {
        // Bitwise ops coerce to u32 that's why through BigInt
        let cOut = 1n;
        for (let i = precision - 1; i >= 0; i--) {
            const d = (BigInt(bigNum[i]) ^ 0xffff_ffffn) + cOut;
            bigNum[i] = Number(d & 0xffff_ffffn);
            cOut = d >> 32n;
        }
    }
    return bigNum;
}

function toDouble(bigNum) {
    bigNum = [...bigNum];
    const isNeg = (bigNum[0] & 0x8000_0000) !== 0;

    if (isNeg) {
        // Bitwise ops coerce to u32 that's why through BigInt
        let cOut = 1n;
        for (let i = bigNum.length - 1; i >= 0; i--) {
            const d = (BigInt(bigNum[i]) ^ 0xffff_ffffn) + cOut;
            bigNum[i] = Number(d & 0xffff_ffffn);
            cOut = d >> 32n;
        }
    }

    let res = 0;
    let mask = 1;
    bigNum.forEach((d, i) => {
        res += d * mask;
        mask /= 0x1_0000_0000;
    });

    if (isNeg) {
        res = -res;
    }
    return res;
}

function randomSign() {
    return Math.random() < .5 ? -1 : +1;
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

function assertEquals(expected, actual, delta = 0) {
    if (Array.isArray(expected)
        && Array.isArray(actual)
        && expected.length === actual.length
        && expected.every((v, i) => v === actual[i])
    ) {
        return;
    }

    if (typeof expected === 'number'
        && typeof actual === 'number'
        && !Number.isInteger(expected)
        && !Number.isInteger(actual)
        && Math.abs(expected - actual) < delta
    ) {
        return;
    }

    if (expected !== actual) {
        throw [expected, actual];
    }
}

/**
 * @param cb {Function}
 */
function withHigherPrecision(cb) {
    const basePrecision = wExports.precision.value;
    const baseFracPrecision = wExports.fracPrecision.value;
    wExports.precision.value = basePrecision + 1;
    wExports.fracPrecision.value = baseFracPrecision + 1;
    try {
        cb();
    } finally {
        wExports.precision.value = basePrecision;
        wExports.fracPrecision.value = baseFracPrecision;
    }
}

/**
 * @return {Promise<{fracPrecision: WebAssembly.Global, precision: WebAssembly.Global, memory: Memory, add: Function, mul: Function, cmpPositive: Function, mulByUint: Function, twoTimes: Function, fromDouble: Function, negate: Function}>}
 */
async function instantiate() {
    const memory = new WebAssembly.Memory(
        {initial: 1}
    );

    const instObj = await WebAssembly.instantiateStreaming(
        fetch('wasm/debug.wasm'),
        {
            env: {memory}
        },
    )

    return instObj.instance.exports;
}
