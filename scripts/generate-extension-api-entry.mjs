import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const apiModulesDir = path.join(rootDir, 'MoeKoeMusic', 'api', 'module');
const generatedDir = path.join(rootDir, 'extension', 'api', 'generated');
const generatedJsPath = path.join(generatedDir, 'modules.cjs');

function toRoute(moduleName) {
  return `/${moduleName.replace(/_/g, '/')}`;
}

function createModulesJs(moduleNames) {
  const lines = [
    "'use strict';",
    '',
    'const generatedModuleNames = Object.freeze([',
    ...moduleNames.map((name) => `  '${name}',`),
    ']);',
    '',
    'const routes = Object.freeze({',
    ...moduleNames.map((name) => `  ${JSON.stringify(toRoute(name))}: '${name}',`),
    '});',
    '',
    'const modules = {',
    ...moduleNames.map(
      (name) =>
        `  ${JSON.stringify(name)}: (params, useAxios) => require(${JSON.stringify(`../../../MoeKoeMusic/api/module/${name}.js`)})(params, useAxios),`
    ),
    '};',
    '',
    'module.exports = { generatedModuleNames, routes, modules };',
    '',
  ];

  return lines.join('\n');
}

async function main() {
  const entries = await fs.readdir(apiModulesDir, { withFileTypes: true });
  const moduleNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js') && !entry.name.startsWith('_'))
    .map((entry) => entry.name.replace(/\.js$/i, ''))
    .sort((left, right) => left.localeCompare(right));

  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(generatedJsPath, createModulesJs(moduleNames), 'utf8');

  console.log(`generated ${moduleNames.length} extension api route wrappers`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

