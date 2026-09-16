'use client';
import { useState } from 'react';

const STEPS = [
  {
    n: 1, title: '选一个标的和周期',
    desc: '顶栏两个下拉框：左边换 rToken（48 个标的，TSLA/NVDA/SOXL…），右边换 K 线周期（15m 短线 / 1H 波段）。',
    try: '试试：把标的切到 NVDA，周期保持 15m',
  },
  {
    n: 2, title: '左栏说出你的交易想法',
    desc: '像跟分析师聊天一样打字，例如「TSLA 15 分钟的三买胜率怎么样」。AI 会自动切到对应标的并调出历史回放。',
    try: '试试：点输入框上方的建议问题直接发问',
  },
  {
    n: 3, title: '中栏看证据，不看观点',
    desc: 'K 线上 ▲▼ 是历史全部信号触发点，⊞ 蓝框是缠论中枢；下方统计表把同一信号分成「美股盘中」和「休市窗口」两组对比胜率。',
    try: '试试：点「三买」标签只看三买的标注',
  },
  {
    n: 4, title: '右栏你来拍板',
    desc: '写一句理由，点「采纳」或「忽略」。AI 永远不会替你下单——这是 ChanDesk 的人机边界，决策会落档可回看。',
    try: '试试：对最新信号写「休市窗口胜率高，小仓试错」并采纳',
  },
];

export default function GuideBanner() {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('chandesk_guide') !== 'closed';
  });

  if (!open) {
    return (
      <button onClick={() => { setOpen(true); localStorage.setItem('chandesk_guide', 'open'); }}
        className="text-[11px] text-[var(--fg-2)] hover:text-[var(--brand)] border border-[var(--line)] hover:border-[var(--brand-dim)] rounded-lg px-2.5 py-1 transition-colors">
        ？ 打开使用指南（四步上手）
      </button>
    );
  }

  return (
    <div className="panel p-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--brand), transparent)' }}></div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[13px] font-semibold flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]"></span>
          四步上手：给「我觉得这个信号最近不灵了」一个可检验的答案
        </h2>
        <button onClick={() => { setOpen(false); localStorage.setItem('chandesk_guide', 'closed'); }}
          className="text-[var(--fg-2)] hover:text-[var(--fg-0)] text-lg leading-none px-1">×</button>
      </div>
      <p className="text-[11px] text-[var(--fg-2)] mb-3">ChanDesk 不预测涨跌——它把你随口一句交易想法，放到 48 个 rToken 标的历史上逐 K 线回放，告诉你这话过去灵不灵、盘中和休市差多少。</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
        {STEPS.map(s => (
          <div key={s.n} className="bg-[var(--bg-2)] rounded-lg p-3 border border-[var(--line)] flex flex-col">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{ background: 'var(--brand)', color: '#06121a' }}>{s.n}</span>
              <span className="text-[12px] font-semibold">{s.title}</span>
            </div>
            <p className="text-[11px] text-[var(--fg-1)] leading-relaxed flex-1">{s.desc}</p>
            <p className="text-[10px] text-[var(--brand)] mt-1.5 leading-relaxed">{s.try}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
