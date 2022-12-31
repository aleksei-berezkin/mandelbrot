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
    writeBigNum(0, [0x2fff_fffe, 0xffff_ffff]);
    writeBigNum(2, [0x1000_0000, 0x0000_0001]);
    wExports.add(0, w * 2, w * 4);
    assertEquals([0x3fff_ffff, 0], readBigNum(4, 1));
});

test('Overflow in pos add', () => {
    const a = [0x3fff_ffff, 0xffff_ffff];
    const b = [0, 0x0000_0001];
    writeBigNum(0, a);
    writeBigNum(2, b);
    wExports.add(0, w * 2, w * 4);
    assertEquals(a, readBigNum(0, 1));
    assertEquals(b, readBigNum(2, 1));
    assertEquals(Number.POSITIVE_INFINITY, toDouble(readBigNum(4, 1)));
});

test('Overflow in neg add', () => {
    const a = [0x7fff_ffff, 0xffff_ffff];
    const b = [0x4000_0000, 1];
    writeBigNum(0, a);
    writeBigNum(2, b);
    wExports.add(0, w * 2, w * 4);
    assertEquals(Number.POSITIVE_INFINITY, toDouble(readBigNum(4, 1)));
});

test('cmpPositive', () => {
    writeBigNum(0, fromDouble(1.5, 1));
    writeBigNum(2, fromDouble(2.25, 1));
    assertEquals(-1, wExports.cmpPositive(0, w * 2));
    assertEquals(+1, wExports.cmpPositive(w * 2, 0));
    assertEquals(0, wExports.cmpPositive(0, 0));
});

test('Subtract simple a-b', () => {
    writeBigNum(0, fromDouble(3.5, 1));
    writeBigNum(2, fromDouble(-1.125, 1));
    wExports.add(0, w * 2, w * 4);
    assertEquals(3.5, toDouble(readBigNum(0, 1)));
    assertEquals(-1.125, toDouble(readBigNum(2, 1)));
    assertEquals(2.375, toDouble(readBigNum(4, 1)));
});

test('Subtract simple b-a', () => {
    writeBigNum(0, fromDouble(-13.5, 1));
    writeBigNum(2, fromDouble(1.125, 1));
    wExports.add(0, w * 2, w * 4);
    assertEquals(-13.5, toDouble(readBigNum(0, 1)));
    assertEquals(1.125, toDouble(readBigNum(2, 1)));
    assertEquals(-12.375, toDouble(readBigNum(4, 1)));
});

test('Subtract near overflow', () => {
    writeBigNum(0, [0x7fff_ffff, 0]);
    writeBigNum(2, [0, 1]);
    wExports.add(0, w * 2, w * 4);
    assertEquals([0x7fff_fffe, 0xffff_ffff], readBigNum(4, 1));
});

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

test('Multiply overflow', () => {
    writeBigNum(0, [0x7f00_0000, 0]);
    writeBigNum(2, fromDouble(2, 1));
    wExports.mul(0, w * 2, w * 4, w * 6);
    assertEquals(Number.POSITIVE_INFINITY, toDouble(readBigNum(4, 1)));
});

test('Multiply randomized', () => withHigherPrecision(() => {
    for (let i = 0; i < 1000; i++) {
        const a = Math.random() * 0xf000 * randomSign();
        const b = Math.random() * 0xf000 * randomSign();
        writeBigNum(0, fromDouble(a, 2));
        writeBigNum(3, fromDouble(b, 2));
        wExports.mul(0, w * 3, w * 6, w * 9);
        assertEquals(a, toDouble(readBigNum(0, 2)));
        assertEquals(b, toDouble(readBigNum(3, 2)));
        const expected = Math.abs(a * b) >= 0x4000_0000 ? Number.POSITIVE_INFINITY : a * b;
        assertEquals(expected, toDouble(readBigNum(6, 2)), 1e-6);
    }
}));

test('Square', () => {
    writeBigNum(0, fromDouble(-2, 1));
    wExports.mul(0, 0, w * 2, w * 4);
    assertEquals(-2, toDouble(readBigNum(0, 1)));
    assertEquals(4, toDouble(readBigNum(2, 1)));
});

test('Mul by uint simple', () => {
    writeBigNum(0, fromDouble(1.5, 1));
    wExports.mulByUint(0, 10, w * 2);
    assertEquals(15, toDouble(readBigNum(2, 1)));
});

test('Mul by uint randomized', () => withHigherPrecision(() => {
    for (let i = 0; i < 1000; i++) {
        const a = Math.random() * 0xa000 * randomSign();
        const b = Math.round(Math.random() * 0xa000);
        const aBigNum = fromDouble(a, 2);
        writeBigNum(0, aBigNum);
        wExports.mulByUint(0, b, w * 3);
        assertEquals(aBigNum, readBigNum(0, 2));
        const expected = Math.abs(a * b) >= 0x4000_0000 ? Number.POSITIVE_INFINITY : a * b;
        assertEquals(expected, toDouble(readBigNum(3, 2)), 1e-5);
    }
}));

test('Two times simple', () => {
    writeBigNum(0, fromDouble(11.25, 1));
    wExports.twoTimes(0, w * 2);
    assertEquals(22.5, toDouble(readBigNum(2, 1)));
});

test('Two times randomized', () => withHigherPrecision(() => {
    for (let i = 0; i < 2000; i++) {
        const a = Math.random() * 0x6000_0000 * randomSign();
        const aBigNum = fromDouble(a, 2);
        writeBigNum(0, aBigNum);
        wExports.twoTimes(0, w * 3);
        assertEquals(aBigNum, readBigNum(0, 2));
        const expected = Math.abs(2 * a) >= 0x4000_0000 ? Number.POSITIVE_INFINITY : 2 * a;
        assertEquals(expected, toDouble(readBigNum(3, 2)));
    }
}));

test('From double asm simple', () => {
    wExports.fromDouble(-2.25, 0);
    assertEquals(-2.25, toDouble(readBigNum(0, 1)));
});

test('From double asm randomized', () => withHigherPrecision(() => {
    for (let i = 0; i < 2000; i++) {
        const a = Math.random() * 0x8000_0000 * randomSign();
        wExports.fromDouble(a, 0);
        const expected = Math.abs(a) >= 0x4000_0000 ? Number.POSITIVE_INFINITY : a;
        assertEquals(expected, toDouble(readBigNum(0, 2)));
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

test('bigIntToBigNum very large and very small', () => {
    for (let i = 0; i < 10000; i++) {
        let p = BigInt(Math.round(Math.random() * 0x100) * randomSign());
        let q = BigInt(Math.round(Math.random() * 0x100_0000_0000) + 1);

        const verySmall = bigIntToBigNum(p, q, 5);
        assertEquals(Number(p) / Number(q), toDouble(verySmall), 1e-7);

        p = (p < 0 ? -p : p) + 1n;
        q *= BigInt(randomSign());
        const veryLarge = bigIntToBigNum(q, p, 5);
        const expected = (q < 0 ? -q : q) / p >= 0x4000_0000n ? Number.POSITIVE_INFINITY : Number(q) / Number(p);
        assertEquals(expected, toDouble(veryLarge), 1e-7);
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
    cb();
    wExports.precision.value = basePrecision;
    wExports.fracPrecision.value = baseFracPrecision;
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
