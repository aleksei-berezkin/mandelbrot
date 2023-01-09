import { emit } from './emit.mjs';
const minPrecision = 2;
const maxPrecision = 10;

const precision = 3;

// declarations
emit(
    'function doRenderPointBigNum(pX: u32, pY: u32): u16 {',
);

['a', 'b'].forEach(op =>
    rangeFromTo(0, precision - 1).forEach(i => emit(`let ${op}${i}: u64;`))
);

emit(
    'let m: u64;',
    'let cOut: u64;',
    'let curr: u64 = 0;',
    'let next: u64 = 0;',
    'let isNeg: boolean;',
    '',
)

emitMulByUintPositive('wStepFraction', 'pX', 'x0_', precision);
emitMul('x', 'x', 'z', precision);
emitAdd('x0_', 'tmp0_', 'x0_', precision);
emitTwoTimes('t1_', 't1_', precision);

emit('}');

function emitMul(a, b, c, precision) {
    if (a === c || b === c) {
        throw new Error(`${a}, ${b}, ${c}`);
    }

    emit(`// Mul ${c} = ${a} * ${b}`);
    const same = a === b;
    // Load a
    rangeFromTo(0, precision - 1).forEach(i => emit(`a${i} = ${a}${i};`));
    emit(`if ((a0 & 0x8000_0000) !== 0) {`);
    emitNegate('a', precision);
    emit('}');
    if (!same) {
        // Load b
        rangeFromTo(0, precision - 1).forEach(i => emit(`let b${i} = ${b}${i};`));
        emit(`if ((b0 & 0x8000_0000) !== 0) {`);
        emitNegate('b', precision);
        emit('}');
        emit(`isNeg = (${a}0 & 0x8000_0000) !== (${b}0 & 0x8000_0000);`);

        emit(
            '',
            'cOut = 1;',
        );
    }

    emit('');

    // Do mul
    rangeFromTo(precision, 0).forEach(cIx => {
        emit(`// c${cIx}`);
        const fromAIx = cIx === precision ? 1 : 0;
        const toAIx = Math.min(precision - 1, cIx);
        rangeFromTo(fromAIx, toAIx).map(aIx => {
            const bIx = cIx - aIx;
            const skipCheckOverflow = cIx === precision && aIx === 1 || cIx === 0;
            emit(
                `m = a${aIx} * ${same ? 'a' : 'b'}${bIx};`,
                `curr += m;`,
                skipCheckOverflow ? null : `if (curr < m) next += 0x1_0000_0000;`,
                '',
            );
        });

        if (cIx !== precision) {
            if (!same) {
                emit(
                    'if (isNeg) {',
                    '  m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;',
                    '  cOut = m >>> 32;',
                    '} else {',
                    '  m = curr;',
                    '}',
                    `${c}${cIx} = m & 0xffff_ffff;`,
                );
            } else {
                emit(`${c}${cIx} = curr & 0xffff_ffff`);
            }
        }

        if (cIx !== 0) {
            emit(
                'curr = curr >>> 32 | next;',
                'next = 0;',
            )
            emit('');
        }
    });
    emit('');
}

function emitNegate(a, precision) {
    emit('cOut = 1;');
    rangeFromTo(precision - 1, 0).forEach(i => {
        emit(`${a}${i} = (${a}${i} ^ 0xffff_ffff) + cOut;`);
        if (i) {
            emit(`cOut = ${a}${i} >>> 32;`);
        }
        emit(`${a}${i} &= 0xffff_ffff;`);
    });
}

function emitMulByUintPositive(a, b, c, precision) {
    emit(
        `// Mul positive by uint ${c} = ${a} * ${b}`,
        'cOut = 0;',
    );
    rangeFromTo(precision - 1, 0).forEach(i => {
        emit(
            `${c}${i} = ${a}${i} * (${b} as u64) + cOut;`,
            i !== 0 ? `cOut = ${c}${i} >>> 32` : null,
            `${c}${i} &= 0xffff_ffff`,
        );
    });
    emit('');
}

function emitAdd(a, b, c, precision) {
    emit(
        `// add ${c} = ${a} + ${b}`,
        'cOut = 0;',
    );
    rangeFromTo(precision - 1, 0).forEach(i => emit(
        `${c}${i} = ${a}${i} + ${b}${i} + cOut;`,
        i !== 0 ? `cOut = ${c}${i} >>> 32;` : null,
        `${c}${i} &= 0xffff_ffff;`,
    ));
    emit('');
}


function emitTwoTimes(a, c, precision) {
    emit(
        `// 2 times: ${c} = 2 * ${a}`,
        'cOut = 0;',
    );
    rangeFromTo(precision - 1, 0).forEach(i => emit(
        `${c}${i} = (${a}${i} << 1) | cOut;`,
        i !== 0 ? `cOut = ${c}${i} >>> 32;` : null,
        `${c}${i} &= 0xffff_ffff;`,
    ));
    emit('');
}

/**
 * @return {number[]}
 */
function rangeFromTo(from, toInclusive) {
    const length = Math.abs(toInclusive - from) + 1;
    const step = toInclusive > from ? 1 : -1;
    return Array.from({length}).map((_, i) => from + step * i);
}
