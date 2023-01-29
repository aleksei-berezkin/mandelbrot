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
    const precision = 3;
    if (inputLine.includes('+++ Generate global declarations')) {
        emitGlobalDeclarations(maxPrecision);
    } else if (inputLine.includes('+++ Generate initialization')) {
        emitFunctionWithPrecisionSwitch('initializeBigNum', 'void', '', '');
        rangeFromTo(minPrecision, maxPrecision).forEach(emitInitializeBigNumVectorized);
    } else if (inputLine.includes('+++ Generate render simple')) {
        // emitFunctionWithPrecisionSwitch('renderPointBigNum', 'u32', 'pX: u32, pY: u32', 'pX, pY');
        // rangeFromTo(minPrecision, maxPrecision).forEach(emitRenderPointBigNum);
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

function emitInitializeBigNum(precision) {
    emit(`function initializeBigNum${precision}(): void {`);
    emitArithVarsDecl();
    emitDecl({names: 't_', precision});
    emit('');

    // yMax = yMin + h
    emitAdd('yMin', 'h', 'yMax', precision);

    // wStepFraction = w * (1.0 / canvasW)
    emit('let t = 1.0 / canvasW;');
    emit('');
    emitFromPosDouble('t', 't_', precision);
    emitMulPos('w', 't_', 'wStepFraction', precision);

    // hStepFraction = h * (1.0 / canvasH)
    emit('t = 1.0 / canvasH;');
    emit('');
    emitFromPosDouble('t', 't_', precision);
    emitMulPos('h', 't_', 'hStepFraction', precision);
    emit('}');
}

function emitRenderPointBigNumVectorized(precision) {
    // declarations

    emit(
        `function renderTwoPointsBigNum${precision}(xy0: u64, xy1: u64): u64 {`,
    );

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

    emit(`let notDivergedYet = ${i64x2('0xffff_ffff_ffff_ffff')};`,
        `let divergedAtIter = ${i64x2(0)};`,
    )

    // Main loop
    emit('for (let i: u32 = 0 ; i < maxIterations; i++) {');

    // xSqr -> t0, ySqr -> t1, sum -> t2
    emitMulPosVector('xPos', 'xPos', 't0_', precision);
    emitMulPosVector('yPos', 'yPos', 't1_', precision);
    emitAddVector('t0_', 't1_', 't2_', precision);
    emit(`const ge4 = v128.ge<i64>(t2_0, ${i64x2(4)});`);

    // Check diverge
    emit(
        'const justDiverged = v128.and(notDivergedYet, ge4);',
        'notDivergedYet = v128.andnot(notDivergedYet, justDiverged);',
        'if (v128.any_true(justDiverged)) {',
        'divergedAtIter = v128.or(divergedAtIter, v128.and(justDiverged, v128.splat<u64>(i)));',
        'if (v128.all_true<u64>(divergedAtIter)) break;',
        '}'
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
            'if (v128.any_true(neg)) {',
        );
        emitNegateVectorIf(`${op}Pos`, 'neg', precision);
        emit('}')
    })

    emit('}');
    emit('divergedAtIter = v128.or(divergedAtIter, v128.and(notDivergedYet, v128.splat<u64>(maxIterations)));')
    emit('return v128.extract_lane<u64>(divergedAtIter, 0) | (v128.extract_lane<u64>(divergedAtIter, 1) << 32);');
    emit('}', '')
}

function emitRenderPointBigNum(precision) {
    // declarations
    emit(
        `function renderPointBigNum${precision}(pX: u32, pY: u32): u32 {`,
    );

    emitDecl({names: ['x', 'y', 'xPos', 'yPos', 'x0_', 'y0_', 't0_', 't1_', 't2_'], precision});

    emitArithVarsDecl();

    emitMulByUintPositive('wStepFraction', 'pX', 'x0_', precision);
    emitAdd('xMin', 'x0_', 'x0_', precision);

    emitMulByUintPositive('hStepFraction', 'pY', 'y0_', precision);
    emitNegate('y0_', precision);
    emitAdd('yMax', 'y0_', 'y0_', precision);

    emitSetZero(['x', 'y', 'xPos', 'yPos'], precision);
    emit('');

    emit('let i: u32 = 0;');
    emit('for ( ; i < maxIterations; i++) {');

    // xSqr -> t0, ySqr -> t1
    emitMulPos('xPos', 'xPos', 't0_', precision);
    emitMulPos('yPos', 'yPos', 't1_', precision);
    emitAdd('t0_', 't1_', 't2_', precision);
    emit('if (t2_0 >= 4) {');
    emit('break;');
    emit('}', '');

    // t1 <- xNext = (xSqr - ySqr) + x0
    emitNegate('t1_', precision);
    emitAdd('t0_', 't1_', 't1_', precision);
    emitAdd('t1_', 'x0_', 't1_', precision);

    // y = x * y * 2 + y0
    emitMulPos('xPos', 'yPos', 't0_', precision);
    emit(`if ((x0 & 0x8000_0000) !== (y0 & 0x8000_0000)) {`);
    emitNegate('t0_', precision);
    emit('}');
    emitTwoTimes('t0_', 't0_', precision);
    emitAdd('t0_', 'y0_', 'y', precision)

    rangeFromTo(0, precision - 1).forEach(i => emit(
        `x${i} = t1_${i};`,
        `xPos${i} = x${i};`,
        `yPos${i} = y${i};`,
    ));
    ['x', 'y'].forEach(op => {
        emit(`if ((${op}Pos0 & 0x8000_0000) !== 0) {`);
        emitNegate(`${op}Pos`, precision);
        emit('}');
    })

    emit('}', '');

    emit('return i;');

    emit('}');
}

export function emitFromPosDoubleVector(a, c, precision) {
    emit(`// double ${a} to BigNum ${c}`)
    rangeFromTo(0, precision - 1).forEach(i => emit(
        `${c}${i} = v128.splat<u64>(${a} as u32);`,
        (precision - 1 - i) ? `${a} = (${a} - (${a} as u32)) * 0x1_0000_0000;` : null,
    ));
    emit('');
}

export function emitFromPosDouble(a, c, precision) {
    emit(`// double ${a} to BigNum ${c}`)
    rangeFromTo(0, precision - 1).forEach(i => emit(
        `${c}${i} = (${a} as u32);`,
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

function emitMulPos(a, b, c, precision) {
    if (a === c || b === c) {
        throw new Error(`${a}, ${b}, ${c}`);
    }

    emit(`// Mul pos ${c} = ${a} * ${b}`);
    rangeFromTo(precision, 0).forEach(cIx => {
        emit(`// ${c}${cIx}`);
        const fromAIx = cIx === precision ? 1 : 0;
        const toAIx = Math.min(precision - 1, cIx);
        rangeFromTo(fromAIx, toAIx).map(aIx => {
            const bIx = cIx - aIx;
            const skipCheckOverflow = cIx === precision && aIx === 1 || cIx === 0;
            emit(
                `m = ${a}${aIx} * ${b}${bIx};`,
                `curr += m;`,
                skipCheckOverflow ? null : `if (curr < m) next += 0x1_0000_0000;`,
                '',
            );
        });

        if (cIx !== precision) {
            emit(`${c}${cIx} = curr & 0xffff_ffff;`);
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
    emit(
        `// negate ${a}`,
        'cOut = 1;',
    );
    rangeFromTo(precision - 1, 0).forEach(i => {
        emit(`${a}${i} = (${a}${i} ^ 0xffff_ffff) + cOut;`);
        if (i) {
            emit(`cOut = ${a}${i} >>> 32;`);
        }
        emit(`${a}${i} &= 0xffff_ffff;`);
    });
    emit('');
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

function emitMulByUintPositive(a, b, c, precision) {
    emit(
        `// Mul positive by uint ${c} = ${a} * ${b}`,
        'cOut = 0;',
    );
    rangeFromTo(precision - 1, 0).forEach(i => {
        emit(
            `${c}${i} = ${a}${i} * ${b} + cOut;`,
            i ? `cOut = ${c}${i} >>> 32;` : null,
            `${c}${i} &= 0xffff_ffff;`,
        );
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

function emitAdd(a, b, c, precision) {
    emit(
        `// add ${c} = ${a} + ${b}`,
        'cOut = 0;',
    );
    rangeFromTo(precision - 1, 0).forEach(i => emit(
        `${c}${i} = ${a}${i} + ${b}${i} + cOut;`,
        i ? `cOut = ${c}${i} >>> 32;` : null,
        `${c}${i} &= 0xffff_ffff;`,
    ));
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

function emitTwoTimes(a, c, precision) {
    emit(
        `// 2 times: ${c} = 2 * ${a}`,
        'cOut = 0;',
    );
    rangeFromTo(precision - 1, 0).forEach(i => emit(
        `${c}${i} = (${a}${i} << 1) | cOut;`,
        i ? `cOut = ${c}${i} >>> 32;` : null,
        `${c}${i} &= 0xffff_ffff;`,
    ));
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

function emitSetZero(names, precision) {
    names.forEach(name => rangeFromTo(0, precision - 1).forEach(i => emit(`${name}${i} = 0;`)));
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
