import { emit } from './emit.mjs';

emitDoRenderPointBigNum(2);

function emitDeclarations(precision) {
    emitDecl('xMin', precision, true);
    emitDecl('w', precision, true);
    emitDecl('yMin', precision, true);
    emitDecl('h', precision, true);
    emitDecl('yMax', precision);
    emitDecl('wStepFraction', precision);
    emitDecl('hStepFraction', precision);
}

function emitInitialization(precision) {
    // add(yMinPtr, hPtr, yMaxPtr);
    emitAdd('yMin', 'h', 'yMax', precision);
    // wStepFraction = w * (1.0 / canvasW)(t0)
    emit('const oneOverCanvasW = 1.0 / canvasW;');
    emitFromPosDouble('oneOverCanvasW', 'wStepFraction', precision);

}

function emitDoRenderPointBigNum(precision) {
    // declarations
    emit(
        'function doRenderPointBigNum(pX: u32, pY: u32): u16 {',
    );

    ['x', 'y', 'xPos', 'yPos', 'x0_', 'y0_', 't0_', 't1_', 't2_'].forEach(op =>
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
    emitAdd('xMin', 'x0_', 'x0_', precision);

    emitMulByUintPositive('hStepFraction', 'pY', 'y0_', precision);
    emitNegate('y0_', precision);
    emitAdd('yMax', 'y0_', 'y0_', precision);

    ['x', 'y', 'xPos', 'yPos'].forEach(op => rangeFromTo(precision - 1, 0).forEach(
        i => emit(`${op}${i} = 0;`)
    ));
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

export function emitFromPosDouble(a, c, precision) {
    rangeFromTo(0, precision - 1).forEach(i => emit(
        `${c}${i} = (${a} as u32);`,
        i ? `${a} = (${a} - (${a} as u32)) * 0x1_0000_0000;` : null,
    ));
}

function emitMulPos(a, b, c, precision) {
    if (a === c || b === c) {
        throw new Error(`${a}, ${b}, ${c}`);
    }

    emit(`// Mul pos ${c} = ${a} * ${b}`);
    // Do mul
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
            emit(`${c}${cIx} = curr & 0xffff_ffff`);
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

function emitDecl(name, precision, isExport = false) {
    rangeFromTo(0, precision - 1).forEach(i => emit(`${isExport ? 'export ' : '' }let ${name}${i}: u64;`));
}

/**
 * @return {number[]}
 */
function rangeFromTo(from, toInclusive) {
    const length = Math.abs(toInclusive - from) + 1;
    const step = toInclusive > from ? 1 : -1;
    return Array.from({length}).map((_, i) => from + step * i);
}
