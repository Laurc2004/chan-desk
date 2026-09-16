'use client';
import { useState } from 'react';

const STEPS = [
  { n: 1, title: '选择标的与级别', desc: '顶部下拉切换 rToken（48 个标的）与 K 线周期（15m / 1H）' },
  { n: 2, title: '说出交易想法', desc: '左栏对话输入，例如「TSLA 15 分钟的三买胜率怎么样」' },
  { n: 3, title: '看证据，不看观点', desc: '中栏给出该信号在历史上的全部触发点 + 分窗口胜率/盈亏分布' },
  { n: 4, title: '你来拍板', desc: '右栏写下理由，点「采纳 / 忽略」——AI 不替你下单' },
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
        ？ 使用指南
      </button>
    );
  }

  return (
    <div className="panel p-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--brand), transparent)' }}></div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]"></span>
          ChanDesk 怎么用——四步完成一次决策压力测试
        </h2>
        <button onClick={() => { setOpen(false); localStorage.setItem('chandesk_guide', 'closed'); }}
          className="text-[var(--fg-2)] hover:text-[var(--fg-0)] text-lg leading-none px-1">×</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
        {STEPS.map(s => (
          <div key={s.n} className="bg-[var(--bg-2)] rounded-lg p-3 border border-[var(--line)]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold"
                style={{ background: 'var(--brand)', color: '#06121a' }}>{s.n}</span>
              <span className="text-[12px] font-semibold">{s.title}</span>
            </div>
            <p className="text-[11px] text-[var(--fg-1)] leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
