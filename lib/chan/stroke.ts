import { Fractal, Stroke } from './types';

/**
 * 笔的划分（简化缠论笔规则）：
 * 1. 顶底分型交替连接
 * 2. 顶分型中心到底分型中心之间（含两侧分型的三根合并K线）至少 5 根合并K线，
 *    等价于 index 差 >= 4（czsc 宽松版标准）
 * 3. 向上笔：底→顶，笔区间 [bottom.low, top.high]；向下笔对称
 * 4. 分型强度过滤：顶分型高点须为区间内最高（处理同向连续分型时取更极端者）
 */
export function buildStrokes(fractals: Fractal[]): Stroke[] {
  // 先做"同向取极值、异向合并"的分型序列整理
  const fs: Fractal[] = [];
  for (const f of fractals) {
    const last = fs[fs.length - 1];
    if (!last) { fs.push(f); continue; }
    if (last.kind === f.kind) {
      // 同向分型：顶取更高、底取更低
      if (f.kind === 'top' && f.high >= last.high) fs[fs.length - 1] = f;
      if (f.kind === 'bottom' && f.low <= last.low) fs[fs.length - 1] = f;
    } else {
      fs.push(f);
    }
  }

  const strokes: Stroke[] = [];
  for (let i = 1; i < fs.length; i++) {
    const a = fs[i - 1], b = fs[i];
    if (b.index - a.index < 4) continue; // 不满足笔的最小长度
    const dir: 1 | -1 = a.kind === 'bottom' ? 1 : -1;
    const top = dir === 1 ? b : a;
    const bottom = dir === 1 ? a : b;
    strokes.push({
      startTs: a.ts, endTs: b.ts, dir,
      high: top.high, low: bottom.low,
      startIndex: a.index, endIndex: b.index,
    });
  }

  // 修正：因跳过短分型对，可能产生同向连续笔——同向时合并为一笔（取极值区间）
  const merged: Stroke[] = [];
  for (const s of strokes) {
    const last = merged[merged.length - 1];
    if (last && last.dir === s.dir) {
      last.high = Math.max(last.high, s.high);
      last.low = Math.min(last.low, s.low);
      last.endTs = s.endTs; last.endIndex = s.endIndex;
    } else {
      merged.push({ ...s });
    }
  }
  return merged;
}
