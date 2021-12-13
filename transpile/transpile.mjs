import path from 'path';
import url from 'url';
import { readAroundTranspiledRegion, readTranspiledRegion, writeFile } from './readWriteFiles.mjs';
import { transpileJavaToGlsl } from './transpileJavaToGlsl.mjs';
import { transpileJavaToJs } from './transpileJavaToJs.mjs';

const dirname = url.fileURLToPath(path.dirname(import.meta.url));

const inputDir = path.join(dirname, '..', 'bignum', 'src', 'main', 'java', 'bignum');
const outJsDir = path.join(dirname, '..', 'public');
const outShaderDir = path.join(outJsDir, 'shader');

readTranspileWrite(
    path.join(inputDir, 'BigNum.java'),
    transpileJavaToGlsl,
    path.join(outShaderDir, 'fragment.shader'),
);

readTranspileWrite(
    path.join(inputDir, 'BigNumJs.java'),
    transpileJavaToJs,
    path.join(outJsDir, 'bigNum.js'),
);

function readTranspileWrite(inputPath, transpiler, outputPath) {
    const toBeTranspiled = readTranspiledRegion(inputPath);
    const {before, after} = readAroundTranspiledRegion(outputPath);
    const transpiled = transpiler(toBeTranspiled);
    writeFile(outputPath, {before, transpiled, after});
}
