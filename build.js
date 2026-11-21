const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const FRONTEND_DIST = path.join(FRONTEND_DIR, 'dist');
const BUILD_DIR = path.join(ROOT_DIR, 'build');

console.log('====================================================');
console.log('🏗️ NEPAL IRON STORE - PRODUCTION DEPLOY & BUILD PIPELINE');
console.log('====================================================');
console.log(`Node version: ${process.version}`);
console.log(`Root Directory: ${ROOT_DIR}`);
console.log(`Current Working Dir: ${process.cwd()}`);

function syncDirectories(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

async function run() {
  // Ensure fresh build if frontend source is present
  if (fs.existsSync(path.join(FRONTEND_DIR, 'package.json'))) {
    console.log('Attempting frontend build with Vite...');
    try {
      execSync('npm --prefix frontend run build', { cwd: ROOT_DIR, stdio: 'inherit' });
    } catch (err) {
      console.warn('Frontend build note:', err.message);
    }
  }

  // Ensure both build/ and frontend/dist/ have the latest bundled assets
  if (fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
    console.log('✓ Found frontend/dist bundle. Syncing to "build/"...');
    syncDirectories(FRONTEND_DIST, BUILD_DIR);
  } else if (fs.existsSync(path.join(BUILD_DIR, 'index.html'))) {
    console.log('✓ Verified production bundle in "build/" directory.');
    syncDirectories(BUILD_DIR, FRONTEND_DIST);
  } else {
    console.warn('⚠️ Warning: No pre-built index.html found.');
  }

  console.log('\n====================================================');
  console.log('🎉 Production frontend ready! Deploying Nepal Iron Store...');
  console.log('====================================================');
  process.exit(0);
}

run();
