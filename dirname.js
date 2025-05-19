import path from 'path';

let fileURLToPath;
try {
  // Only import if available (Node.js)
  ({ fileURLToPath } = await import('url'));
} catch {
  // Not available in browser/test envs
  fileURLToPath = undefined;
}

/**
 * Returns ESM-compatible __dirname based on the provided import.meta.
 * @param {ImportMeta} meta - The import.meta object from the caller
 * @returns {string} - The directory name of the module file
 */
export function getDirname(meta) {
  if (typeof fileURLToPath !== 'function') {
    // Fallback for test/browser: return '/' or ''
    return '/';
  }
  return path.dirname(fileURLToPath(meta.url));
}