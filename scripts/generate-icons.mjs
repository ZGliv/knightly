// Render the original vector master into deterministic browser/home-screen assets.
// Sharp is supplied by the pinned Next.js dependency; no external image service.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve('next/package.json'));
const sharp = nextRequire('sharp');
const source = await readFile(new URL('../public/brand/knightly.svg', import.meta.url));
const root = new URL('../', import.meta.url);
await mkdir(new URL('public/icons/', root), { recursive: true });
await writeFile(new URL('app/icon.svg', root), source);
for (const [size, file] of [[180, 'public/apple-touch-icon.png'], [192, 'public/icons/knightly-192.png'], [512, 'public/icons/knightly-512.png']]) {
  await sharp(source).resize(size, size).removeAlpha().png().toFile(new URL(file, root).pathname);
}
// ICO directory entries point to PNG payloads (supported by modern browsers).
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(size => sharp(source).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((image, i) => {
  const entry = 6 + i * 16;
  header[entry] = sizes[i]; header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(image.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(new URL('app/favicon.ico', root), Buffer.concat([header, ...images]));
console.log('Knightly SVG, opaque 180/192/512 PNGs and 16/32/48 ICO generated.');
