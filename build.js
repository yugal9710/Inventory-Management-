const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

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

// Helper to download pre-built production files from GitHub RAW if needed
function downloadFromGitHubRaw(relPath, destPath) {
  return new Promise((resolve) => {
    const url = `https://raw.githubusercontent.com/yugal9710/Inventory-Management-/main/${relPath}`;
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✓ Restored ${relPath} from GitHub RAW`);
          resolve(true);
        });
      } else {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        console.warn(`⚠️ Could not download ${relPath} (Status ${res.statusCode})`);
        resolve(false);
      }
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      console.warn(`⚠️ Download error for ${relPath}:`, err.message);
      resolve(false);
    });
  });
}

async function ensureAllAssets() {
  const assets = [
    { rel: 'build/index.html', dest: path.join(BUILD_DIR, 'index.html') },
    { rel: 'build/favicon.svg', dest: path.join(BUILD_DIR, 'favicon.svg') },
    { rel: 'build/icons.svg', dest: path.join(BUILD_DIR, 'icons.svg') },
    { rel: 'build/assets/index-BRF00aCW.js', dest: path.join(BUILD_DIR, 'assets/index-BRF00aCW.js') },
    { rel: 'build/assets/index-DmAeWIUK.css', dest: path.join(BUILD_DIR, 'assets/index-DmAeWIUK.css') },
  ];

  for (const item of assets) {
    if (!fs.existsSync(item.dest)) {
      await downloadFromGitHubRaw(item.rel, item.dest);
    }
  }

  // Ensure frontend/dist also has a copy
  if (!fs.existsSync(FRONTEND_DIST)) fs.mkdirSync(FRONTEND_DIST, { recursive: true });
  if (fs.existsSync(BUILD_DIR)) {
    fs.cpSync(BUILD_DIR, FRONTEND_DIST, { recursive: true });
  }
}

async function run() {
  // Check if build/index.html is already present
  if (fs.existsSync(path.join(BUILD_DIR, 'index.html'))) {
    console.log('✓ Verified production bundle in "build/" directory.');
    await ensureAllAssets();
    console.log('\n====================================================');
    console.log('🎉 Production frontend ready! Deploying Nepal Iron Store...');
    console.log('====================================================');
    process.exit(0);
  }

  // Check if frontend/dist/index.html is present
  if (fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
    console.log('✓ Found frontend/dist bundle. Copying to "build/"...');
    if (fs.existsSync(BUILD_DIR)) fs.rmSync(BUILD_DIR, { recursive: true, force: true });
    fs.mkdirSync(BUILD_DIR, { recursive: true });
    fs.cpSync(FRONTEND_DIST, BUILD_DIR, { recursive: true });
    console.log('\n====================================================');
    console.log('🎉 Production frontend ready! Deploying Nepal Iron Store...');
    console.log('====================================================');
    process.exit(0);
  }

  // If neither is present, try git recovery
  console.log('⚠️ Pre-built bundle not found in worktree. Attempting git recovery from origin/main...');
  try {
    execSync('git fetch origin main --depth=1', { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync('git reset --hard origin/main', { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync('git checkout -f origin/main', { cwd: ROOT_DIR, stdio: 'inherit' });
  } catch (gErr) {
    console.warn('Git recovery note:', gErr.message);
  }

  // If still not present, download directly from GitHub RAW
  if (!fs.existsSync(path.join(BUILD_DIR, 'index.html'))) {
    console.log('Downloading production assets directly from GitHub...');
    await ensureAllAssets();
  }

  console.log('\n====================================================');
  console.log('🎉 Production frontend ready! Deploying Nepal Iron Store...');
  console.log('====================================================');
  process.exit(0);
}

run();
