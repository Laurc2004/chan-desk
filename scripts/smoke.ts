// 冒烟测试：真实 TSLA 1H 数据跑完整缠论流水线 + 回放统计
// npx tsx scripts/smoke.ts
import * as fs from 'fs';
import * as path from 'path';
import { analyze } from '../lib/chan';
import { replayAll } from '../lib/replay/replay';
import { RawBar } from '../lib/chan/types';

function load(symbol: string, gran: string): RawBar[] {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../data', `${symbol}_${gran}.json`), 'utf8'));
  const arr = Array.isArray(raw) ? raw : raw.data ?? raw.candles ?? Object.values(raw)[0];
  return (arr as string[][]).map(r => ({
    ts: +r[0], open: +r[1], high: +r[2], low: +r[3], close: +r[4], vol: +r[5],
  })).sort((a, b) => a.ts - b.ts);
}

const symbols = ['TSLAUSDT', 'NVDAUSDT'];
for (const sym of symbols) {
  const bars = load(sym, '15m');
  const a = analyze(bars);
  console.log(`\n=== ${sym} 1H: ${bars.length} bars (${new Date(bars[0].ts).toISOString().slice(0,10)} → ${new Date(bars[bars.length-1].ts).toISOString().slice(0,10)}) ===`);
  console.log(`merged=${a.mergedCount} fractals=${a.fractalCount} strokes=${a.strokes.length} pivots=${a.pivots.length} signals=${a.signals.length}`);
  const byKind: Record<string, number> = {};
  for (const s of a.signals) byKind[s.kind] = (byKind[s.kind] ?? 0) + 1;
  console.log('signals by kind:', byKind);
  const stats = replayAll(sym, '15m', a.signals, bars);
  for (const st of stats) {
    const fmt = (s: typeof st.byWindow.inHours) =>
      `n=${s.n} win12=${s.winRate12 === null ? '-' : (s.winRate12*100).toFixed(0)+'%'} med=${s.medianRet12?.toFixed(2) ?? '-'}% payoff=${s.payoff?.toFixed(2) ?? '-'} worst=${s.worstRet12?.toFixed(2) ?? '-'}%`;
    console.log(`  [${st.kind}] total=${st.sampleSize}`);
    console.log(`    盘中: ${fmt(st.byWindow.inHours)}`);
    console.log(`    休市: ${fmt(st.byWindow.offHours)}`);
  }
}
