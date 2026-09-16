'use client';
import { ReplayStats } from '@/lib/replay/replay';
import { SignalKind } from '@/lib/chan/types';

const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `${(v * 100).toFixed(0)}%`;
const num = (v: number | null | undefined, digits = 2) =>
  v === null || v === undefined ? '—' : v.toFixed(digits);

function StatsRow({ label, s }: { label: string; s: ReplayStats['byWindow']['inHours'] }) {
  const win = s.winRate12 ?? 0;
  return (
    <div className="grid grid-cols-[56px_1fr_1fr_1fr_1fr_1fr] gap-1 text-[12px] num items-center">
      <span className="text-[var(--fg-2)]">{label}</span>
      <span className={s.n === 0 ? 'text-[var(--fg-2)]' : 'text-[var(--fg-1)]'}>n={s.n}</span>
      <span className={s.winRate12 !== null && win >= 0.5 ? 'text-[var(--up)] font-medium' : 'text-[var(--down)]'}>胜率 {pct(s.winRate12)}</span>
      <span className={(s.medianRet12 ?? 0) > 0 ? 'text-[var(--up)]' : 'text-[var(--down)]'}>中位 {num(s.medianRet12)}%</span>
      <span className="text-[var(--fg-1)]">盈亏比 {num(s.payoff)}</span>
      <span className="text-[var(--down)]">最差 {num(s.worstRet12)}%</span>
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
    return <div className="panel p-4 text-[13px] text-[var(--fg-2)]">当前区间未识别出可统计的缠论信号</div>;
  }
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-[13px] font-semibold">📊 本标的信号回放 · 决策压力测试</h2>
        <span className="text-[11px] text-[var(--fg-2)]">点信号类型可筛选K线标注</span>
        <div className="ml-auto flex gap-1 text-[11px] flex-wrap">
          <button onClick={() => onSelectKind('all')}
            className={`px-2 py-0.5 rounded-md border transition-colors ${selectedKind === 'all' ? 'border-[var(--brand)] text-[var(--brand)] bg-[var(--brand)]/10' : 'border-[var(--line)] text-[var(--fg-2)] hover:text-[var(--fg-1)]'}`}>全部</button>
          {stats.map(st => (
            <button key={st.kind} onClick={() => onSelectKind(st.kind)}
              className={`px-2 py-0.5 rounded-md border transition-colors num ${selectedKind === st.kind ? 'border-[var(--brand)] text-[var(--brand)] bg-[var(--brand)]/10' : 'border-[var(--line)] text-[var(--fg-2)] hover:text-[var(--fg-1)]'}`}>
              {kindLabels[st.kind]}·{st.sampleSize}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {stats.map(st => (
          <div key={st.kind} className={`rounded-lg p-2.5 space-y-1.5 transition-opacity ${selectedKind === 'all' || selectedKind === st.kind ? 'bg-[var(--bg-2)]' : 'bg-[var(--bg-2)]/40 opacity-40'}`}>
            <div className="text-[11px] text-[var(--fg-2)]">
              <span className="text-[var(--fg-1)] font-medium">{kindLabels[st.kind]}</span>（样本 {st.sampleSize}）· 12根K线窗口 · 美股盘中 vs 休市窗口
            </div>
            <StatsRow label="盘中" s={st.byWindow.inHours} />
            <StatsRow label="休市" s={st.byWindow.offHours} />
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[var(--fg-2)] leading-relaxed">
        收益按信号方向计算（买类看涨、卖类看跌），12 根K线窗口，未计手续费。<span className="text-[var(--brand)]">美股盘中 vs 休市窗口（rToken 独有交易时段）分开统计——这是本产品的核心视角。</span>
      </p>
    </div>
  );
}
