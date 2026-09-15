import { Signal, SignalKind, RawBar } from '../chan/types';

/** 美股常规交易时段（ET）：9:30-16:00。rToken 7×24，其余时间为"休市窗口"。 */
export function inUsMarketHours(tsMs: number, etOffsetHours = -4): boolean {
  // 用 UTC 判定 ET：夏令时 EDT=UTC-4，冬令时 EST=UTC-5。粗略按月份推 ETF 偏移。
  const d = new Date(tsMs);
  const month = d.getUTCMonth() + 1; // 1-12
  const isDst = month >= 3 && month <= 11; // 3月中-11月初，近似
  const offset = etOffsetHours - (isDst ? 0 : 1); // 夏令 -4，冬令 -5
  const et = new Date(tsMs + (0 - offset) * -3600_000 * -1 + offset * 3600_000);
  // 直接计算：etMs = tsMs + offset*3600_000
  const etMs = tsMs + (isDst ? -4 : -5) * 3600_000;
  const etd = new Date(etMs);
  const day = etd.getUTCDay();
  if (day === 0 || day === 6) return false;
  const minutes = etd.getUTCHours() * 60 + etd.getUTCMinutes();
  return minutes >= 570 && minutes < 960; // 9:30 - 16:00
}

export interface Outcome {
  ts: number;              // 信号 t0
  entryPrice: number;
  ret1: number | null;     // t0+1 根收盘收益（%）
  ret4: number | null;     // t0+4
  ret12: number | null;    // t0+12
  ret24: number | null;    // t0+24
  maxFavorable: number | null;  // t0..t0+12 最大有利波动（按信号方向）
  maxAdverse: number | null;    // 最大不利波动
  inMarketHours: boolean;  // 信号触发时是否在美股盘中
}

export interface ReplayStats {
  kind: SignalKind;
  symbol: string;
  granularity: string;
  sampleSize: number;
  byWindow: {
    inHours: Stats;
    offHours: Stats;
  };
  outcomes: Outcome[];
}

export interface Stats {
  n: number;
  winRate12: number | null;   // ret12 方向一致的占比
  medianRet12: number | null;
  meanRet12: number | null;
  avgWin: number | null;      // 平均盈利笔（%）
  avgLoss: number | null;     // 平均亏损笔（%）
  payoff: number | null;      // |avgWin| / |avgLoss|
  worstRet12: number | null;
  medianMaxAdverse: number | null;
}

export function replay(signal: Signal, bars: RawBar[], horizon = 12): Outcome | null {
  const i = signal.barIndex;
  if (i < 0 || i + 1 >= bars.length) return null;
  const dir = signal.kind.includes('buy') || signal.kind.includes('up') ? 1 : -1;
  const entry = signal.price;
  const ret = (k: number): number | null => {
    const j = i + k;
    if (j >= bars.length) return null;
    return ((bars[j].close - entry) / entry) * 100 * dir;
  };
  const end = Math.min(i + horizon, bars.length - 1);
  let mf: number | null = null, ma: number | null = null;
  for (let j = i + 1; j <= end; j++) {
    const fav = dir === 1 ? (bars[j].high - entry) / entry * 100 : (entry - bars[j].low) / entry * 100;
    const adv = dir === 1 ? (entry - bars[j].low) / entry * 100 : (bars[j].high - entry) / entry * 100;
    mf = Math.max(mf ?? -Infinity, fav);
    ma = Math.max(ma ?? -Infinity, adv);
  }
  return {
    ts: signal.ts, entryPrice: entry,
    ret1: ret(1), ret4: ret(4), ret12: ret(12), ret24: ret(24),
    maxFavorable: mf, maxAdverse: ma,
    inMarketHours: inUsMarketHours(signal.ts),
  };
}

export function summarize(outcomes: Outcome[]): Stats {
  const valid = outcomes.filter(o => o.ret12 !== null) as (Outcome & { ret12: number })[];
  if (valid.length === 0) return { n: 0, winRate12: null, medianRet12: null, meanRet12: null, avgWin: null, avgLoss: null, payoff: null, worstRet12: null, medianMaxAdverse: null };
  const rets = valid.map(o => o.ret12);
  const sorted = [...rets].sort((a, b) => a - b);
  const median = (arr: number[]) => arr.length % 2 ? arr[(arr.length - 1) / 2] : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
  const wins = rets.filter(r => r > 0), losses = rets.filter(r => r <= 0);
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : null;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : null;
  const mas = valid.map(o => o.maxAdverse).filter((x): x is number => x !== null).sort((a, b) => a - b);
  return {
    n: valid.length,
    winRate12: wins.length / valid.length,
    medianRet12: median(sorted),
    meanRet12: rets.reduce((a, b) => a + b, 0) / rets.length,
    avgWin, avgLoss,
    payoff: avgWin && avgLoss ? avgWin / avgLoss : null,
    worstRet12: sorted[0],
    medianMaxAdverse: mas.length ? median(mas) : null,
  };
}

export function replayAll(
  symbol: string, granularity: string,
  signals: Signal[], bars: RawBar[],
): ReplayStats[] {
  const kinds = [...new Set(signals.map(s => s.kind))];
  return kinds.map(kind => {
    const sigs = signals.filter(s => s.kind === kind);
    const outcomes = sigs.map(s => replay(s, bars)).filter((o): o is Outcome => o !== null);
    return {
      kind, symbol, granularity, sampleSize: outcomes.length,
      byWindow: {
        inHours: summarize(outcomes.filter(o => o.inMarketHours)),
        offHours: summarize(outcomes.filter(o => !o.inMarketHours)),
      },
      outcomes,
    };
  });
}
