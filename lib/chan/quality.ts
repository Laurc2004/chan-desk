import { MergedBar } from './types';

/**
 * 笔的质量校验与增强（缠论标准笔的补充规则）：
 *
 * 1. 分型强度（fractal strength）：顶分型若左右两根合并K线的高点差过小（< 阈值 × ATR），视为弱分型丢弃
 * 2. 缺口笔（gap stroke）：分型两侧存在价格跳空（第1与第2根合并K线无重叠）时，允许间距 < 5 也成笔
 *
 * ATR(14) 作为自适应尺度，避免固定阈值在不同价格量级的标的间失真。
 */
export function atr(bars: { high: number; low: number; close: number }[], period = 14): number[] {
  const out = new Array(bars.length).fill(0);
  let prevClose = bars[0]?.close ?? 0;
  let acc = 0;
  for (let i = 0; i < bars.length; i++) {
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - prevClose),
      Math.abs(bars[i].low - prevClose),
    );
    if (i < period) {
      acc += tr;
      out[i] = acc / (i + 1);
    } else {
      out[i] = (out[i - 1] * (period - 1) + tr) / period;
    }
    prevClose = bars[i].close;
  }
  return out;
}

/** 过滤弱分型：顶分型要求 (自身高点 - 左右两根高点较大者) ≥ k×ATR，底分型对称 */
export function filterWeakFractals(
  fractals: { index: number; ts: number; kind: 'top' | 'bottom'; high: number; low: number }[],
  mb: MergedBar[],
  atrArr: number[],
  k = 0.15,
) {
  return fractals.filter(f => {
    const left = mb[f.index - 1], right = mb[f.index + 1];
    if (!left || !right) return false;
    // 用分型中心附近 ATR（合并K线 index 可能超原始数组，取就近比例）
    const ai = Math.min(Math.round((f.index / Math.max(mb.length - 1, 1)) * (atrArr.length - 1)), atrArr.length - 1);
    const scale = atrArr[ai] || 1;
    if (f.kind === 'top') {
      return f.high - Math.max(left.high, right.high) >= k * scale;
    }
    return Math.min(left.low, right.low) - f.low >= k * scale;
  });
}
