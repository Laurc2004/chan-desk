// 跨标的汇总统计：全部标的 × 周期的同类信号合成大样本 → public/data/aggregate_{gran}.json
// npx tsx scripts/aggregate.ts
import * as fs from 'fs';
import * as path from 'path';
import { analyze } from '../lib/chan';
import { replay, summarize, inUsMarketHours, Stats } from '../lib/replay/replay';
import { RawBar, SignalKind } from '../lib/chan/types';

const SYMBOLS = ['TSLAUSDT', 'AAPLUSDT', 'NVDAUSDT', 'MSFTUSDT', 'METAUSDT', 'GOOGLUSDT', 'AMZNUSDT', 'AMDUSDT', 'AVGOUSDT'];
const GRANS = ['15m', '1H'];

function load(symbol: string, gran: string): RawBar[] {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../data', `${symbol}_${gran}.json`), 'utf8'));
  const arr = Array.isArray(raw) ? raw : raw.data ?? [];
  return (arr as string[][]).map(r => ({ ts: +r[0], open: +r[1], high: +r[2], low: +r[3], close: +r[4], vol: +r[5] })).sort((a, b) => a.ts - b.ts);
}

interface AggEntry {
  kind: SignalKind;
  total: number;
  bySymbol: Record<string, number>;
  inHours: Stats & { ret12List: number[] };
  offHours: Stats & { ret12List: number[] };
  dateRange: [string, string];
}

for (const gran of GRANS) {
  const byKind = new Map<SignalKind, AggEntry>();
  let minTs = Infinity, maxTs = -Infinity;
  for (const sym of SYMBOLS) {
    const bars = load(sym, gran);
    if (bars.length === 0) continue;
    minTs = Math.min(minTs, bars[0].ts); maxTs = Math.max(maxTs, bars[bars.length - 1].ts);
    const { signals } = analyze(bars);
    for (const sig of signals) {
      const out = replay(sig, bars);
      if (!out || out.ret12 === null) continue;
      let e = byKind.get(sig.kind);
      if (!e) {
        e = {
          kind: sig.kind, total: 0, bySymbol: {},
          inHours: { ...summarize([]), ret12List: [] },
          offHours: { ...summarize([]), ret12List: [] },
          dateRange: ['', ''],
        };
        byKind.set(sig.kind, e);
      }
      e.total++;
      e.bySymbol[sym] = (e.bySymbol[sym] ?? 0) + 1;
      (out.inMarketHours ? e.inHours : e.offHours).ret12List.push(out.ret12);
    }
  }
  const entries = [...byKind.values()].map(e => {
    for (const w of [e.inHours, e.offHours] as const) {
      const s = summarize(w.ret12List.map((ret12, i) => ({ ret12, maxAdverse: null }) as never));
      Object.assign(w, s);
    }
    return e;
  });
  const payload = {
    granularity: gran, symbols: SYMBOLS,
    dateRange: [new Date(minTs).toISOString().slice(0, 10), new Date(maxTs).toISOString().slice(0, 10)],
    entries,
  };
  fs.writeFileSync(path.join(__dirname, '../public/data', `aggregate_${gran}.json`), JSON.stringify(payload));
  console.log(`aggregate_${gran}.json:`);
  for (const e of entries) {
    const f = (s: Stats & { ret12List: number[] }) => `n=${s.n} win=${s.winRate12 === null ? '-' : (s.winRate12 * 100).toFixed(0) + '%'} med=${s.medianRet12?.toFixed(2) ?? '-'}%`;
    console.log(`  ${e.kind}: total=${e.total} | 盘中 ${f(e.inHours)} | 休市 ${f(e.offHours)}`);
  }
}
