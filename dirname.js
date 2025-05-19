import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Returns ESM-compatible __dirname based on the provided import.meta.
 * @param {ImportMeta} meta - The import.meta object from the caller
 * @returns {string} - The directory name of the module file
 */
export function getDirname(meta) {
  if (typeof fileURLToPath !== 'function') {
    throw new Error('fileURLToPath is not a function. Check your Node.js version and test environment.');
  }
  return path.dirname(fileURLToPath(meta.url));
}