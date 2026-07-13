import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { build as buildWithEsbuild } from 'esbuild';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const distDir = path.join(rootDir, 'dist', 'extension');
const appDistDir = path.join(distDir, 'app');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
      }
    });
  });
}

async function copyFileIfExists(source, target) {
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function patchExtensionIndexHtml() {
  const indexPath = path.join(appDistDir, 'index.html');
  const html = await fs.readFile(indexPath, 'utf8');
  const patched = html.replace(
    /\s*<script>\s*const getBrowserLocale = \(\) => \{[\s\S]*?document\.documentElement\.lang = settings\?\.language \|\| getBrowserLocale\(\);\s*<\/script>/,
    '\n    <script src="./locale-init.js"></script>'
  );

  await fs.writeFile(indexPath, patched, 'utf8');
}

async function main() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(appDistDir, { recursive: true });

  await run('node', [path.join('scripts', 'generate-extension-api-entry.mjs')]);
  await run('npx', ['vite', 'build', '--config', path.join('extension', 'vite.extension.config.mjs')]);
  await patchExtensionIndexHtml();

  await buildWithEsbuild({
    entryPoints: [path.join(rootDir, 'extension', 'api', 'service-worker.cjs')],
    bundle: true,
    outfile: path.join(distDir, 'service-worker.js'),
    format: 'iife',
    platform: 'browser',
    target: ['chrome116'],
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    alias: {
      axios: path.join(rootDir, 'extension', 'api', 'axios-fetch.cjs'),
      url: path.join(rootDir, 'extension', 'api', 'url.cjs'),
    },
  });

  await fs.copyFile(path.join(rootDir, 'extension', 'manifest.json'), path.join(distDir, 'manifest.json'));
  await fs.copyFile(path.join(rootDir, 'extension', 'app', 'locale-init.js'), path.join(appDistDir, 'locale-init.js'));
  await copyFileIfExists(
    path.join(rootDir, 'MoeKoeMusic', 'public', 'assets', 'images', 'logo.png'),
    path.join(distDir, 'icons', 'logo.png')
  );

  console.log(`extension build complete: ${path.relative(rootDir, distDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
