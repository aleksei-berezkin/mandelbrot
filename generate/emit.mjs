let indent = 0;

let emitCb = str => console.info(str);

export function setEmitCb(_emitCb) {
    emitCb = _emitCb;
}

export function emit(...strings) {
    strings.filter(s => s != null).map(s => s.trim()).forEach(s => {
        indent -= countChars(s, '}');
        const indentSpaces = Array.from({length: 2 * indent}).map(() => ' ').join('');
        emitCb(indentSpaces + s);
        indent += countChars(s, '{');
        if (s.includes('case ') || s === 'default:') indent++;
        // if (s === 'break;') indent--;
    });
}

export function withIndented(indentDelta, cb) {
    indent += indentDelta;
    cb();
    indent -= indentDelta;
}
function countChars(string, char) {
    return [...string].filter(c => c === char).length;
}
