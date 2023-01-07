import { emit } from './emit.mjs';

generateMul(5);

function generateMul(precision) {
    emit(
        `function mul${precision}(aPtr: u32, bPtr: u32, cPtr: u32): void {`,
        'let cOut: u64;',
        '',
    );
    // Load a
    range0to(precision).forEach(i => emit(
        `let a${i} = ${getLoadStr('a', i)};`
    ));
    emit(
        `const aIsNeg = a0 & 0x8000_0000;`,
        `if (aIsNeg) {`,
    );
    emitDecode2sComplement('a', precision);
    emit(
        '}',
        'const same = aPtr === bPtr;',
    );
    // Load b
    range0to(precision).forEach(i => emit(
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
        'cOut = 1;'
    );
    emit('}');
}

function getLoadStr(op, i) {
    const offsetStr = i ? ` + ${4 * i}` : '';
    return `load<u32>(${op}Ptr${offsetStr}) as u64;`
}

function emitDecode2sComplement(op, precision) {
    emit('cOut = 1;');
    rangeDownto(precision).forEach(i => {
        emit(`${op}${i} = (${op}${i} ^ 0xffff_ffff) + cOut;`);
        if (i) {
            emit(`cOut = ${op}${i} >>> 32;`);
        }
        emit(`${op}${i} &= 0xffff_ffff;`);
    });
}

function range0to(bound) {
    return Array.from({length: bound}).map((_, i) => i);
}

function rangeDownto(bound) {
    return range0to(bound).reverse();
}
