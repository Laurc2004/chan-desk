import { Pivot, Signal, RawBar, Stroke } from './types';
import { macd } from './macd';

/**
 * 买卖点识别（在原始K线上按确认时间触发）。
 * 信号在"确认K线收盘"时点触发——回放统计以该时点为 t0，杜绝未来函数。
 *
 * - sanmai_buy: 中枢完成后向上笔离开中枢（笔高点 > ZG），随后回调笔低点不回到 ZG 之下 → 三买确认于回调笔结束
 * - sanmai_sell: 对称
 * - pivot_break_up/down: 离开笔收在中枢区间外，确认于该笔终点
 * - divergence 背驰标记：离开段相对"进入中枢前的同向段"价格更远，但 MACD DIF 峰值更小 → 背驰
 */
export function findSignals(
  pivots: Pivot[],
  strokes: Stroke[],
  rawBars: RawBar[],
): Signal[] {
  const out: Signal[] = [];
  const { dif } = macd(rawBars);

  // DIF 峰/谷定位（在 ts 范围内的极值）
  const difExtreme = (fromTs: number, toTs: number, mode: 'max' | 'min'): number | null => {
    let lo = 0, hi = rawBars.length - 1, start = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; rawBars[m].ts < fromTs ? (lo = m + 1) : (start = m, hi = m - 1); }
    if (start < 0) return null;
    let best: number | null = null;
    for (let i = start; i < rawBars.length && rawBars[i].ts <= toTs; i++) {
      const v = dif[i];
      if (best === null) best = v;
      else best = mode === 'max' ? Math.max(best, v) : Math.min(best, v);
    }
    return best;
  };

  const locate = (ts: number) => {
    let lo = 0, hi = rawBars.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (rawBars[mid].ts <= ts) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans;
  };

  for (const p of pivots) {
    const before = strokes.slice(0, p.strokeStart);
    const after = strokes.slice(p.strokeEnd + 1);
    if (after.length === 0) continue;

    const leave = after[0];
    const brokeUp = leave.dir === 1 && leave.high > p.high;
    const brokeDown = leave.dir === -1 && leave.low < p.low;

    // 背驰参照：进入中枢前的最后一个同向笔（离开段 vs 进入段比价格幅度与 DIF 极值）
    const divergenceOf = (leaveStroke: Stroke, dir: 1 | -1): boolean => {
      const entryStroke = [...before].reverse().find(s => s.dir === dir);
      if (!entryStroke) return false;
      const priceFarther = dir === 1
        ? leaveStroke.high - p.high > entryStroke.high - p.high
        : p.low - leaveStroke.low > p.low - entryStroke.low;
      if (!priceFarther) return false;
      const dLeave = difExtreme(leaveStroke.startTs, leaveStroke.endTs, dir === 1 ? 'max' : 'min');
      const dEntry = difExtreme(entryStroke.startTs, entryStroke.endTs, dir === 1 ? 'max' : 'min');
      if (dLeave === null || dEntry === null) return false;
      return dir === 1 ? dLeave < dEntry : dLeave > dEntry;
    };

    if (brokeUp) {
      const div = divergenceOf(leave, 1);
      const li = locate(leave.endTs);
      if (li >= 0) out.push({
        kind: 'pivot_break_up', ts: rawBars[li].ts, barIndex: li, price: rawBars[li].close,
        pivotHigh: p.high, pivotLow: p.low, divergence: div,
        note: `向上突破中枢 ZG=${p.high.toFixed(2)}${div ? ' ⚠顶背驰' : ''}`,
      });
      const pullback = after[1];
      if (pullback && pullback.dir === -1) {
        const idx = locate(pullback.endTs);
        if (idx >= 0 && pullback.low > p.high) {
          out.push({
            kind: 'sanmai_buy', ts: rawBars[idx].ts, barIndex: idx, price: rawBars[idx].close,
            pivotHigh: p.high, pivotLow: p.low, divergence: div,
            note: `三买 回调低点 ${pullback.low.toFixed(2)} > ZG ${p.high.toFixed(2)}${div ? '（离开段顶背驰）' : ''}`,
          });
        }
      }
    }
    if (brokeDown) {
      const div = divergenceOf(leave, -1);
      const li = locate(leave.endTs);
      if (li >= 0) out.push({
        kind: 'pivot_break_down', ts: rawBars[li].ts, barIndex: li, price: rawBars[li].close,
        pivotHigh: p.high, pivotLow: p.low, divergence: div,
        note: `向下突破中枢 ZD=${p.low.toFixed(2)}${div ? ' ⚠底背驰' : ''}`,
      });
      const pullback = after[1];
      if (pullback && pullback.dir === 1) {
        const idx = locate(pullback.endTs);
        if (idx >= 0 && pullback.high < p.low) {
          out.push({
            kind: 'sanmai_sell', ts: rawBars[idx].ts, barIndex: idx, price: rawBars[idx].close,
            pivotHigh: p.high, pivotLow: p.low, divergence: div,
            note: `三卖 回抽高点 ${pullback.high.toFixed(2)} < ZD ${p.low.toFixed(2)}${div ? '（离开段底背驰）' : ''}`,
          });
        }
      }
    }
  }
  const seen = new Set<string>();
  return out
    .filter(s => s.barIndex >= 0)
    .sort((a, b) => a.ts - b.ts)
    .filter(s => {
      const k = `${s.kind}@${s.ts}`;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
}
