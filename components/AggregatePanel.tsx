'use client';
import { useEffect, useState } from 'react';
import { SignalKind } from '@/lib/chan/types';

const KIND_LABELS: Record<SignalKind, string> = {
  sanmai_buy: '三买', sanmai_sell: '三卖',
  pivot_break_up: '中枢上破', pivot_break_down: '中枢下破',
  yimai_buy: '一买', yimai_sell: '一卖', ermai_buy: '二买', ermai_sell: '二卖',
};

interface AggStats { n: number; winRate12: number | null; medianRet12: number | null; payoff: number | null; worstRet12: number | null }
interface AggEntry { kind: SignalKind; total: number; inHours: AggStats & { ret12List: number[] }; offHours: AggStats & { ret12List: number[] } }
interface AggPayload { granularity: string; symbols: string[]; dateRange: string[]; entries: AggEntry[] }

const pct = (v: number | null) => v === null ? '—' : `${(v * 100).toFixed(0)}%`;
const num = (v: number | null) => v === null ? '—' : `${v.toFixed(2)}%`;

export default function AggregatePanel({ gran }: { gran: string }) {
  const [data, setData] = useState<AggPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setData(null); setError(false);
    fetch(`/data/aggregate_${gran}.json`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => setError(true));
  }, [gran]);

  if (error) return null;
  if (!data) return <div className="border border-zinc-800 rounded-lg p-4 text-sm text-zinc-500">加载全市场汇总…</div>;

  return (
    <div className="border border-zinc-800 rounded-lg p-4 space-y-2">
      <h2 className="text-sm font-semibold text-zinc-300">
        🌐 全市场大样本 ·  {data.symbols.length} 标的 × {data.dateRange[0]} → {data.dateRange[1]}
      </h2>
      <div className="grid grid-cols-[88px_1fr_1fr_1fr_1fr] text-xs text-zinc-500 pb-1 border-b border-zinc-800">
        <span>信号</span><span>样本</span><span>盘中胜率/中位</span><span>休市胜率/中位</span><span>盈亏比(盘/休)</span>
      </div>
      {data.entries.map(e => (
        <div key={e.kind} className="grid grid-cols-[88px_1fr_1fr_1fr_1fr] text-xs tabular-nums items-center">
          <span className="text-zinc-300">{KIND_LABELS[e.kind]}</span>
          <span className="text-zinc-400">{e.total}</span>
          <span>
            <span className={(e.inHours.winRate12 ?? 0) >= 0.5 ? 'text-emerald-400' : 'text-red-400'}>{pct(e.inHours.winRate12)}</span>
            <span className="text-zinc-500"> / {num(e.inHours.medianRet12)}</span>
          </span>
          <span>
            <span className={(e.offHours.winRate12 ?? 0) >= 0.5 ? 'text-emerald-400' : 'text-red-400'}>{pct(e.offHours.winRate12)}</span>
            <span className="text-zinc-500"> / {num(e.offHours.medianRet12)}</span>
          </span>
          <span className="text-zinc-400">{num2(e.inHours.payoff)} / {num2(e.offHours.payoff)}</span>
        </div>
      ))}
      <p className="text-[11px] text-zinc-600">同类信号跨 9 个 rToken 标的合并的大样本；12 根K线窗口按信号方向计收益。</p>
    </div>
  );
}

function num2(v: number | null) { return v === null ? '—' : v.toFixed(2); }
