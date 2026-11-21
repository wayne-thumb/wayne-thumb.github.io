// QR 코드를 만듭니다: 소식만 전하는 주소와 계좌가 보이는 주소(/p) 각각, 사진 없는 모양, 가운데에 사진을 넣은
// 모양 두 가지, 사진 위에 점을 찍은 모양 세 가지로.
// 만든 그림을 다시 읽어 보아(여러 크기로 줄이고 흐리게 해서) 주소가 그대로 나오는지 확인하고, 아니면 실패합니다.
// 주소가 바뀌면(invitation.js 의 siteUrl, gift.path) 다시 실행하세요. 인쇄한 QR 은 주소가 바뀌면 못 쓰게 됩니다.
// 사용: npm install && npm run qr   →   qr/ 폴더에 PNG 열두 장
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { announcement } from '../invitation.js';

const require = createRequire(import.meta.url);
const QRCode = require('qrcode');
const jsQR = require('jsqr');
const alignment = require('qrcode/lib/core/alignment-pattern');

const photos = path.resolve('웨딩/웨딩');
const outDir = path.resolve('qr');
const SIZE = 1400;
const INK = '#10151c';
const NIGHT = '#0a1626';

const rounded = (x, y, size, radius, fill) => `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fill}"/>`;
const circle = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);
// A square cut of a photo: [left, top, width] as fractions of the photo's width/height/width.
// Anything that falls outside the photo is filled with black (the studio backdrop).
async function square(file, [left, top, width], size) {
  const meta = await sharp(file).metadata();
  const side = Math.round(width * meta.width);
  const x = Math.round(left * meta.width), y = Math.round(top * meta.height);
  const before = { top: Math.max(0, -y), left: Math.max(0, -x) };
  const after = { bottom: Math.max(0, y + side - meta.height), right: Math.max(0, x + side - meta.width) };
  const padded = await sharp(file).extend({ ...before, ...after, background: '#000' }).toBuffer();
  return sharp(padded).extract({ left: x + before.left, top: y + before.top, width: side, height: side }).resize(size, size).toBuffer();
}

async function make(url, suffix) {
  // Level H can rebuild about 30% of the code, which is what lets a photo sit in the middle.
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size;
  const unit = SIZE / (n + 8);           // four quiet modules on every side
  const at = (index) => (index + 4) * unit;
  const finders = [[0, 0], [0, n - 7], [n - 7, 0]];
  const aligns = alignment.getPositions(qr.version);
  const inFinder = (row, col) => finders.some(([r, c]) => row >= r - 1 && row <= r + 7 && col >= c - 1 && col <= c + 7);
  const inAlign = (row, col) => aligns.some(([r, c]) => Math.abs(row - r) <= 2 && Math.abs(col - c) <= 2);
  const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">${body}</svg>`);

  // Finder and alignment patterns stay solid and conventional; they are what a scanner looks for first.
  function patterns(colour) {
    let body = '';
    for (const [row, col] of finders) {
      const x = at(col), y = at(row);
      body += rounded(x, y, 7 * unit, unit * 1.7, colour) + rounded(x + unit, y + unit, 5 * unit, unit * 1.1, '#fff') + rounded(x + 2 * unit, y + 2 * unit, 3 * unit, unit * 0.8, colour);
    }
    for (const [row, col] of aligns) {
      const x = at(col - 2), y = at(row - 2);
      body += rounded(x, y, 5 * unit, unit * 1.1, colour) + rounded(x + unit, y + unit, 3 * unit, unit * 0.7, '#fff') + rounded(x + 2 * unit, y + 2 * unit, unit, unit * 0.5, colour);
    }
    return body;
  }
  // The dark data modules as dots, leaving a round window (radius in modules) open in the middle.
  function dots(colour, clear) {
    let body = '';
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const isDark = qr.modules.data[row * n + col] === 1;
        const fromCentre = Math.hypot(row + 0.5 - n / 2, col + 0.5 - n / 2);
        if (!isDark || inFinder(row, col) || inAlign(row, col) || fromCentre < clear) continue;
        body += `<circle cx="${at(col) + unit / 2}" cy="${at(row) + unit / 2}" r="${unit * 0.47}" fill="${colour}"/>`;
      }
    }
    return body;
  }
  // Read back what was drawn: at full size, and shrunk and blurred the way a phone camera might see it.
  async function save(name, layers) {
    const file = path.join(outDir, `${name}${suffix}.png`);
    await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: '#ffffff' } }).composite(layers).png().toFile(file);
    for (const [size, blur] of [[SIZE, 0], [700, 0], [420, 0.5], [260, 0.7], [180, 0.8]]) {
      let image = sharp(file).resize(size, size);
      if (blur) image = image.blur(blur);
      const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      if (jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data !== url) {
        throw new Error(`${path.basename(file)} 를 ${size}px 크기에서 읽지 못했습니다. 가운데 사진 창을 줄이거나 사진을 더 어둡게 하세요.`);
      }
    }
    console.log(`qr/${path.basename(file)}  →  ${url}`);
  }

  // Plain: the same ink-black dots and corners on white, with no photo.
  await save('qr-plain', [{ input: svg(dots(INK, 0) + patterns(INK)) }]);

  const windowRadius = n * 0.2;
  const windowSize = Math.round(windowRadius * 2 * unit);
  const windowAt = Math.round(SIZE / 2 - windowSize / 2);

  // Sunglasses: an ink-black code on white, with the two in sunglasses in a round window in the middle.
  const shades = await sharp(await square(path.join(photos, '모스앤코튼/인화용/MOS_7025.jpg'), [0.03, -0.035, 0.9], windowSize))
    .composite([{ input: circle(windowSize), blend: 'dest-in' }]).png().toBuffer();
  await save('qr-sunglasses', [
    { input: svg(dots(INK, windowRadius + 0.9) + patterns(INK)) },
    { input: shades, left: windowAt, top: windowAt }
  ]);

  // Night: the dots are cut out of the night photo itself, so the scene shows through them,
  // and the middle opens onto the two faces lit by the sparkler.
  const tile = Math.round(35 * unit);    // the code plus one module all round
  const tileAt = Math.round(3 * unit);
  const photo = await square(path.join(photos, '벨루어/02. 작가셀렉/01. 깔끔한색감/DSC03466 0.jpg'), [0.045, 0.0967, 0.94], tile);
  // Inside the dots the photo is dimmed, so even the sparkler still reads as dark next to the white between them.
  const dimmed = await sharp(photo).linear(0.5, 0)
    .extend({ top: tileAt, left: tileAt, bottom: SIZE - tile - tileAt, right: SIZE - tile - tileAt, background: '#000' }).png().toBuffer();
  const throughDots = await sharp(dimmed).composite([{ input: svg(dots('#fff', windowRadius + 0.9)), blend: 'dest-in' }]).png().toBuffer();
  const faces = await sharp(photo).extract({ left: windowAt - tileAt, top: windowAt - tileAt, width: windowSize, height: windowSize })
    .composite([{ input: circle(windowSize), blend: 'dest-in' }]).png().toBuffer();
  await save('qr-night', [
    { input: throughDots },
    { input: svg(patterns(NIGHT)) },
    { input: faces, left: windowAt, top: windowAt }
  ]);

  // Photo with dots: the whole photo is the tile and every module is a small dot over it, white or near-black.
  // The corner patterns get a white backing so a scanner can still find them. `veil` faintly lightens or darkens
  // each module's square as well; photos with large bright areas need a touch of it to read at small sizes.
  const tileMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tile}" height="${tile}"><rect width="${tile}" height="${tile}" rx="${unit * 2.4}" fill="#fff"/></svg>`);
  async function dotted(name, file, cut, veil) {
    let body = '';
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (inFinder(row, col) || inAlign(row, col)) continue;
        const isDark = qr.modules.data[row * n + col] === 1;
        if (veil) body += `<rect x="${at(col)}" y="${at(row)}" width="${unit + 0.5}" height="${unit + 0.5}" fill="${isDark ? '#000' : '#fff'}" fill-opacity="${veil}"/>`;
        body += `<circle cx="${at(col) + unit / 2}" cy="${at(row) + unit / 2}" r="${unit * 0.24}" fill="${isDark ? '#070b12' : '#fff'}"/>`;
      }
    }
    for (const [row, col] of finders) body += rounded(at(col) - unit, at(row) - unit, 9 * unit, unit * 2, '#fff');
    for (const [row, col] of aligns) body += rounded(at(col - 2) - unit * 0.5, at(row - 2) - unit * 0.5, 6 * unit, unit * 1.3, '#fff');
    const picture = await sharp(await square(path.join(photos, file), cut, tile)).composite([{ input: tileMask, blend: 'dest-in' }]).png().toBuffer();
    await save(name, [{ input: picture, left: tileAt, top: tileAt }, { input: svg(body + patterns(NIGHT)) }]);
  }
  await dotted('qr-dots-skyline', '벨루어/01. 셀렉/01. 깔끔한색감/DSC05114 0.jpg', [0, 0.2, 1], 0);
  await dotted('qr-dots-sparkler', '벨루어/02. 작가셀렉/01. 깔끔한색감/DSC03466 0.jpg', [0.045, 0.0967, 0.94], 0);
  await dotted('qr-dots-sunglasses', '모스앤코튼/인화용/MOS_6983.jpg', [0, 0.03, 1], 0.06);
}

await mkdir(outDir, { recursive: true });
await make(announcement.siteUrl, '');
if (announcement.gift?.path) await make(`${announcement.siteUrl}${announcement.gift.path}`, `-${announcement.gift.path}`);
