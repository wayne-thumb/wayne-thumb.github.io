// 원본 사진(웨딩/ 폴더, 저장소에는 올리지 않음)을 웹용 WebP로 줄여 assets/photos 에 저장합니다.
// 사용: npm install && npm run photos            (전부 다시 만들기)
//       npm run photos -- portrait-bride cover  (적은 id 만 다시 만들기)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const source = path.resolve('웨딩/웨딩');
const only = process.argv.slice(2);
const output = path.resolve('assets/photos');
const sky = '벨루어/01. 셀렉/01. 깔끔한색감';
const pro = '벨루어/02. 작가셀렉/01. 깔끔한색감';
const studio = '모스앤코튼/인화용';

// [id, 원본 경로, 옵션] — crop 은 원본 대비 비율(left, top, width, height)입니다.
// hide 는 잘라 낸 사진에서 사진관 배경색(검정)으로 덮을 다각형들입니다.
// points 는 원본 대비 비율 좌표, soft 는 가장자리를 흐리는 정도(원본 픽셀)입니다.
const photos = [
  ['cover', `${studio}/COT_9384.jpg`, { large: true }],
  ['closing', `${sky}/DSC02646 0.jpg`, { large: true }],
  ['portrait-bride', `${studio}/MOS_6705.jpg`, { crop: [0.115, 0.445, 0.38, 0.3404] }],
  ['portrait-groom', `${studio}/MOS_6705.jpg`, { crop: [0.5, 0.445, 0.38, 0.3404] }],
  // The two sunglasses portraits are cut as a pair: sunglasses at the same height, faces the same size,
  // each face near the middle of its own frame. In the photo the two stand cheek to cheek, so a cut with
  // one face in the middle catches the other's as well; `hide` paints the black backdrop over that part.
  // In hers the bride's arm still rests on the groom's shoulder. In his it is painted out along its own outline
  // (the second shape), which leaves the line of his shoulder; the last, softest shape lets the near edge of
  // his jacket come out of the dark instead of ending on a straight line.
  ['shades-bride', `${studio}/MOS_6983.jpg`, {
    crop: [0.2198, 0.1177, 0.3462, 0.3077],
    hide: [{ soft: 4, points: [[0.4898, 0.0661], [0.6696, 0.0661], [0.6696, 0.2707], [0.5704, 0.2707], [0.5456, 0.2728], [0.5208, 0.2811], [0.5072, 0.2877], [0.5072, 0.1984], [0.4898, 0.1852]] }]
  }],
  ['shades-groom', `${studio}/MOS_6983.jpg`, {
    crop: [0.431, 0.0241, 0.3894, 0.3461],
    hide: [
      { soft: 12, points: [[0.3224, -0.0331], [0.4898, -0.0331], [0.4898, 0.1852], [0.506, 0.2017], [0.506, 0.4464], [0.3224, 0.4464]] },
      { soft: 3, points: [[0.496, 0.2811], [0.5456, 0.2712], [0.5704, 0.2662], [0.5826, 0.2646], [0.5848, 0.2695], [0.5871, 0.2758], [0.5866, 0.2808], [0.5833, 0.2844], [0.5786, 0.2887], [0.5712, 0.2978], [0.5647, 0.3027], [0.5585, 0.3061], [0.5461, 0.311], [0.537, 0.3142], [0.5288, 0.3188], [0.5208, 0.3198], [0.5134, 0.3201], [0.5129, 0.3241], [0.5094, 0.3307], [0.506, 0.3373], [0.496, 0.3406]] },
      { soft: 40, points: [[0.3224, 0.3108], [0.5146, 0.3108], [0.5146, 0.4464], [0.3224, 0.4464]] }
    ]
  }],
  ['studio-shades-close', `${studio}/MOS_7025.jpg`],
  ['studio-glance', `${studio}/MOS_6397.jpg`],
  ['studio-ribbon', `${studio}/MOS_6653.jpg`],
  ['studio-wink', `${studio}/COT_9078.jpg`],
  ['studio-confetti', `${studio}/COT_9409.jpg`],
  ['studio-sunglasses', `${studio}/MOS_7003.jpg`],
  ['studio-veil', `${studio}/MOS_6971.jpg`],
  ['noon-jump', `${sky}/DSC02694 0.jpg`],
  ['noon-lift', `${sky}/DSC04718 0.jpg`],
  ['noon-hearts', `${pro}/DSC04760 0.jpg`],
  ['noon-peace', `${pro}/DSC04674 0.jpg`],
  ['noon-bunny', `${pro}/DSC02757 0.jpg`],
  ['noon-mirror', `${pro}/DSC02941 0.jpg`],
  ['noon-laugh', `${pro}/DSC04623 0.jpg`],
  ['field-bubbles-wide', `${sky}/DSC04843 0.jpg`],
  ['field-kiss', `${sky}/DSC03313 0.jpg`],
  ['field-flowers', `${pro}/DSC03161 0.jpg`],
  ['field-bubbles', `${sky}/DSC04781 0.jpg`],
  ['field-hearts', `${pro}/DSC05022 0.jpg`],
  ['field-lean', `${pro}/DSC03296 0.jpg`],
  ['field-run', `${pro}/DSC04910 0.jpg`],
  ['alley-ginkgo', `${studio}/COT_0320.jpg`],
  ['alley-brick', `${studio}/COT_0399.jpg`],
  ['alley-gaze', `${studio}/COT_9562.jpg`],
  ['alley-stairs', `${studio}/COT_0604.jpg`],
  ['alley-smile', `${studio}/COT_1224.jpg`],
  ['alley-reeds', `${studio}/COT_1342.jpg`],
  ['alley-embrace', `${studio}/COT_9857.jpg`],
  ['night-sparkler', `${pro}/DSC03466 0.jpg`],
  ['night-dusk', `${sky}/DSC05028 0.jpg`],
  ['night-sparklers', `${sky}/DSC03444 0.jpg`],
  ['night-skyline', `${sky}/DSC05114 0.jpg`],
  ['night-bridge', `${sky}/DSC05108 0.jpg`],
  ['night-stairs', `${sky}/DSC05198 0.jpg`],
  ['night-dance', `${pro}/DSC05303 0.jpg`]
];

// The shapes of `hide`, drawn in black to the size of the cut.
// They are drawn on a sheet larger than the cut and trimmed afterwards: a blur thins out toward the edge of
// what it is drawn on, and along the cut's own edge that would let what is being hidden show through.
function cover(shapes, region, width, height) {
  const pad = Math.ceil(3 * Math.max(...shapes.map(({ soft = 0 }) => soft))) + 2;
  const sheet = { width: region.width + 2 * pad, height: region.height + 2 * pad };
  const body = shapes.map(({ soft = 0, points }, index) => {
    const list = points.map(([x, y]) => `${x * width - region.left + pad},${y * height - region.top + pad}`).join(' ');
    const blur = soft ? `<filter id="soft${index}" filterUnits="userSpaceOnUse" x="0" y="0" width="${sheet.width}" height="${sheet.height}"><feGaussianBlur stdDeviation="${soft}"/></filter>` : '';
    return `${blur}<polygon points="${list}"${soft ? ` filter="url(#soft${index})"` : ''}/>`;
  }).join('');
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${sheet.width}" height="${sheet.height}">${body}</svg>`))
    .extract({ left: pad, top: pad, width: region.width, height: region.height }).png().toBuffer();
}

await mkdir(output, { recursive: true });
for (const [id, file, { crop, hide, large } = {}] of photos) {
  if (only.length && !only.includes(id)) continue;
  const input = path.join(source, file);
  const { width, height } = await sharp(input).metadata();
  const region = crop && {
    left: Math.round(crop[0] * width), top: Math.round(crop[1] * height),
    width: Math.round(crop[2] * width), height: Math.round(crop[3] * height)
  };
  // sharp resizes before it composites, so a cut that has parts to hide is covered in a pass of its own first.
  const covered = hide && await sharp(input).extract(region).composite([{ input: await cover(hide, region, width, height) }]).png().toBuffer();
  for (const size of large ? [640, 1280, 1920] : [640, 1280]) {
    let image = sharp(covered || input);
    if (region && !covered) image = image.extract(region);
    await image.resize({ width: size }).webp({ quality: 76, effort: 5 }).toFile(path.join(output, `${id}-${size}.webp`));
  }
  console.log(id);
}

// 메신저 공유 미리보기(1200×630)용 사진: 인사하는 두 사람과 하늘.
if (only.length && !only.includes('og')) process.exit(0);
const bow = path.join(source, photos.find(([id]) => id === 'closing')[1]);
const meta = await sharp(bow).metadata();
const ogHeight = Math.round(meta.width * 630 / 1200);
await sharp(bow)
  .extract({ left: 0, top: Math.round(meta.height * 0.872) - ogHeight, width: meta.width, height: ogHeight })
  .resize(1200, 630).jpeg({ quality: 84, mozjpeg: true }).toFile(path.resolve('assets/og.jpg'));
console.log('og.jpg');
