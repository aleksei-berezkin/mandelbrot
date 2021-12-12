import fs from 'fs';

const startMarker = '// Start of transpiled region';
const endMarker = '// End of transpiler region';

export function readFile(path) {
    const lines = String(fs.readFileSync(path)).split('\n');
    const startMarkerIx =  lines.findIndex(l => l.includes(startMarker));
    const endMarkerIx = lines.findIndex(l => l.includes(endMarker));
    if (startMarkerIx === -1 || endMarkerIx === -1) {
        throw new Error(`Cannot parse ${path}`);
    }

    return {
        before: lines.slice(0, startMarkerIx).join('\n'),
        transpiled: lines.slice(startMarkerIx, endMarkerIx).join('\n'),
        after: lines.slice(endMarkerIx).join('\n'),
    };
}

export function writeFile(path, regions) {
    const {before, transpiled, after} = regions;
    fs.writeFileSync(
        path,
        `${before}\n${startMarker}\n${transpiled}\n${endMarker}\n${after}`,
    );
}
