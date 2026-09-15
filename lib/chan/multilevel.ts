import { RawBar } from './types';

/**
 * 多级别环境：用大级别（如 1H）笔中枢位置判定小级别（如 15m）信号所处的趋势环境。
 * 缠论"级别联立"的简化实现——不做完整递归，只取环境标签：
 *   - uptrend: 大级别最后中枢被向上离开且未回落
 *   - downtrend: 对称
 *   - range: 价格在大级别最后中枢区间内
 */
export type Environment = 'uptrend' | 'downtrend' | 'range';

export function environmentAt(
  bigPivots: { high: number; low: number; endTs: number }[],
  bigBars: { ts: number; high: number; low: number; close: number }[],
  ts: number,
): Environment {
  // 找 ts 之前最后一个已形成的大级别中枢
  const pivot = [...bigPivots].reverse().find(p => p.endTs <= ts);
  if (!pivot) return 'range';
  // ts 时刻的大级别价格
  const bar = [...bigBars].reverse().find(b => b.ts <= ts);
  if (!bar) return 'range';
  if (bar.close > pivot.high) return 'uptrend';
  if (bar.close < pivot.low) return 'downtrend';
  return 'range';
}

/** 把 15m K线聚合成 1H（对齐整点），供无独立大级别数据时降级使用 */
export function aggregate(bars: RawBar[], factor: number): RawBar[] {
  const out: RawBar[] = [];
  const bucketMs = factor * 15 * 60_000;
  let cur: RawBar | null = null;
  let bucketStart = -1;
  for (const b of bars) {
    const bs = Math.floor(b.ts / bucketMs) * bucketMs;
    if (!cur || bs !== bucketStart) {
      if (cur) out.push(cur);
      cur = { ...b, ts: bs };
      bucketStart = bs;
    } else {
      cur.high = Math.max(cur.high, b.high);
      cur.low = Math.min(cur.low, b.low);
      cur.close = b.close;
      cur.vol += b.vol;
    }
  }
  if (cur) out.push(cur);
  return out;
}
