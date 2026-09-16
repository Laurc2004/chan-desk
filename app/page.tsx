'use client';
// 主工作台：顶部引导 → 左对话 / 中K线+统计 / 右决策（OKX 交互 + Bitget 主题）
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Select } from '@/components/Select';

const KIND_LABELS: Record<SignalKind, string> = {
  sanmai_buy: '三买', sanmai_sell: '三卖',
  pivot_break_up: '中枢上破', pivot_break_down: '中枢下破',
  yimai_buy: '一买', yimai_sell: '一卖', ermai_buy: '二买', ermai_sell: '二卖', leimai_buy: '类二买', leimai_sell: '类二卖',
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

// 前端轻量增量刷新：经本站 /api/bars 代理拉 Bitget 最新K线（浏览器直连 Bitget 有 CORS/网络问题）
async function fetchRecentBars(sym: string, g: string, sinceTs: number): Promise<{ ts: number; open: number; high: number; low: number; close: number; vol: number }[]> {
  try {
    const res = await fetch(`/api/bars?symbol=${sym}&gran=${g}&since=${sinceTs}`);
    const json = await res.json();
    return Array.isArray(json.bars) ? json.bars : [];
  } catch { return []; }
}

const REFRESH_MS = 60_000; // 每 60s 轮询一次新 K 线

export default function Home() {
  const [symbols, setSymbols] = useState<string[]>(['TSLAUSDT']);
  const [symbol, setSymbol] = useState<string>('TSLAUSDT');
  const [gran, setGran] = useState<string>('15m');
  const [state, setState] = useState<AnalysisState | null>(null);
  const [selectedKind, setSelectedKind] = useState<SignalKind | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const stateRef = useRef<AnalysisState | null>(null);
  stateRef.current = state;

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
      setLastUpdate(Date.now());
      setLivePrice(bars[bars.length - 1]?.close ?? null);
    } catch { /* 标的数据缺失 */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { runAnalysis(symbol, gran); }, [symbol, gran, runAnalysis]);

  // 定时增量刷新：拉最新 K 线合并后重算
  useEffect(() => {
    const id = setInterval(async () => {
      const cur = stateRef.current;
      if (!cur || cur.symbol !== symbol || cur.gran !== gran) return;
      const lastTs = cur.bars[cur.bars.length - 1].ts;
      const fresh = await fetchRecentBars(symbol, gran, lastTs);
      setRefreshing(true);
      try {
        let bars = cur.bars;
        if (fresh.length > 0) {
          bars = [...cur.bars, ...fresh];
        }
        // 无论有没有新K线，都用最新价刷新（轮询的 ticker 也带价格）
        const a = analyze(bars);
        const stats = replayAll(symbol, gran, a.signals, bars);
        setState({ symbol, gran, bars, signals: a.signals, stats });
        setLivePrice(bars[bars.length - 1]?.close ?? null);
        setLastUpdate(Date.now());
      } catch { /* 保持旧数据 */ }
      finally { setRefreshing(false); }
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [symbol, gran]);

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
    <main className="min-h-screen" style={{ background: 'var(--bg-0)', color: 'var(--fg-0)' }}>
      {/* ===== 顶栏 ===== */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] px-5 py-2.5 flex items-center gap-4 flex-wrap"
        style={{ background: 'rgba(10,14,23,.92)', backdropFilter: 'blur(8px)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm"
            style={{ background: 'var(--brand)', color: '#06121a' }}>缠</div>
          <h1 className="text-[15px] font-bold tracking-wide">
            ChanDesk <span className="text-[var(--brand)] font-semibold">缠论决策压力测试台</span>
          </h1>
        </div>
        <span className="hidden md:inline text-[11px] text-[var(--fg-2)] border border-[var(--line)] rounded px-1.5 py-0.5">
          Bitget rToken · 7×24
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-[var(--fg-2)]">标的</span>
          <Select value={symbol.replace('USDT', '')} options={symbols.map(s => s.replace('USDT', ''))}
            onChange={v => setSymbol(v + 'USDT')} width={110} searchable />
          <span className="text-[11px] text-[var(--fg-2)]">周期</span>
          <Select value={gran} options={GRANULARITIES as unknown as string[]} onChange={setGran} width={72} />
          {lastUpdate && (
            <span className="text-[11px] text-[var(--fg-2)] num ml-1 hidden lg:inline" title="每 60s 经本站代理自动拉取 Bitget 最新K线">
              {refreshing ? '⟳ 刷新中…' : `⟳ ${new Date(lastUpdate).toLocaleTimeString('zh-CN', { hour12: false })}`}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 py-3 space-y-3">
        <GuideBanner />

        <div className="grid grid-cols-1 xl:grid-cols-[370px_1fr_340px] gap-3">
          {/* ===== 左：对话 ===== */}
          <ChatPanel symbol={symbol} gran={gran} state={state}
            onApplyQuery={(q: string, sym?: string, g?: string) => { if (sym && sym !== symbol) setSymbol(sym); if (g && g !== gran) setGran(g); }} />

          {/* ===== 中：K线 + 统计 ===== */}
          <section className="space-y-3 min-w-0">
            <div className="panel overflow-hidden">
              {/* K线工具条 */}
              <div className="panel-hd">
                <span className="text-[15px] font-bold num">{symbol.replace('USDT', '')}</span>
                <span className="text-[var(--fg-2)] text-[12px]">{gran}</span>
                {livePrice !== null && (
                  <span className="num text-[14px] font-semibold text-[var(--brand)]">{livePrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                )}
                {loading ? <span className="text-[var(--brand)] text-[11px] ml-2">计算缠论结构中…</span> : (
                  <>
                    <span className="text-[11px] text-[var(--fg-2)] ml-2">{signalCount} 信号</span>
                    <span className="hidden md:flex items-center gap-3 text-[11px] ml-auto">
                      <span className="text-[var(--up)]">▲ 买</span>
                      <span className="text-[var(--down)]">▼ 卖</span>
                      <span className="text-[var(--brand)]">⊞ 中枢</span>
                      <span className="text-[var(--fg-2)] hidden lg:inline">滚轮缩放 · 拖拽平移</span>
                    </span>
                  </>
                )}
              </div>
              {loading || !state ? (
                <div className="h-[440px] flex items-center justify-center text-[var(--fg-2)] text-[13px]">加载 K 线与缠论结构中…</div>
              ) : (
                <KlineChart bars={state.bars} signals={visibleSignals} pivots={analyze(state.bars).pivots} symbol={symbol} gran={gran} />
              )}
            </div>

            {state && latestSignal && (latestSignal as Signal & { environment?: string }).environment && (
              <div className="panel px-3 py-2 text-[12px] text-[var(--fg-1)] flex items-center gap-2">
                <span className="text-[var(--fg-2)]">多级别联立：</span>
                最新信号处于 <span className="text-[var(--brand)] font-medium">{ENV_LABELS[(latestSignal as Signal & { environment?: string }).environment!]}</span>
                <span className="text-[var(--fg-2)]">（15m 信号在 1H 环境中的位置决定含义权重）</span>
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

          {/* ===== 右：决策 ===== */}
          {state && (
            <DecisionPanel symbol={symbol} gran={gran} latestSignal={latestSignal}
              stats={latestSignal ? state.stats.find(s => s.kind === latestSignal.kind) : undefined}
              outcomes={latestSignal ? state.stats.find(s => s.kind === latestSignal.kind)?.outcomes : undefined} />
          )}
        </div>
      </div>

      <footer className="px-5 py-4 text-[11px] text-[var(--fg-2)] border-t border-[var(--line)] mt-4 flex flex-wrap gap-x-4 gap-y-1">
        <span>数据：Bitget 公开行情（rToken 合约 {symbols.length} 标的 · 每 60s 自动增量刷新）</span>
        <span>缠论引擎：TypeScript（分型→笔→线段→中枢→买卖点+背驰）</span>
        <span>AI：Qwen3.8-max（Bitget 黑客松额度）</span>
        <span className="text-[var(--brand)]">AI 仅提供分析，交易决策由交易员作出</span>
      </footer>
    </main>
  );
}
