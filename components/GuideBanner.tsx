'use client';
import { useState } from 'react';

const STEPS = [
  { n: 1, title: '选择标的与级别', desc: '顶部下拉切换 rToken（48 个标的）与 K 线周期（15m / 1H）' },
  { n: 2, title: '说出交易想法', desc: '左栏对话输入，例如「TSLA 15 分钟的三买信号胜率怎么样？」' },
  { n: 3, title: '查看压力测试', desc: '中间 K 线标注历史信号（▲买 ▼卖 ⊞中枢），下方是回放统计与全市场大样本' },
  { n: 4, title: '你来决策', desc: '右栏对最新信号「采纳 / 忽略」并写理由——AI 只分析，决策永远是你的' },
];

export default function GuideBanner() {
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className={`border border-sky-900/60 bg-sky-950/30 rounded-lg overflow-hidden transition-all ${open ? '' : 'h-10'}`}>
      <div className="flex items-center gap-2 px-4 py-2 text-sm">
        <button onClick={() => setDismissed(true)} className="text-sky-400 font-medium">
          ChanDesk 使用指南
        </button>
        <span className="text-zinc-500 text-xs truncate">缠论信号在 Bitget rToken 上的历史回放与决策压力测试</span>
        <button onClick={() => setOpen(!open)} className="ml-auto text-xs text-zinc-400 hover:text-zinc-200">
          {open ? '收起 ▴' : '展开 ▾'}
        </button>
        <button onClick={() => setDismissed(true)} className="text-xs text-zinc-500 hover:text-zinc-300">✕</button>
      </div>
      {open && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4 pb-3">
          {STEPS.map(s => (
            <div key={s.n} className="bg-zinc-900/70 rounded p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="bg-sky-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{s.n}</span>
                <span className="text-xs font-semibold text-zinc-200">{s.title}</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
