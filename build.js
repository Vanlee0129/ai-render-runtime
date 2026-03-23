const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: false,
  minify: false,
}).then(() => {
  console.log('Build complete: dist/bundle.js');
}).catch(() => process.exit(1));
