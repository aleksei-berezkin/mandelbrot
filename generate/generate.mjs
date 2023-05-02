import fs from 'fs';
import path from 'path';
import { emit, setEmitCb } from './emit.mjs';

const assemblyPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'assembly');
const templatePath = path.resolve(assemblyPath, 'src', 'renderMandelbrot.ts');

const templateLines = String(fs.readFileSync(templatePath)).split(/\r?\n\r?/);

const outLines = [];
setEmitCb(str => outLines.push(str));

const minPrecision = 3;
const maxPrecision = 12;

templateLines.forEach(inputLine => {
    if (inputLine.includes('+++ Generate global declarations')) {
        emitGlobalDeclarations(maxPrecision);
    } else if (inputLine.includes('+++ Generate initialization')) {
        emitFunctionWithPrecisionSwitch('initializeBigNum', 'void', '', '');
        rangeFromTo(minPrecision, maxPrecision).forEach(emitInitializeBigNumVectorized);
    } else if (inputLine.includes('+++ Generate render vectorized')) {
        emitFunctionWithPrecisionSwitch('renderTwoPointsBigNum', 'u64', 'xy0: u64, xy1: u64', 'xy0, xy1');
        rangeFromTo(minPrecision, maxPrecision).forEach(emitRenderPointBigNumVectorized);
    } else {
        outLines.push(inputLine);
    }
});

const outPath = path.resolve(assemblyPath, 'generated', 'renderMandelbrot.ts');
fs.mkdirSync(path.dirname(outPath), {recursive: true});
fs.writeFileSync(outPath, Buffer.from(outLines.join('\n')));

function emitGlobalDeclarations(precision) {
    emitDecl({names: ['xMin', 'w', 'yMin', 'h'], precision, isExport: true});
    emitDecl({names: ['yMax', 'wStepFraction', 'hStepFraction'], precision});

    emitDecl({names: ['xMinVec', 'wVec', 'yMinVec', 'hVec'], precision, vector: true});
    emitDecl({names: ['yMaxVec', 'wStepFractionVec', 'hStepFractionVec'], precision, vector: true});
}

function emitFunctionWithPrecisionSwitch(name, type, paramsTyped, params) {
    emit(
        `function ${name}(${paramsTyped}): ${type} {`,
        'switch (precision) {',
    );
    const returnStr = type !== 'void' ? 'return ' : '';
    const breakStr = type === 'void' ? ' break;' : '';
    rangeFromTo(minPrecision, maxPrecision).forEach(precision =>
        emit(`case ${precision}: ${returnStr}${name}${precision}(${params});${breakStr}`)
    );
    if (type !== 'void') {
        emit('default: return 1;');
    }
    emit('}', '}');
}

function emitInitializeBigNumVectorized(precision) {
    emit(`function initializeBigNum${precision}(): void {`);
    emitArithVarsDecl(true);
    emitDecl({names: 't_', precision, vector: true});
    emit('');

    ['xMin', 'w', 'yMin', 'h'].forEach(v => rangeFromTo(precision - 1, 0).forEach(i => emit(`${v}Vec${i} = v128.splat<u64>(${v}${i});`)));
    emit('');

    // yMax = yMin + h
    emitAddVector('yMinVec', 'hVec', 'yMaxVec', precision);

    // wStepFraction = w * (1.0 / canvasW)
    emit('let t = 1.0 / (canvasW as f64);');
    emit('');
    emitFromPosDoubleVector('t', 't_', precision);
    emitMulPosVector('wVec', 't_', 'wStepFractionVec', precision);

    emit('t = 1.0 / (canvasH as f64);');
    emit('');
    emitFromPosDoubleVector('t', 't_', precision);
    emitMulPosVector('hVec', 't_', 'hStepFractionVec', precision);

    emit('}');
}

function emitRenderPointBigNumVectorized(precision) {
    // declarations

    emit(
        `function renderTwoPointsBigNum${precision}(xy0: u64, xy1: u64): u64 {`,
    );

    // xPos and yPos are abs (positive) values of x and y
    // Because 2-s complement multiplication is too complicated
    emitDecl({names: ['x', 'y', 'xPos', 'yPos', 'x0_', 'y0_', 't0_', 't1_', 't2_'], precision, vector: true});
    emitArithVarsDecl(true);

    emit(
        `let pX = v128.splat<u64>(xy0 & 0xffff_ffff);`,
        `pX = v128.replace_lane<u64>(pX, 1, xy1 & 0xffff_ffff);`,
        `let pY = v128.splat<u64>(xy0 >>> 32);`,
        `pY = v128.replace_lane<u64>(pY, 1, xy1 >>> 32);`,
        ''
    )

    emitMulByUintPositiveVector('wStepFractionVec', 'pX', 'x0_', precision);
    emitAddVector('xMinVec', 'x0_', 'x0_', precision);

    emitMulByUintPositiveVector('hStepFractionVec', 'pY', 'y0_', precision);
    emitNegateVector('y0_', precision);
    emitAddVector('yMaxVec', 'y0_', 'y0_', precision);

    emitSetZeroVector(['x', 'y', 'xPos', 'yPos'], precision);
    emit('');

    emit(
        'let divergedAtIter0: u32 = 0;',
        'let divergedAtIter1: u32 = 0;'
    )

    // Main loop
    emit('for (let i: u32 = 0 ; i < maxIterations; i++) {');

    // xSqr -> t0, ySqr -> t1, sum -> t2
    emitMulPosVector('xPos', 'xPos', 't0_', precision);
    emitMulPosVector('yPos', 'yPos', 't1_', precision);
    emitAddVector('t0_', 't1_', 't2_', precision);
    emit(`const gt4 = v128.gt<i64>(t2_0, ${i64x2(4)});`);

    // Check diverge
    emit(
        'if (!divergedAtIter0 && v128.extract_lane<u64>(gt4, 0)) {',
        'divergedAtIter0 = i;',
        '}',
        'if (!divergedAtIter1 && v128.extract_lane<u64>(gt4, 1)) {',
        'divergedAtIter1 = i;',
        '}',
        'if (divergedAtIter0 && divergedAtIter1) {',
        'break;',
        '}',
        '',
    );

    // t1 <- xNext = (xSqr - ySqr) + x0
    emitNegateVector('t1_', precision);
    emitAddVector('t0_', 't1_', 't1_', precision);
    emitAddVector('t1_', 'x0_', 't1_', precision);

    // y = x * y * 2 + y0
    emitMulPosVector('xPos', 'yPos', 't0_', precision);
    emit(`let neg: v128 = v128.ne<u64>(v128.and(x0, ${i64x2('0x8000_0000')}), v128.and(y0, ${i64x2('0x8000_0000')}));`);
    emitNegateVectorIf('t0_', 'neg', precision);
    emitTwoTimesVector('t0_', 't0_', precision);
    emitAddVector('t0_', 'y0_', 'y', precision);

    rangeFromTo(0, precision - 1).forEach(i => emit(
        `x${i} = t1_${i};`,
        `xPos${i} = x${i};`,
        `yPos${i} = y${i};`,
    ));

    ['x', 'y'].forEach(op => {
        emit(
            `neg = v128.ne<u64>(v128.and(${op}Pos0, ${i64x2('0x8000_0000')}), ${i64x2(0)});`,
            // v128.any_true is buggy in Safari
            'if (v128.extract_lane<u64>(neg, 0) || v128.extract_lane<u64>(neg, 1)) {',
        );
        emitNegateVectorIf(`${op}Pos`, 'neg', precision);
        emit('}')
    })

    emit(
        '}',
        'if (!divergedAtIter0) {',
        'divergedAtIter0 = maxIterations;',
        '}',
        'if (!divergedAtIter1) {',
        'divergedAtIter1 = maxIterations;',
        '}',
        '',
        'return (divergedAtIter1 as u64) << 32 | divergedAtIter0 as u64;',
        '}',
        '',
    );
}

export function emitFromPosDoubleVector(a, c, precision) {
    emit(`// double ${a} to BigNum ${c}`)
    rangeFromTo(0, precision - 1).forEach(i => emit(
        `${c}${i} = v128.splat<u64>(${a} as u32);`,
        (precision - 1 - i) ? `${a} = (${a} - (${a} as u32)) * 0x1_0000_0000;` : null,
    ));
    emit('');
}

function emitMulPosVector(a, b, c, precision) {
    if (a === c || b === c) {
        throw new Error(`${a}, ${b}, ${c}`);
    }

    emit(`// Mul pos ${c} = ${a} * ${b}`);
    emit(`curr = ${i64x2(0)};`)
    emit(`next = ${i64x2(0)};`)
    rangeFromTo(precision, 0).forEach(cIx => {
        emit(`// ${c}${cIx}`);
        const fromAIx = cIx === precision ? 1 : 0;
        const toAIx = Math.min(precision - 1, cIx);
        rangeFromTo(fromAIx, toAIx).map(aIx => {
            const bIx = cIx - aIx;
            const skipCheckOverflow = cIx === precision && aIx === 1 || cIx === 0;
            emit(
                `m = v128.mul<u64>(${a}${aIx}, ${b}${bIx});`,
                `curr = v128.add<u64>(curr, m);`,
            );
            if (!skipCheckOverflow) {
                emit(
                    // No u64 comparison https://stackoverflow.com/questions/65441496/what-is-the-most-efficient-way-to-do-unsigned-64-bit-comparison-on-sse2#comment115700244_65441496
                    `m = v128.and(${i64x2('0x1_0000_0000')}, v128.lt<i64>(v128.xor(curr, ${i64x2('0x8000_0000_0000_0000')}), v128.xor(m, ${i64x2('0x8000_0000_0000_0000')})));`,
                    `next = v128.add<u64>(next, m);`,
                )
            }
            emit('');
        });

        if (cIx !== precision) {
            emit(`${c}${cIx} = v128.and(curr, ${i64x2('0xffff_ffff')});`);
        }

        if (cIx !== 0) {
            emit(
                `curr = v128.or(v128.shr<u64>(curr, 32), next);`,
                `next = ${i64x2(0)};`,
            )
            emit('');
        }
    });
}

function emitNegateVector(a, precision) {
    emit(
        `// negate ${a}`,
        `cOut = ${i64x2(1)};`,
    );
    rangeFromTo(precision - 1, 0).forEach(i => {
        emit(`${a}${i} = v128.add<u64>(v128.xor(${a}${i}, ${i64x2('0xffff_ffff')}), cOut);`);
        if (i) {
            emit(`cOut = v128.shr<u64>(${a}${i}, 32);`);
        }
        emit(`${a}${i} = v128.and(${a}${i}, ${i64x2('0xffff_ffff')});`);
    });
    emit('');
}

/**
 * @param a
 * @param b Has to be full mask (e.g. 0xffff_ffff_ffff_ffff_0000_0000_0000_0000)
 * @param precision
 */
function emitNegateVectorIf(a, b, precision) {
    emit(
        `// negate ${a} if ${b}`,
        `cOut = v128.and(${i64x2(1)}, ${b});`,
        `m = v128.and(${i64x2('0xffff_ffff')}, ${b});`,
    );
    rangeFromTo(precision - 1, 0).forEach(i => {
        emit(`${a}${i} = v128.add<u64>(v128.xor(${a}${i}, m), cOut);`);
        if (i) {
            emit(`cOut = v128.shr<u64>(${a}${i}, 32);`);
        }
        emit(`${a}${i} = v128.and(${a}${i}, ${i64x2('0xffff_ffff')});`);
    });
    emit('');
}

function emitMulByUintPositiveVector(a, b, c, precision) {
    emit(
        `// Mul positive by uint ${c} = ${a} * ${b}`,
        `cOut = ${i64x2(0)};`,
    );
    rangeFromTo(precision - 1, 0).forEach(i => {
        emit(
            `${c}${i} = v128.add<u64>(v128.mul<u64>(${a}${i}, ${b}), cOut);`,
            i ? `cOut = v128.shr<u64>(${c}${i}, 32);` : null,
            `${c}${i} = v128.and(${c}${i}, ${i64x2('0xffff_ffff')});`
        );
    });
    emit('');
}

function emitAddVector(a, b, c, precision) {
    emit(
        `// add ${c} = ${a} + ${b}`,
        `cOut = ${i64x2(0)};`,
    );
    rangeFromTo(precision - 1, 0).forEach(i => {
        emit(
            `${c}${i} = v128.add<u64>(v128.add<u64>(${a}${i}, ${b}${i}), cOut);`,
            i ? `cOut = v128.shr<u64>(${c}${i}, 32);` : null,
            `${c}${i} = v128.and(${c}${i}, ${i64x2('0xffff_ffff')});`
        );
    });
    emit('');
}

function emitTwoTimesVector(a, c, precision) {
    emit(
        `// 2 times: ${c} = 2 * ${a}`,
        `cOut = ${i64x2(0)};`,
    );
    rangeFromTo(precision - 1, 0).forEach(i => emit(
        `${c}${i} = v128.or(v128.shl<u64>(${a}${i}, 1), cOut);`,
        i ? `cOut = v128.shr<u64>(${c}${i}, 32);` : null,
        `${c}${i} = v128.and(${c}${i}, ${i64x2('0xffff_ffff')});`,
    ));
    emit('');
}

function emitArithVarsDecl(vector = false) {
    const type = vector ? 'v128' : 'u64';
    const initZero = vector ? i64x2(0) : '0'
    emit(
        `let cOut: ${type};`,
        `let m: ${type};`,
        `let curr: ${type} = ${initZero};`,
        `let next: ${type} = ${initZero};`,
    );
    emit('');
}

function emitDecl({names, precision, isExport, vector}) {
    (typeof names === 'string' ? [names] : names).forEach(
        name => rangeFromTo(0, precision - 1).forEach(
            i => emit(`${isExport ? 'export ' : '' }let ${name}${i}: ${vector ? 'v128' : 'u64'};`)
        )
    );
}

function emitSetZeroVector(names, precision) {
    names.forEach(name => rangeFromTo(0, precision - 1).forEach(i => emit(`${name}${i} = ${i64x2(0)};`)));
}

function i64x2(i64val) {
    return `i64x2(${i64val}, ${i64val})`;
}

/**
 * @return {number[]}
 */
function rangeFromTo(from, toInclusive) {
    const length = Math.abs(toInclusive - from) + 1;
    const step = toInclusive > from ? 1 : -1;
    return Array.from({length}).map((_, i) => from + step * i);
}
