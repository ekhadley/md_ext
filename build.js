const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist/fonts', { recursive: true });

esbuild.buildSync({
  entryPoints: ['src/content.js'],
  bundle: true,
  outfile: 'dist/content.js',
  format: 'iife',
  loader: { '.css': 'text' },
  platform: 'browser',
});

fs.copyFileSync('manifest.json', 'dist/manifest.json');
fs.copyFileSync('themes.json', 'dist/themes.json');

const katexFonts = path.join('node_modules', 'katex', 'dist', 'fonts');
for (const f of fs.readdirSync(katexFonts)) {
  if (f.endsWith('.woff2')) {
    fs.copyFileSync(path.join(katexFonts, f), path.join('dist', 'fonts', f));
  }
}

console.log('Build complete -> dist/');
