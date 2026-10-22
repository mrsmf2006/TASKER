import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
const distAssets = path.join(repo, 'dist', 'assets');
const publishedAssets = path.join(repo, 'assets');
const builtHtml = path.join(repo, 'dist', 'index.dev.html');

if (!existsSync(builtHtml) || !existsSync(distAssets)) {
  throw new Error('dist output is missing. vite build did not produce index.dev.html');
}

const nextNames = new Set(await readdir(distAssets));
await mkdir(publishedAssets, { recursive: true });
for (const name of await readdir(publishedAssets)) {
  if (!nextNames.has(name) && /\.(js|css)$/.test(name)) {
    await rm(path.join(publishedAssets, name));
  }
}
for (const name of nextNames) {
  await copyFile(path.join(distAssets, name), path.join(publishedAssets, name));
}

const html = await readFile(builtHtml, 'utf8');
await writeFile(path.join(repo, 'index.html'), html);
