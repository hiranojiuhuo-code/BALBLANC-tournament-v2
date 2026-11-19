// ビルド後に out/sw.js へ版の印を入れる。配信のたびにサービスワーカーが変わり、
// 端末側のキャッシュが新しい版に入れ替わるようにするため。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const file = 'out/sw.js';
if (!existsSync(file)) {
  console.error('stamp-sw: out/sw.js が見つかりません');
  process.exit(1);
}
const build = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const src = readFileSync(file, 'utf8');
if (!src.includes('__BUILD__')) {
  console.error('stamp-sw: __BUILD__ が見つかりません');
  process.exit(1);
}
writeFileSync(file, src.replaceAll('__BUILD__', build));
console.log('stamp-sw: build', build);
