import { RawBar } from './types';
import { mergeBars } from './merge';
import { findFractals } from './fractal';
import { buildStrokes } from './stroke';
import { findPivots } from './pivot';
import { findSignals } from './signals';
import { buildSegments, Segment } from './segment';
import { atr, filterWeakFractals } from './quality';
import { environmentAt, Environment } from './multilevel';

export interface ChanAnalysis {
  mergedCount: number;
  fractalCount: number;
  strokes: ReturnType<typeof buildStrokes>;
  segments: Segment[];
  pivots: ReturnType<typeof findPivots>;
  signals: (ReturnType<typeof findSignals>[number] & { environment?: Environment })[];
}

/** 完整缠论流水线：原始K线 → 合并 → 分型(强度过滤) → 笔 → 线段 → 中枢 → 买卖点（含背驰） */
export function analyze(bars: RawBar[], opts?: { fractalFilter?: boolean; bigContext?: { pivots: { high: number; low: number; endTs: number }[]; bars: { ts: number; high: number; low: number; close: number }[] } }): ChanAnalysis {
  const merged = mergeBars(bars);
  const atrArr = atr(bars, 14);
  let fractals = findFractals(merged);
  if (opts?.fractalFilter !== false) {
    fractals = filterWeakFractals(fractals, merged, atrArr, 0.15);
  }
  const strokes = buildStrokes(fractals);
  const segments = buildSegments(strokes);
  const pivots = findPivots(strokes);
  const signals = findSignals(pivots, strokes, bars);
  const annotated = opts?.bigContext
    ? signals.map(s => ({ ...s, environment: environmentAt(opts.bigContext!.pivots, opts.bigContext!.bars, s.ts) }))
    : signals;
  return { mergedCount: merged.length, fractalCount: fractals.length, strokes, segments, pivots, signals: annotated };
}
