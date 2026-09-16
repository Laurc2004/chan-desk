'use client';
import { useEffect, useRef, useState } from 'react';
import { AnalysisState } from '@/app/page';
import { getSymbols } from '@/lib/bitget';

interface Msg { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'TSLA 15分钟级别最近的三买信号，历史上胜率怎么样？',
  'NVDA 现在能不能做多？先帮我看看中枢结构',
  '休市时段触发的三买和盘中触发的有什么区别？',
];

// 本地规则回退：LLM 不可用时仍可解析（演示容错）
function localParse(q: string, symbols: string[]): { symbol?: string; gran?: string; kind?: string } {
  const out: { symbol?: string; gran?: string; kind?: string } = {};
  const sym = symbols.find(s => q.toUpperCase().includes(s.replace('USDT', '')));
  if (sym) out.symbol = sym;
  if (/15|十五/.test(q)) out.gran = '15m';
  if (/1H|小时|60/.test(q)) out.gran = '1H';
  if (/三买/.test(q)) out.kind = 'sanmai_buy';
  if (/三卖/.test(q)) out.kind = 'sanmai_sell';
  return out;
}

export default function ChatPanel({ symbol, gran, state, onApplyQuery }: {
  symbol: string; gran: string;
  state: AnalysisState | null;
  onApplyQuery: (q: string, sym?: string, g?: string) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', content: '你好，我是 ChanDesk 分析师。告诉我你的交易想法（标的/级别/信号类型），我会调出该信号在 Bitget rToken 历史上的全部触发与统计分布。最终决策由你做出。' },
  ]);
  const [input, setInput] = useState('');
  const [symbols, setSymbols] = useState<string[]>([symbol]);
  useEffect(() => { getSymbols().then(setSymbols); }, []);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  function buildContext(q: string) {
    if (!state) return '';
    const lines = state.stats.map(st => {
      const f = (s: typeof st.byWindow.inHours) =>
        `n=${s.n} win12=${s.winRate12 === null ? '-' : (s.winRate12 * 100).toFixed(0) + '%'} median=${s.medianRet12?.toFixed(2) ?? '-'}% payoff=${s.payoff?.toFixed(2) ?? '-'} worst=${s.worstRet12?.toFixed(2) ?? '-'}%`;
      return `${st.kind}(总${st.sampleSize}) 盘中[${f(st.byWindow.inHours)}] 休市[${f(st.byWindow.offHours)}]`;
    });
    const last = state.signals[state.signals.length - 1];
    return [
      `当前标的 ${state.symbol} ${state.gran}，数据区间 ${new Date(state.bars[0].ts).toISOString().slice(0, 10)} → ${new Date(state.bars[state.bars.length - 1].ts).toISOString().slice(0, 10)}（${state.bars.length}根）。`,
      `信号统计（12根K线窗口，美股盘中 vs 休市窗口）：`,
      ...lines,
      last ? `最新信号：${last.kind} @ ${new Date(last.ts).toISOString().slice(0, 16)} ${last.note}` : '当前无未决信号。',
    ].join('\n');
  }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setMsgs(m => [...m, { role: 'user', content: q }]);
    setBusy(true);
    try {
      const parsed = localParse(q, symbols);
      onApplyQuery(q, parsed.symbol, parsed.gran);
      const sys = `你是 ChanDesk 的缠论分析师，服务对象是用缠论交易 Bitget rToken（代币化美股，7×24交易）的中文散户。基于给定的历史信号统计回答用户问题。规则：1) 只依据提供的数据说话，数字必须来自统计上下文，不得编造；2) 胜率低于40%或盈亏比<1时明确提示风险；3) 你只能给分析，不能替用户做决定，结尾必须让用户自行判断；4) 若涉及"美股睡了rToken还开着"的休市窗口差异，要点出这是rToken独有场景。`;
      const ctx = buildContext(q);
      const res = await fetch('/api/llm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream: true, messages: [
          { role: 'system', content: sys },
          { role: 'user', content: `历史统计上下文：\n${ctx}\n\n用户问题：${q}` },
        ] }),
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        setMsgs(m => [...m, { role: 'assistant', content: `（LLM 暂不可用：${json.error ?? res.status}）\n\n本地统计如下：\n${ctx}` }]);
        return;
      }
      // SSE 流式渲染：reasoning 模型首字慢，边收边显示
      setMsgs(m => [...m, { role: 'assistant', content: '' }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const j = JSON.parse(payload);
            const delta = j?.choices?.[0]?.delta?.content ?? j?.choices?.[0]?.message?.content ?? '';
            if (delta) {
              acc += delta;
              const snapshot = acc;
              setMsgs(m => {
                const copy = [...m];
                copy[copy.length - 1] = { role: 'assistant', content: snapshot };
                return copy;
              });
            }
          } catch { /* 忽略半包 */ }
        }
      }
      if (!acc) {
        setMsgs(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: `（LLM 返回为空）\n\n本地统计如下：\n${ctx}` };
          return copy;
        });
      }
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scroller.current?.scrollTo({ top: 1e9 }));
    }
  }

  return (
    <section className="border border-zinc-800 rounded-lg flex flex-col h-[560px]">
      <div className="px-3 py-2 border-b border-zinc-800 text-sm font-semibold text-zinc-300">投研对话</div>
      <div ref={scroller} className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {msgs.map((m, i) => (
          <div key={i} className={`rounded-lg p-2 whitespace-pre-wrap leading-relaxed ${m.role === 'user' ? 'bg-sky-950/60 ml-6' : 'bg-zinc-900/70 mr-2'}`}>
            {m.content}
          </div>
        ))}
        {busy && <div className="text-zinc-500 text-xs">分析师检索历史信号中…</div>}
      </div>
      {msgs.length <= 1 && (
        <div className="px-3 pb-2 space-y-1">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} className="block w-full text-left text-xs text-zinc-400 hover:text-sky-400 border border-zinc-800 rounded px-2 py-1 truncate">{s}</button>
          ))}
        </div>
      )}
      <div className="p-2 border-t border-zinc-800 flex gap-2">
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="描述你的交易想法…"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm"
        />
        <button onClick={() => send()} disabled={busy}
          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 rounded px-3 text-sm">发送</button>
      </div>
    </section>
  );
}
