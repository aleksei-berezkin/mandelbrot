import { emit } from './emit.mjs';

const minPrecision = 2;
const maxPrecision = 10;

emit(
    'export function mul(aPtr: u32, bPtr: u32, cPtr: u32, tPtr: u32): void {',
    'switch (precision) {'
);
rangeFromTo(minPrecision, maxPrecision).forEach(precision => {
    emit(
        `case ${precision}:`,
        `mul${precision}(aPtr, bPtr, cPtr);`,
        'break;'
    )
});
emit(
    'default:',
    'mulGeneral(aPtr, bPtr, cPtr, tPtr);',
    'break;'
);
emit('}', '}', '');

rangeFromTo(minPrecision, maxPrecision).forEach(precision => emitMul(precision));

function emitMul(precision) {
    emit(
        `function mul${precision}(aPtr: u32, bPtr: u32, cPtr: u32): void {`,
        'let cOut: u64;',
        '',
    );
    // Load a
    rangeFromTo(0, precision - 1).forEach(i => emit(
        `let a${i} = ${getLoadStr('a', i)};`
    ));
    emit(
        `const aIsNeg = a0 & 0x8000_0000;`,
        `if (aIsNeg) {`,
    );
    emitDecode2sComplement('a', precision);
    emit(
        '}',
        '',
        'const same = aPtr === bPtr;',
    );
    // Load b
    rangeFromTo(0, precision - 1).forEach(i => emit(
        `let b${i} = same ? a${i} : ${getLoadStr('b', i)};`
    ));
    emit(
        'const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000);',
        'if (!same && bIsNeg) {',
    );
    emitDecode2sComplement('b', precision);
    emit('}');
    emit(
        'const cIsNeg = aIsNeg !== bIsNeg;',
        '',
        'cOut = 1;',
        'let curr: u64 = 0;',
        'let next: u64 = 0;',
        'let m: u64;',
        '',
    );
    rangeFromTo(precision, 0).forEach(cIx => {
        emit(`// c${cIx}`);
        const fromAIx = cIx === precision ? 1 : 0;
        const toAIx = Math.min(precision - 1, cIx);
        rangeFromTo(fromAIx, toAIx).map(aIx => {
            const bIx = cIx - aIx;
            const skipCheckOverflow = cIx === precision && aIx === 1 || cIx === 0;
            emit(
                `m = a${aIx} * b${bIx};`,
                `curr += m;`,
                skipCheckOverflow ? null : `if (curr < m) next += 0x1_0000_0000;`,
                '',
            );
        });

        if (cIx !== precision) {
            const offsetStr = cIx ? ` + ${4 * cIx}` : '';
            emit(
                'if (cIsNeg) {',
                '  m = ((curr & 0xffff_ffff) ^ 0xffff_ffff) + cOut;',
                '  cOut = m >>> 32;',
                '} else {',
                '  m = curr;',
                '}',
                `store<u32>(cPtr${offsetStr}, m as u32);`,
            );
        }

        if (cIx !== 0) {
            emit(
                'curr = curr >>> 32 | next;',
                'next = 0;',
            )
            emit('');
        }
    });
    emit('}');
}

function getLoadStr(op, i) {
    const offsetStr = i ? ` + ${4 * i}` : '';
    return `load<u32>(${op}Ptr${offsetStr}) as u64`
}

function emitDecode2sComplement(op, precision) {
    emit('cOut = 1;');
    rangeFromTo(precision - 1, 0).forEach(i => {
        emit(`${op}${i} = (${op}${i} ^ 0xffff_ffff) + cOut;`);
        if (i) {
            emit(`cOut = ${op}${i} >>> 32;`);
        }
        emit(`${op}${i} &= 0xffff_ffff;`);
    });
}

/**
 * @return {number[]}
 */
function rangeFromTo(from, toInclusive) {
    const length = Math.abs(toInclusive - from) + 1;
    const step = toInclusive > from ? 1 : -1;
    return Array.from({length}).map((_, i) => from + step * i);
}
