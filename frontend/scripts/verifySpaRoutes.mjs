import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const appPath = fileURLToPath(new URL('../src/App.jsx', import.meta.url));
const controllerPath = fileURLToPath(new URL('../../src/main/java/com/selfforge/discipline/common/SpaController.java', import.meta.url));

function quotedPaths(source) {
  return [...source.matchAll(/"(\/[^"\\]*)"/g)].map(([, path]) => path);
}

function sortedUnique(paths) {
  return [...new Set(paths)].sort();
}

const [app, controller] = await Promise.all([
  readFile(appPath, 'utf8'),
  readFile(controllerPath, 'utf8'),
]);

const frontendRoutes = sortedUnique(
  [...app.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map(([, path]) => path)
    .filter((path) => path !== '*'),
);
const mapping = controller.match(/@GetMapping\(value\s*=\s*\{([\s\S]*?)\}\)/);

if (!mapping) {
  throw new Error('Could not find the SPA route list in SpaController.java.');
}

const backendRoutes = sortedUnique(quotedPaths(mapping[1]));
const onlyFrontend = frontendRoutes.filter((path) => !backendRoutes.includes(path));
const onlyBackend = backendRoutes.filter((path) => !frontendRoutes.includes(path));

if (onlyFrontend.length || onlyBackend.length) {
  const details = [
    onlyFrontend.length ? `React routes missing from SpaController: ${onlyFrontend.join(', ')}` : '',
    onlyBackend.length ? `SpaController routes missing from React: ${onlyBackend.join(', ')}` : '',
  ].filter(Boolean).join('\n');
  throw new Error(`SPA route parity check failed.\n${details}`);
}

console.log(`SPA route parity verified (${frontendRoutes.length} routes).`);
