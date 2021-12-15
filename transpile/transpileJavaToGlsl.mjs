/**
 * @param java {string}
 * @return {string}
 */
export function transpileJavaToGlsl(java) {
    const str0 = java.replaceAll(
        /^ {4}|\n {4}|static |boolean|double|new long\[_SZ_]|long\[] |long |(0x)?[0-9a-f_]+L/g,
        s => {
            switch (s) {
                case '    ':
                    return '';
                case '\n    ':
                    return '\n';
                case 'static ':
                    return '';
                case 'boolean':
                    return 'bool'
                case 'double':
                    return 'float'
                case 'new long[_SZ_]':
                    return 'uint[_SZ_](_ARR_INIT_)';
                case 'long[] ':
                    return 'uint[_SZ_] ';
                case 'long ':
                    return 'uint ';
                default:
                    if (s.endsWith('L')) {
                        return `${s.replaceAll(/[_L]/g, '')}u`;
                    }
                    throw new Error(s);
            }
        }
    );
    return str0
        .split('\n')
        .filter(s => !s.includes('@Suppress')
            && !s.includes('// noinspection')
            && !s.includes('don\'t transpile'
        ))
        .join('\n');
}
