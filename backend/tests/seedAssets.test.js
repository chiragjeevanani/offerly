import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const SEEDERS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/seeders');
const ASSETS_DIR = path.join(SEEDERS_DIR, 'assets');

const seederSources = fs
  .readdirSync(SEEDERS_DIR)
  .filter((file) => file.endsWith('.js'))
  .map((file) => ({ file, source: fs.readFileSync(path.join(SEEDERS_DIR, file), 'utf8') }));

const referencedNames = new Set(
  seederSources.flatMap(({ source }) => [...source.matchAll(/seedImage\('([^']+)'\)/g)].map((m) => m[1])),
);

const assetNames = new Set(
  fs.readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, '')),
);

describe('seed assets', () => {
  // A missing asset only surfaces when someone runs the seeder, which is exactly when
  // they least want a crash. Catch the typo here instead.
  it('every seedImage() name has a bundled asset', () => {
    const missing = [...referencedNames].filter((name) => !assetNames.has(name));
    expect(missing).toEqual([]);
  });

  it('every bundled asset is actually referenced', () => {
    const unused = [...assetNames].filter((name) => !referencedNames.has(name));
    expect(unused).toEqual([]);
  });

  // The whole point of shipping these files is that seeding never reaches out to a
  // third-party CDN again.
  it('no seeder hotlinks a remote image', () => {
    const offenders = seederSources
      .filter(({ source }) => /https?:\/\/(?!getofferly)/.test(source.replace(/^\s*\/\/.*$/gm, '')))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});
