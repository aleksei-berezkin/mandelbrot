let indent = 1;

export function emit(...strings) {
    for (const s of strings) {
        indent -= countChars(s, '}');
        const indentSpaces = Array.from({length: 2 * indent}).map(() => ' ').join('');
        console.info(indentSpaces + s);
        indent += countChars(s, '{');
    }
}

function countChars(string, char) {
    return [...string].filter(c => c === char).length;
}
