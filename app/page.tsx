'use client';
// 主工作台：左对话 / 中K线+统计 / 右决策
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

const KIND_LABELS: Record<SignalKind, string> = {
  sanmai_buy: '三买', sanmai_sell: '三卖',
  pivot_break_up: '中枢上破', pivot_break_down: '中枢下破',
  yimai_buy: '一买', yimai_sell: '一卖', ermai_buy: '二买', ermai_sell: '二卖',
};

const ENV_LABELS: Record<string, string> = {
  uptrend: '1H上升趋势', downtrend: '1H下降趋势', range: '1H中枢震荡',
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
      // 15m 时用 1H 做大级别环境；1H 时无更大数据，环境留空
      let bigContext: Parameters<typeof analyze>[1] extends undefined ? undefined : ReturnType<typeof analyze> extends never ? never : { pivots: { high: number; low: number; endTs: number }[]; bars: { ts: number; high: number; low: number; close: number }[] } | undefined;
      bigContext = undefined;
      if (g === '15m') {
        try {
          const bigBars = await loadBars(sym, '1H');
          const big = analyze(bigBars);
          bigContext = { pivots: big.pivots, bars: bigBars };
        } catch { /* 大级别数据缺失时跳过环境标注 */ }
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

  return (
    <main className="min-h-screen bg-[#0b0e14] text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-4 flex-wrap">
        <h1 className="text-lg font-semibold tracking-wide">
          ChanDesk <span className="text-zinc-400 text-sm font-normal">缠论决策压力测试台 · Bitget rToken 7×24</span>
        </h1>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <select value={symbol} onChange={e => setSymbol(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1">
            {symbols.map(s => <option key={s} value={s}>{s.replace('USDT', '')}</option>)}
          </select>
          <select value={gran} onChange={e => setGran(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1">
            {GRANULARITIES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr_320px] gap-4 p-4">
        <ChatPanel
          symbol={symbol} gran={gran}
          state={state}
          onApplyQuery={(q: string, sym?: string, g?: string) => { if (sym) setSymbol(sym); if (g) setGran(g); }}
        />
        <section className="space-y-4">
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            {loading || !state ? (
              <div className="h-[420px] flex items-center justify-center text-zinc-500 text-sm">加载 K 线与缠论结构中…</div>
            ) : (
              <KlineChart bars={state.bars} signals={visibleSignals} pivots={analyze(state.bars).pivots} symbol={symbol} gran={gran} />
            )}
          </div>
          {state && latestSignal && (latestSignal as Signal & { environment?: string }).environment && (
            <div className="border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-400">
              最新信号所处 1H 环境：<span className="text-sky-400">{ENV_LABELS[(latestSignal as Signal & { environment?: string }).environment!]}</span>
              （多级别联立：15m 信号在大级别趋势中的位置决定其含义权重）
            </div>
          )}
          {state && (
            <>
              <AggregatePanel gran={gran} />
              <StatsPanel
                stats={state.stats}
                selectedKind={selectedKind}
                onSelectKind={(k: SignalKind | 'all') => setSelectedKind(k)}
                kindLabels={KIND_LABELS}
              />
            </>
          )}
        </section>
        {state && (
          <DecisionPanel
            symbol={symbol} gran={gran}
            latestSignal={latestSignal}
            stats={latestSignal ? state.stats.find(s => s.kind === latestSignal.kind) : undefined}
            outcomes={latestSignal ? state.stats.find(s => s.kind === latestSignal.kind)?.outcomes : undefined}
          />
        )}
      </div>
      <footer className="px-6 py-3 text-xs text-zinc-500 border-t border-zinc-800">
        数据：Bitget 公开行情（rToken 合约 {symbols.length} 标的）· 缠论引擎 TS 实现 · AI 仅提供分析，交易决策由交易员作出
      </footer>
    </main>
  );
}
