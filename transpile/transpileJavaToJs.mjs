/**
 * @param java {string}
 * @return {string}
 */
export function transpileJavaToJs(java) {
    const funcSignature = /static long\[] (\w+)\(([\w ,]+)\)/.exec(java);
    const funcName = funcSignature[1];
    const funcArgs = funcSignature[2]
        .split(/,\s*/)
        .map(s => s.split(/ +/)[1]) // Remove type
        .join(', ');
    const s0 = java.replace(funcSignature[0], `export function ${funcName}(${funcArgs})`);

    const s1 = s0.replaceAll(
        /^ {4}|\n {4}|"|public static int |BigInteger.[ZERONTW]+|IllegalArgumentException|int |long |boolean |BigInteger |\.size\(\)|new ArrayList<>\(\)|final [boleangList<>]+|(!=|==) *\d+|\d+L/g,
        s => {
            switch (s) {
                case '    ':
                    return '';
                case '\n    ':
                    return '\n';
                case '"':
                    return '\'';
                case 'public static int ':
                    return 'const ';
                case 'BigInteger.ZERO':
                    return '0n';
                case 'BigInteger.ONE':
                    return '1n';
                case 'BigInteger.TWO':
                    return '2n';
                case 'IllegalArgumentException':
                    return 'Error';
                case 'int ':
                case 'long ':
                case 'boolean ':
                case 'BigInteger ':
                    return 'let ';
                case '.size()':
                    return '.length';
                case 'new ArrayList<>()':
                    return '[]';
                default:
                    if (s.startsWith('final')) {
                        return 'const';
                    }
                    if (s.startsWith('!=') || s.startsWith('==')) {
                        return s.replace('=', '==');
                    }
                    if (s.endsWith('L')) {
                        return s.slice(0, s.length - 1);
                    }
                    throw new Error(s);
            }
        },
    );

    const s2 = s1.replaceAll(
        /(\w+)\.compareTo\((\w+)\) ([!><=]+) 0/g,
        (s, g1, g2, g3) => `${g1} ${g3} ${g2}`
    );

    const s3 = s2.replaceAll(
        /(\w+)\.(negate|divide|subtract|remainder)\((\w*)\)/g,
        (s, g1, g2, g3) => {
            switch (g2) {
                case 'negate':
                    return `-${g1}`;
                case 'divide':
                    return `${g1} / ${g3}`;
                case 'subtract':
                    return `${g1} - ${g3}`;
                case 'remainder':
                    return `${g1} % ${g3}`;
            }
        }
    );

    const s4 = s3.replaceAll(
        /Collections\.reverse\((\w+)\)/g,
        (s, g1) => `${g1}.reverse()`
    );

    const s5 = s4.replaceAll(
        /(\w+)\.add\((\w+)\)/g,
        (s, g1, g2) => `${g1}.push(${g2})`,
    );

    const s6 = s5.replaceAll(
        /(\w+)\.get\((\w+)\)/g,
        (s, g1, g2) => `${g1}[${g2}]`,
    );

    const s7 = s6.replaceAll(
        /(\w+)\.set\((\w+), ([^)]+)\)/g,
        (s, g1, g2, g3) => `${g1}[${g2}] = ${g3}`,
    );

    return s7.replaceAll(
        /toArray\((\w+)\)/g,
        (s, g1) => g1,
    );
}
