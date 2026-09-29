import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const sourcePath = new URL('../src/better-mobile-table.js', import.meta.url);
const cssSourcePath = new URL('../src/better-mobile-table.css', import.meta.url);
const distPath = new URL('../dist/', import.meta.url);

await mkdir(distPath, { recursive: true });

const source = await readFile(sourcePath, 'utf8');
const esm = source.replace(/\s*if \(typeof window !== 'undefined'\) \{\n  window\.BetterMobileTable = BetterMobileTable;\n\}\n\nexport default BetterMobileTable;\nexport \{ BetterMobileTable \};\s*$/, '\n\nexport default BetterMobileTable;\nexport { BetterMobileTable };\n');

if (esm === source) {
  throw new Error('Could not remove the source module export block. Update scripts/build.mjs for the current source format.');
}

const iife = `(function (global) {\n${esm.replace(/\nexport default BetterMobileTable;\nexport \{ BetterMobileTable \};\n?$/, '\n')}\nglobal.BetterMobileTable = BetterMobileTable;\n})(typeof window !== "undefined" ? window : globalThis);\n`;

await writeFile(new URL('better-mobile-table.esm.js', distPath), esm);
await writeFile(new URL('better-mobile-table.iife.js', distPath), iife);
await copyFile(cssSourcePath, new URL('better-mobile-table.css', distPath));

console.log('Built dist/better-mobile-table.{esm.js,iife.js,css}');
