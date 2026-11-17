const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const buildConfig = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  external: ['electron', 'better-sqlite3'],
};

async function build() {
  console.log('[esbuild] Building Electron Main & Preload...');

  try {
    // 1. Build Main Process
    await esbuild.build({
      ...buildConfig,
      entryPoints: [path.join(__dirname, 'src/main/main.ts')],
      outfile: path.join(__dirname, 'dist-electron/main.js'),
    });

    // 2. Build Preload Script
    await esbuild.build({
      ...buildConfig,
      entryPoints: [path.join(__dirname, 'src/preload/preload.ts')],
      outfile: path.join(__dirname, 'dist-electron/preload.js'),
    });

    console.log('[esbuild] Electron compilation finished successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[esbuild] Build error:', err);
    process.exit(1);
  }
}

build();
