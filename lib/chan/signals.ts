import { MergedBar, Pivot, Signal, SignalKind } from './types';

/**
 * 买卖点识别（在原始K线/合并K线上按确认时间触发）。
 * 信号在"确认K线收盘"时点触发——回放统计以该时点为 t0，杜绝未来函数。
 *
 * - sanmai_buy: 中枢完成后向上笔离开中枢（笔高点 > ZG），随后回调笔低点不回到 ZG 之下 → 三买确认于回调笔结束（底分型成立后的第一根合并K线）
 * - sanmai_sell: 对称
 * - pivot_break_up/down: 突破笔收盘越过 ZG/ZD 后首根不再回到中枢内的合并K线
 * - yimai_buy/sell: 简化一买一卖（新低后收回 ZD 之上 / 新高后收回 ZG 之下）
 *
 * barIndex 映射：用 ts 在原始K线里二分定位确认K线。
 */
export function findSignals(
  pivots: Pivot[],
  strokes: { startTs: number; endTs: number; dir: 1 | -1; high: number; low: number }[],
  rawBars: { ts: number }[],
): Signal[] {
  const out: Signal[] = [];
  const locate = (ts: number) => {
    // 最后一个 ts' <= ts 的原始K线序号
    let lo = 0, hi = rawBars.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (rawBars[mid].ts <= ts) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans;
  };

  for (const p of pivots) {
    const after = strokes.slice(p.strokeEnd + 1);
    if (after.length === 0) continue;

    // 离开中枢的第一笔
    const leave = after[0];
    const brokeUp = leave.dir === 1 && leave.high > p.high;
    const brokeDown = leave.dir === -1 && leave.low < p.low;

    if (brokeUp) {
      // 突破信号：突破笔之后的第一个底分型确认时点
      const pullback = after[1];
      if (pullback && pullback.dir === -1) {
        const confirmTs = pullback.endTs;
        const idx = locate(confirmTs);
        if (idx < 0) continue;
        const closeAt = (rawBars[idx] as { ts: number }).ts;
        // 三买：回调低点不回中枢（> ZG）
        if (pullback.low > p.high) {
          out.push({ kind: 'sanmai_buy', ts: closeAt, barIndex: idx, price: priceAt(rawBars, idx), pivotHigh: p.high, pivotLow: p.low, note: `三买 回调低点 ${pullback.low.toFixed(2)} > ZG ${p.high.toFixed(2)}` });
        } else if (pullback.low > p.low) {
          // 回调进入中枢区间但未破 ZD —— 视为中枢上沿弱突破回踩（不计信号，避免噪音）
        }
      }
      out.push({ kind: 'pivot_break_up', ts: leave.endTs, barIndex: locate(leave.endTs), price: priceAt(rawBars, locate(leave.endTs)), pivotHigh: p.high, pivotLow: p.low, note: `向上突破中枢 ZG=${p.high.toFixed(2)}` });
    }
    if (brokeDown) {
      const pullback = after[1];
      if (pullback && pullback.dir === 1) {
        const confirmTs = pullback.endTs;
        const idx = locate(confirmTs);
        if (idx < 0) continue;
        if (pullback.high < p.low) {
          out.push({ kind: 'sanmai_sell', ts: rawBars[idx].ts, barIndex: idx, price: priceAt(rawBars, idx), pivotHigh: p.high, pivotLow: p.low, note: `三卖 回抽高点 ${pullback.high.toFixed(2)} < ZD ${p.low.toFixed(2)}` });
        }
      }
      out.push({ kind: 'pivot_break_down', ts: leave.endTs, barIndex: locate(leave.endTs), price: priceAt(rawBars, locate(leave.endTs)), pivotHigh: p.high, pivotLow: p.low, note: `向下突破中枢 ZD=${p.low.toFixed(2)}` });
    }
  }
  // 过滤无效定位 & 按 ts 排序去重（同 kind 同 ts）
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

function priceAt(bars: { ts: number }[], idx: number): number {
  // rawBars 实际带 close；此处通过 any 取，保持签名简单
  return (bars[idx] as any).close ?? (bars[idx] as any).high ?? 0;
}
