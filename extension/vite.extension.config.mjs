import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(extensionDir, '..');
const appDir = path.join(rootDir, 'MoeKoeMusic');
const appPackage = JSON.parse(await fs.readFile(path.join(appDir, 'package.json'), 'utf8'));

function removePwaRegistration(code) {
  return code
    .replace(/import\s+\{\s*registerSW\s*\}\s+from\s+['"]virtual:pwa-register['"];?\s*/g, '')
    .replace(/if\s*\(\s*!window\.electron\s*&&\s*!import\.meta\.env\.DEV\s*\)\s*\{\s*registerSW\(\s*\{[\s\S]*?\}\s*\)\s*\}\s*/g, '');
}

function addExtensionAdapterImport(code) {
  if (code.includes('@moekoe-extension/api-adapter')) {
    return code;
  }

  return code.replace(
    /(import\s+\{\s*getApiBaseUrl\s*\}\s+from\s+['"][^'"]+apiBaseUrl['"];?)/,
    `$1\nimport { canUseExtensionApi, createExtensionApiAdapter } from '@moekoe-extension/api-adapter';`
  );
}

function addAxiosAdapter(code) {
  if (code.includes('createExtensionApiAdapter()')) {
    return code;
  }

  return code.replace(
    /(axios\.create\(\{\s*)/,
    `$1\n    adapter: canUseExtensionApi() ? createExtensionApiAdapter() : undefined,`
  );
}

function moekoeExtensionPatch() {
  return {
    name: 'moekoe-extension-patch',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.split(path.sep).join('/');

      if (normalizedId.endsWith('/src/main.js')) {
        return { code: removePwaRegistration(code), map: null };
      }

      if (normalizedId.endsWith('/src/utils/request.js') || normalizedId.endsWith('/src/stores/store.js')) {
        return { code: addAxiosAdapter(addExtensionAdapterImport(code)), map: null };
      }

      return null;
    },
  };
}

export default defineConfig({
  root: appDir,
  base: '',
  plugins: [moekoeExtensionPatch(), vue()],
  define: {
    __VERSION__: JSON.stringify(appPackage.version),
  },
  resolve: {
    alias: {
      '@': path.join(appDir, 'src'),
      '@moekoe-extension/api-adapter': path.join(rootDir, 'extension', 'app', 'api-adapter.js'),
    },
  },
  build: {
    outDir: path.join(rootDir, 'dist', 'extension', 'app'),
    emptyOutDir: false,
  },
});

