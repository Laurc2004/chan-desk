// 打包发布数据：public/data 只放每标的近 3000 根（画图用），全历史留在 data/ 供离线汇总
// npx tsx scripts/pack.ts
import * as fs from 'fs';
import * as path from 'path';

const SYMBOLS: string[] = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/symbols.json'), 'utf8'));
const GRANS = ['15m', '1H'];
const TRIM = 3000;

let totalBefore = 0, totalAfter = 0;
for (const sym of SYMBOLS) {
  for (const gran of GRANS) {
    const src = path.join(__dirname, '../data', `${sym}_${gran}.json`);
    if (!fs.existsSync(src)) continue;
    const arr = JSON.parse(fs.readFileSync(src, 'utf8'));
    const trimmed = arr.slice(-TRIM);
    const out = path.join(__dirname, '../public/data', `${sym}_${gran}.json`);
    const before = fs.statSync(src).size, after = JSON.stringify(trimmed).length;
    fs.writeFileSync(out, JSON.stringify(trimmed));
    totalBefore += before; totalAfter += after;
  }
}
fs.copyFileSync(path.join(__dirname, '../data/symbols.json'), path.join(__dirname, '../public/data/symbols.json'));
console.log(`public/data 打包完成：${(totalBefore / 1e6).toFixed(1)}MB → ${(totalAfter / 1e6).toFixed(1)}MB（每标的每周期 ≤${TRIM}根）`);
