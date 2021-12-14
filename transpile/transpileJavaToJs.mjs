/**
 * @param java {string}
 * @return {string}
 */
export function transpileJavaToJs(java) {
    const funcSign = /static long\[] (\w+)\(([\w ,]+)\)/.exec(java);
    const funcName = funcSign[1];
    const funcArgs = funcSign[2]
        .split(/,\s*/)
        .map(s => s.split(/ +/)[1]) // Remove type
        .join(', ');
    const s0 = java.replace(funcSign[0], `function ${funcName}(${funcArgs})`);

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

    const compRe = /(\w+)\.compareTo\((\w+)\) ([!><=]+) 0/;
    const s2 = s1.replaceAll(
        new RegExp(compRe, 'g'),
        s => {
            const m = compRe.exec(s);
            return `${m[1]} ${m[3]} ${m[2]}`;
        }
    );

    const opRe = /(\w+)\.(negate|divide|subtract|remainder)\((\w*)\)/;
    const s3 = s2.replaceAll(
        new RegExp(opRe, 'g'),
        s => {
            const m = opRe.exec(s);
            if (!m) {
                return s;
            }
            switch (m[2]) {
                case 'negate':
                    return `-${m[1]}`;
                case 'divide':
                    return `${m[1]} / ${m[3]}`;
                case 'subtract':
                    return `${m[1]} - ${m[3]}`;
                case 'remainder':
                    return `${m[1]} % ${m[3]}`;
            }
        }
    )


    const reverseRe = /Collections\.reverse\((\w+)\)/;
    const s4 = s3.replaceAll(
        new RegExp(reverseRe, 'g'),
        s => {
            const m = reverseRe.exec(s);
            return `${m[1]}.reverse()`;
        }
    )

    const addRe = /(\w+)\.add\((\w+)\)/
    const s5 = s4.replaceAll(
        new RegExp(addRe, 'g'),
        s => {
            const m = addRe.exec(s);
            return `${m[1]}.push(${m[2]})`;
        }
    )

    return s5;
}
