import { RawBar } from './types';
import { mergeBars } from './merge';
import { findFractals } from './fractal';
import { buildStrokes } from './stroke';
import { findPivots } from './pivot';
import { findSignals } from './signals';
import { buildSegments, Segment } from './segment';

export interface ChanAnalysis {
  mergedCount: number;
  fractalCount: number;
  strokes: ReturnType<typeof buildStrokes>;
  segments: Segment[];
  pivots: ReturnType<typeof findPivots>;
  signals: ReturnType<typeof findSignals>;
}

/** 完整缠论流水线：原始K线 → 合并 → 分型 → 笔 → 线段 → 中枢 → 买卖点（含背驰） */
export function analyze(bars: RawBar[]): ChanAnalysis {
  const merged = mergeBars(bars);
  const fractals = findFractals(merged);
  const strokes = buildStrokes(fractals);
  const segments = buildSegments(strokes);
  const pivots = findPivots(strokes);
  const signals = findSignals(pivots, strokes, bars);
  return { mergedCount: merged.length, fractalCount: fractals.length, strokes, segments, pivots, signals };
}
