'use client';
// 主工作台：顶部引导 → 左对话 / 中K线+统计 / 右决策
import { useCallback, useEffect, useMemo, useState } from 'react';
import { analyze } from '@/lib/chan';
import { replayAll, ReplayStats } from '@/lib/replay/replay';
import { loadBars, getSymbols, GRANULARITIES } from '@/lib/bitget';
import { Signal, SignalKind } from '@/lib/chan/types';
import KlineChart from '@/components/KlineChartNoSSR';
import StatsPanel from '@/components/StatsPanel';
import AggregatePanel from '@/components/AggregatePanel';
import DecisionPanel from '@/components/DecisionPanel';
import ChatPanel from '@/components/ChatPanel';
import GuideBanner from '@/components/GuideBanner';

const KIND_LABELS: Record<SignalKind, string> = {
  sanmai_buy: '三买', sanmai_sell: '三卖',
  pivot_break_up: '中枢上破', pivot_break_down: '中枢下破',
  yimai_buy: '一买', yimai_sell: '一卖', ermai_buy: '二买', ermai_sell: '二卖',
};

const ENV_LABELS: Record<string, string> = {
  uptrend: '1H 上升趋势', downtrend: '1H 下降趋势', range: '1H 中枢震荡',
};

export interface AnalysisState {
  symbol: string;
  gran: string;
  bars: { ts: number; open: number; high: number; low: number; close: number; vol: number }[];
  signals: Signal[];
  stats: ReplayStats[];
}

export default function Home() {
  const [symbols, setSymbols] = useState<string[]>(['TSLAUSDT']);
  const [symbol, setSymbol] = useState<string>('TSLAUSDT');
  const [gran, setGran] = useState<string>('15m');
  const [state, setState] = useState<AnalysisState | null>(null);
  const [selectedKind, setSelectedKind] = useState<SignalKind | 'all'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => { getSymbols().then(setSymbols); }, []);

  const runAnalysis = useCallback(async (sym: string, g: string) => {
    setLoading(true);
    try {
      const bars = await loadBars(sym, g);
      let bigContext: { pivots: { high: number; low: number; endTs: number }[]; bars: { ts: number; high: number; low: number; close: number }[] } | undefined;
      if (g === '15m') {
        try {
          const bigBars = await loadBars(sym, '1H');
          const big = analyze(bigBars);
          bigContext = { pivots: big.pivots, bars: bigBars };
        } catch { /* 大级别数据缺失时跳过 */ }
      }
      const a = analyze(bars, bigContext ? { bigContext } : undefined);
      const stats = replayAll(sym, g, a.signals, bars);
      setState({ symbol: sym, gran: g, bars, signals: a.signals, stats });
    } catch { /* 标的数据缺失 */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { runAnalysis(symbol, gran); }, [symbol, gran, runAnalysis]);

  const visibleSignals = useMemo(() => {
    if (!state) return [];
    return selectedKind === 'all' ? state.signals : state.signals.filter(s => s.kind === selectedKind);
  }, [state, selectedKind]);

  const latestSignal = useMemo(() => {
    if (!state || state.signals.length === 0) return null;
    return state.signals[state.signals.length - 1];
  }, [state]);

  const signalCount = state?.signals.length ?? 0;

  return (
    <main className="min-h-screen bg-[#0b0e14] text-zinc-100">
      {/* 顶栏 */}
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-4 flex-wrap sticky top-0 bg-[#0b0e14]/95 backdrop-blur z-20">
        <h1 className="text-lg font-bold tracking-wide">
          ChanDesk <span className="text-sky-400">缠论决策压力测试台</span>
        </h1>
        <span className="hidden md:inline text-xs text-zinc-500 border border-zinc-800 rounded px-1.5 py-0.5">Bitget rToken · 7×24</span>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span className="text-xs text-zinc-500">标的</span>
          <select value={symbol} onChange={e => setSymbol(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 hover:border-zinc-500">
            {symbols.map(s => <option key={s} value={s}>{s.replace('USDT', '')}</option>)}
          </select>
          <span className="text-xs text-zinc-500">周期</span>
          <select value={gran} onChange={e => setGran(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 hover:border-zinc-500">
            {GRANULARITIES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 py-3 space-y-3">
        <GuideBanner />

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr_330px] gap-3">
          {/* 左：对话 */}
          <ChatPanel symbol={symbol} gran={gran} state={state}
            onApplyQuery={(q: string, sym?: string, g?: string) => { if (sym && sym !== symbol) setSymbol(sym); if (g && g !== gran) setGran(g); }} />

          {/* 中：K线 + 统计 */}
          <section className="space-y-3 min-w-0">
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-3 text-xs text-zinc-400 bg-zinc-900/40">
                <span className="font-semibold text-zinc-200 text-sm">{symbol.replace('USDT', '')} · {gran}</span>
                {loading ? <span className="text-sky-400">计算缠论结构中…</span> : (
                  <>
                    <span>{signalCount} 个信号</span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-emerald-400">▲ 买类标注</span>
                    <span className="text-red-400">▼ 卖类标注</span>
                    <span className="text-sky-400">⊞ 中枢区间</span>
                    <span className="ml-auto text-zinc-500 hidden md:inline">滚轮缩放 · 拖拽平移</span>
                  </>
                )}
              </div>
              {loading || !state ? (
                <div className="h-[440px] flex items-center justify-center text-zinc-500 text-sm">加载 K 线与缠论结构中…</div>
              ) : (
                <KlineChart bars={state.bars} signals={visibleSignals} pivots={analyze(state.bars).pivots} symbol={symbol} gran={gran} />
              )}
            </div>

            {state && latestSignal && (latestSignal as Signal & { environment?: string }).environment && (
              <div className="border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-400 flex items-center gap-2">
                <span className="text-zinc-500">多级别联立：</span>
                最新信号处于 <span className="text-sky-400 font-medium">{ENV_LABELS[(latestSignal as Signal & { environment?: string }).environment!]}</span>
                <span className="text-zinc-600">（15m 信号在 1H 环境中的位置决定含义权重）</span>
              </div>
            )}

            {state && (
              <>
                <StatsPanel stats={state.stats} selectedKind={selectedKind}
                  onSelectKind={(k: SignalKind | 'all') => setSelectedKind(k)} kindLabels={KIND_LABELS} />
                <AggregatePanel gran={gran} />
              </>
            )}
          </section>

          {/* 右：决策 */}
          {state && (
            <DecisionPanel symbol={symbol} gran={gran} latestSignal={latestSignal}
              stats={latestSignal ? state.stats.find(s => s.kind === latestSignal.kind) : undefined}
              outcomes={latestSignal ? state.stats.find(s => s.kind === latestSignal.kind)?.outcomes : undefined} />
          )}
        </div>
      </div>

      <footer className="px-6 py-4 text-xs text-zinc-500 border-t border-zinc-800 mt-4 flex flex-wrap gap-x-4 gap-y-1">
        <span>数据：Bitget 公开行情（rToken 合约 {symbols.length} 标的）</span>
        <span>缠论引擎：TypeScript 实现（分型→笔→线段→中枢→买卖点+背驰）</span>
        <span>AI：Qwen3.8-max（Bitget 黑客松额度）</span>
        <span className="text-zinc-400">AI 仅提供分析，交易决策由交易员作出</span>
      </footer>
    </main>
  );
}
