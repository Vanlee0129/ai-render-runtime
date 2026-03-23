const esbuild = require('esbuild');
const path = require('path');

async function runTests() {
  const testFile = process.argv[2];

  if (!testFile) {
    console.error('Usage: node test/run.js <test-file>');
    process.exit(1);
  }

  try {
    await esbuild.build({
      entryPoints: [testFile],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: '/tmp/test-bundle.js',
      sourcemap: true,
    });

    // Run the bundled test
    require('/tmp/test-bundle.js');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTests();
