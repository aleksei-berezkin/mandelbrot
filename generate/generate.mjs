import fs from 'fs';
import path from 'path';
import { emit, setEmitCb, withIndented } from './emit.mjs';

const assemblyPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'assembly');
const templatePath = path.resolve(assemblyPath, 'src', 'renderMandelbrot.ts');

const templateLines = String(fs.readFileSync(templatePath)).split(/\r?\n\r?/);

const outLines = [];
setEmitCb(str => outLines.push(str));

templateLines.forEach(inputLine => {
    const precision = 3;
    if (inputLine.includes('+++ Generate global declarations')) {
        emitGlobalDeclarations(precision);
    } else if (inputLine.includes('+++ Generate initialization')) {
        withIndented(2, () => emitInitialization(precision));
    } else if (inputLine.includes('+++ Generate render')) {
        emitRenderPointBigNum(precision);
    } else {
        outLines.push(inputLine);
    }
});

const outPath = path.resolve(assemblyPath, 'generated', 'renderMandelbrot.ts');
fs.mkdirSync(path.dirname(outPath), {recursive: true});
fs.writeFileSync(outPath, Buffer.from(outLines.join('\n')));

function emitGlobalDeclarations(precision) {
    emitDecl(['xMin', 'w', 'yMin', 'h'], precision, true);
    emitDecl(['yMax', 'wStepFraction', 'hStepFraction'], precision);
}

function emitInitialization(precision) {
    emitArithVarsDecl();
    emitDecl('t_', precision);
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
}

function emitRenderPointBigNum(precision) {
    // declarations
    emit(
        'function renderPointBigNum(pX: u32, pY: u32): u16 {',
    );

    emitDecl(['x', 'y', 'xPos', 'yPos', 'x0_', 'y0_', 't0_', 't1_', 't2_'], precision);

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

    emit('return i as u16;');

    emit('}');
}

export function emitFromPosDouble(a, c, precision) {
    emit(`// double ${a} to BigNum ${c}`)
    rangeFromTo(0, precision - 1).forEach(i => emit(
        `${c}${i} = (${a} as u32);`,
        (precision - 1 - i) ? `${a} = (${a} - (${a} as u32)) * 0x1_0000_0000;` : null,
    ));
    emit('');
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

function emitArithVarsDecl() {
    emit(
        'let cOut: u64;',
        'let m: u64;',
        'let curr: u64 = 0;',
        'let next: u64 = 0;',
        '',
    );
}

function emitDecl(names, precision, isExport = false) {
    (typeof names === 'string' ? [names] : names).forEach(
        name => rangeFromTo(0, precision - 1).forEach(
            i => emit(`${isExport ? 'export ' : '' }let ${name}${i}: u64;`)
        )
    );
}

function emitSetZero(names, precision) {
    names.forEach(name => rangeFromTo(0, precision - 1).forEach(i => emit(`${name}${i} = 0;`)));
}

/**
 * @return {number[]}
 */
function rangeFromTo(from, toInclusive) {
    const length = Math.abs(toInclusive - from) + 1;
    const step = toInclusive > from ? 1 : -1;
    return Array.from({length}).map((_, i) => from + step * i);
}
