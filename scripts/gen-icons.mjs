// アプリアイコンを生成する（ホーム画面用）。デザインを変えたいときだけ `node scripts/gen-icons.mjs` で作り直す。
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const svg = ({ r, rx }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#46a552"/><stop offset="1" stop-color="#24692f"/>
    </linearGradient>
    <radialGradient id="ball" cx="35%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#eefb7c"/><stop offset="55%" stop-color="#cfe433"/><stop offset="100%" stop-color="#9ab510"/>
    </radialGradient>
    <clipPath id="clip"><circle cx="256" cy="256" r="${r}"/></clipPath>
    <clipPath id="frame"><rect width="512" height="512" rx="${rx}"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="512" height="512" fill="url(#bg)"/>
    <g stroke="#ffffff" stroke-opacity=".2" stroke-width="9" fill="none">
      <path d="M0 256H512M256 0V512"/><rect x="70" y="70" width="372" height="372"/>
    </g>
    <circle cx="256" cy="268" r="${r}" fill="#000" opacity=".16"/>
    <circle cx="256" cy="256" r="${r}" fill="url(#ball)"/>
    <g clip-path="url(#clip)" fill="none" stroke="#ffffff" stroke-width="${r * 0.14}" opacity=".93">
      <circle cx="${256 - r * 1.077}" cy="${256 - r * 1.077}" r="${r}"/>
      <circle cx="${256 + r * 1.077}" cy="${256 + r * 1.077}" r="${r}"/>
    </g>
  </g>
</svg>`;

mkdirSync('public/icons', { recursive: true });
const out = async (name, size, opt) =>
  sharp(Buffer.from(svg(opt))).resize(size, size).png().toFile(`public/icons/${name}`);

await out('icon-192.png', 192, { r: 158, rx: 112 });
await out('icon-512.png', 512, { r: 158, rx: 112 });
// maskable は端末側で丸や角丸に切り抜かれるので、背景を全面に敷いて絵柄を内側に寄せる
await out('icon-maskable-512.png', 512, { r: 122, rx: 0 });
// iOS は透過を黒く塗るため、角を落とさない不透明の正方形にする
await out('apple-touch-icon.png', 180, { r: 158, rx: 0 });
console.log('icons generated');
