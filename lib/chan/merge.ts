import { RawBar, MergedBar } from './types';

/**
 * 包含关系处理（缠论预处理）：
 * 前后K线存在包含（A.high>=B.high && A.low<=B.low，或反之）时按趋势方向合并。
 * 向上趋势：high 取 max，low 取 max；向下趋势：high 取 min，low 取 min。
 * 首根K线方向由其与前一根原始K线关系决定，无前文时默认向上。
 */
export function mergeBars(bars: RawBar[]): MergedBar[] {
  if (bars.length === 0) return [];
  const out: MergedBar[] = [];
  let prev: MergedBar = { ...bars[0], dir: 1, startTs: bars[0].ts, barCount: 1 };
  out.push(prev);

  for (let i = 1; i < bars.length; i++) {
    const b = bars[i];
    // 默认方向：与上一根合并K线的收盘比较（仅用于无包含时的方向维持）
    const contains = (prev.high >= b.high && prev.low <= b.low) || (prev.high <= b.high && prev.low >= b.low);
    if (contains) {
      if (prev.dir === 1) {
        prev = {
          ...prev,
          high: Math.max(prev.high, b.high),
          low: Math.max(prev.low, b.low),
          close: b.close,
          vol: prev.vol + b.vol,
          barCount: prev.barCount + 1,
        };
      } else {
        prev = {
          ...prev,
          high: Math.min(prev.high, b.high),
          low: Math.min(prev.low, b.low),
          close: b.close,
          vol: prev.vol + b.vol,
          barCount: prev.barCount + 1,
        };
      }
      out[out.length - 1] = prev;
    } else {
      const dir: 1 | -1 = b.high > prev.high ? 1 : -1;
      prev = { ...b, dir, startTs: b.ts, barCount: 1 };
      out.push(prev);
    }
  }
  return out;
}
