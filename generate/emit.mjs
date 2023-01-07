let indent = 0;

export function emit(...strings) {
    strings.filter(s => s != null).map(s => s.trim()).forEach(s => {
        indent -= countChars(s, '}');
        const indentSpaces = Array.from({length: 2 * indent}).map(() => ' ').join('');
        console.info(indentSpaces + s);
        indent += countChars(s, '{');
        if (s.includes('case ') || s === 'default:') indent++;
        if (s === 'break;') indent--;
    });
}

function countChars(string, char) {
    return [...string].filter(c => c === char).length;
}
