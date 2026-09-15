// 刷新 rToken K线数据到最新（公开REST，无需Key）——标的清单来自 symbols.ts 筛选结果
// npx tsx scripts/refresh.ts
import * as fs from 'fs';
import * as path from 'path';

const SYMBOLS: string[] = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/symbols.json'), 'utf8'));
const GRANS = ['15m', '1H'] as const;
const BASE = 'https://api.bitget.com/api/v2/mix/market/history-candles';
const GRAN_MAP: Record<string, string> = { '15m': '15m', '1H': '1H' };

async function fetchPage(symbol: string, gran: string, endTime?: number): Promise<string[][]> {
  const url = new URL(BASE);
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('granularity', GRAN_MAP[gran]);
  url.searchParams.set('productType', 'USDT-FUTURES');
  url.searchParams.set('limit', '100');
  if (endTime) url.searchParams.set('endTime', String(endTime));
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.status === 429) { await new Promise(r => setTimeout(r, 1500 * attempt)); continue; }
      const json = await res.json() as any;
      if (json.code !== '00000') throw new Error(`API ${json.code}: ${json.msg}`);
      return json.data ?? [];
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return [];
}

async function refresh(symbol: string, gran: string) {
  const file = path.join(__dirname, '../data', `${symbol}_${gran}.json`);
  let existing: string[][] = [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    existing = Array.isArray(raw) ? raw : raw.data ?? [];
  } catch { /* 新文件 */ }
  const byTs = new Map<number, string[]>();
  for (const r of existing) byTs.set(+r[0], r);

  // 1) 先不带 endTime 拉最新一页（覆盖 existing 之后的增量）
  let latestPage = await fetchPage(symbol, gran);
  for (const r of latestPage) byTs.set(+r[0], r);
  // 2) 若历史比已有缓存更早，继续向后翻页补全
  let endTime: number | undefined = latestPage.length ? Math.min(...latestPage.map(r => +r[0])) - 1 : undefined;
  const sortedExisting = existing.map(r => +r[0]).sort((a, b) => a - b);
  const oldestNeeded = sortedExisting.length ? sortedExisting[0] : 0;
  let guard = 0;
  while (endTime && endTime > oldestNeeded && guard++ < 200) {
    const page = await fetchPage(symbol, gran, endTime);
    if (!page.length) break;
    for (const r of page) byTs.set(+r[0], r);
    const earliest = Math.min(...page.map(r => +r[0]));
    if (earliest >= endTime) break;
    endTime = earliest - 1;
    await new Promise(r => setTimeout(r, 150));
  }
  const all = [...byTs.values()].sort((a, b) => +a[0] - +b[0]);
  fs.writeFileSync(file, JSON.stringify(all));
  console.log(`${symbol} ${gran}: ${all.length} bars (${new Date(+all[0][0]).toISOString().slice(0, 10)} → ${new Date(+all[all.length - 1][0]).toISOString().slice(0, 10)})`);
}

(async () => {
  for (const sym of SYMBOLS) {
    for (const gran of GRANS) {
      try { await refresh(sym, gran); }
      catch (e) { console.error(`${sym} ${gran} FAILED:`, (e as Error).message); }
    }
  }
})();
