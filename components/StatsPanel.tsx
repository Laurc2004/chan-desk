'use client';
import { ReplayStats } from '@/lib/replay/replay';
import { SignalKind } from '@/lib/chan/types';

const pct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? '—' : `${(v * 100).toFixed(0)}%`;
const num = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined ? '—' : v.toFixed(digits);

function StatsRow({ label, s }: { label: string; s: ReplayStats['byWindow']['inHours'] }) {
  return (
    <div className="grid grid-cols-[64px_1fr_1fr_1fr_1fr_1fr] gap-1 text-xs tabular-nums items-center">
      <span className="text-zinc-500">{label}</span>
      <span className={s.n === 0 ? 'text-zinc-600' : ''}>n={s.n}</span>
      <span className={s.winRate12 !== null && s.winRate12 >= 0.5 ? 'text-emerald-400' : 'text-zinc-300'}>胜率 {pct(s.winRate12)}</span>
      <span className={(s.medianRet12 ?? 0) > 0 ? 'text-emerald-400' : 'text-red-400'}>中位 {num(s.medianRet12)}%</span>
      <span>盈亏比 {num(s.payoff)}</span>
      <span className="text-red-400">最差 {num(s.worstRet12)}%</span>
    </div>
  );
}

export default function StatsPanel({ stats, selectedKind, onSelectKind, kindLabels }: {
  stats: ReplayStats[];
  selectedKind: SignalKind | 'all';
  onSelectKind: (k: SignalKind | 'all') => void;
  kindLabels: Record<SignalKind, string>;
}) {
  if (stats.length === 0) {
    return <div className="border border-zinc-800 rounded-lg p-4 text-sm text-zinc-500">当前区间未识别出可统计的缠论信号</div>;
  }
  return (
    <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-zinc-300">历史信号回放 · 决策压力测试</h2>
        <div className="ml-auto flex gap-1 text-xs">
          <button onClick={() => onSelectKind('all')}
            className={`px-2 py-0.5 rounded border ${selectedKind === 'all' ? 'border-sky-500 text-sky-400' : 'border-zinc-700 text-zinc-400'}`}>全部</button>
          {stats.map(st => (
            <button key={st.kind} onClick={() => onSelectKind(st.kind)}
              className={`px-2 py-0.5 rounded border ${selectedKind === st.kind ? 'border-sky-500 text-sky-400' : 'border-zinc-700 text-zinc-400'}`}>
              {kindLabels[st.kind]}·{st.sampleSize}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {stats.map(st => (
          <div key={st.kind} className={`rounded p-2 space-y-1 ${selectedKind === 'all' || selectedKind === st.kind ? 'bg-zinc-900/60' : 'bg-zinc-900/20 opacity-50'}`}>
            <div className="text-xs text-zinc-400">
              {kindLabels[st.kind]}（样本 {st.sampleSize}）· 12根K线窗口 · 美股盘中 vs 休市窗口
            </div>
            <StatsRow label="盘中" s={st.byWindow.inHours} />
            <StatsRow label="休市" s={st.byWindow.offHours} />
          </div>
        ))}
      </div>
      <p className="text-[11px] text-zinc-600">
        收益按信号方向计算（买类信号看涨、卖类看跌），含未计手续费的原始价差；样本量为该标的该周期全部历史触发。
      </p>
    </div>
  );
}
