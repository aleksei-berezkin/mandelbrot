import { emit } from './emit.mjs';

generateMul(5);

function generateMul(precision) {
    emit(
        'let cOut: u64;', ''
    );
    // Load and decode 2's complement
    ['a', 'b'].forEach(op => {
        range0to(precision).forEach(i =>
            emit(
                `let ${op}${i} = load<u32>(${op}Ptr + ${4 * i}) as u64;`
            )
        );
        emit(
            `const ${op}IsNeg = ${op}0 & 0x8000_0000;`
        );
        emit(
            `if (${op}IsNeg) {`,
            'cOut = 1;',
        )
        rangeDownto(precision).forEach(i => {
            emit(`${op}${i} = (${op}${i} ^ 0xffff_ffff) + cOut;`);
            if (i) {
                emit(`cOut = ${op}${i} >>> 32;`);
            }
            emit(`${op}${i} = ${op}${i} & 0xffff_ffff;`);
        });
        emit('}');
    })
}

/*
  let cOut: u64;

  let a0 = load<u32>(aPtr) as u64;
  let a1 = load<u32>(aPtr + 4) as u64;
  let a2 = load<u32>(aPtr + 8) as u64;
  const aIsNeg = a0 & 0x8000_0000;
  if (aIsNeg) {
    cOut = 1;

    a2 = (a2 ^ 0xffff_ffff) + cOut;
    cOut = a2 >>> 32;
    a2 = a2 & 0xffff_ffff;

    a1 = (a1 ^ 0xffff_ffff) + cOut;
    cOut = a1 >>> 32;
    a1 = a1 & 0xffff_ffff;

    a0 = (a0 ^ 0xffff_ffff) + cOut;
    a0 = a0 & 0xffff_ffff;
  }

  const same = aPtr === bPtr;
  let b0 = same ? a0 : load<u32>(bPtr) as u64;
  let b1 = same ? a1 : load<u32>(bPtr + 4) as u64;
  let b2 = same ? a2 : load<u32>(bPtr + 8) as u64;

  const bIsNeg = same ? aIsNeg : (b0 & 0x8000_0000);
  if (bIsNeg && !same) {
    cOut = 1;

    b2 = (b2 ^ 0xffff_ffff) + cOut;
    cOut = b2 >>> 32;
    b2 = b2 & 0xffff_ffff;

    b1 = (b1 ^ 0xffff_ffff) + cOut;
    cOut = b1 >>> 32;
    b1 = b1 & 0xffff_ffff;

    b0 = (b0 ^ 0xffff_ffff) + cOut;
    b0 = b0 & 0xffff_ffff;
  }

  const cIsNeg = aIsNeg !== bIsNeg;
  cOut = 1;

 */
function range0to(bound) {
    return Array.from({length: bound}).map((_, i) => i);
}

function rangeDownto(bound) {
    return range0to(bound).reverse();
}
