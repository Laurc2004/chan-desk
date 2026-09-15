import { MergedBar, Fractal } from './types';

/**
 * 分型识别（在合并K线上）：
 * 顶分型：i 的高点严格高于左右两根，且 i 的低点也高于左右两根的低点
 * 底分型：对称
 */
export function findFractals(mb: MergedBar[]): Fractal[] {
  const out: Fractal[] = [];
  for (let i = 1; i < mb.length - 1; i++) {
    const a = mb[i - 1], b = mb[i], c = mb[i + 1];
    if (b.high > a.high && b.high > c.high && b.low > a.low && b.low > c.low) {
      out.push({ index: i, ts: b.ts, kind: 'top', high: b.high, low: b.low });
    } else if (b.low < a.low && b.low < c.low && b.high < a.high && b.high < c.high) {
      out.push({ index: i, ts: b.ts, kind: 'bottom', high: b.high, low: b.low });
    }
  }
  return out;
}
