#!/usr/bin/env node

import { readdir, rm } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CASE_DIR = resolve(ROOT, 'public', 'case');
const IMAGE_EXTENSIONS = new Set([
  '.apng',
  '.avif',
  '.bmp',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.tif',
  '.tiff',
  '.webp',
]);

const shouldDelete = process.argv.includes('--yes');

async function collectImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const images = [];

  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      images.push(...await collectImages(path));
      continue;
    }

    if (entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      images.push(path);
    }
  }

  return images;
}

async function main() {
  const images = await collectImages(CASE_DIR);

  if (!shouldDelete) {
    console.log(`Dry run: found ${images.length} image files under ${CASE_DIR}`);
    console.log('Run `npm run clean:case-images -- --yes` to delete them.');
    return;
  }

  await Promise.all(images.map((image) => rm(image)));
  console.log(`Deleted ${images.length} image files under ${CASE_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
