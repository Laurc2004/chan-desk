'use client';
// 决策档案：读取当前浏览器会话的采纳/忽略记录，回看当时理由
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface DecisionRow {
  id: number;
  created_at: string;
  symbol: string;
  granularity: string;
  signal_kind: string;
  decision: 'adopt' | 'ignore';
  reason: string;
}

const KIND_LABELS: Record<string, string> = {
  sanmai_buy: '三买', sanmai_sell: '三卖', pivot_break_up: '中枢上破', pivot_break_down: '中枢下破',
  yimai_buy: '一买', yimai_sell: '一卖', ermai_buy: '二买', ermai_sell: '二卖',
};

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem('chandesk_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem('chandesk_sid', sid);
  }
  return sid;
}

export default function DecisionHistory({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<DecisionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setError('未配置'); return; }
    const db = createClient(url, key);
    db.from('decisions').select('*').eq('session_id', getSessionId()).order('created_at', { ascending: false }).limit(50)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(data as DecisionRow[]);
      });
  }, [refreshKey]);

  if (error === '未配置') return null;
  if (!rows) return <div className="text-[11px] text-[var(--fg-2)]">档案加载中…</div>;

  return (
    <div className="bg-[var(--bg-2)] border border-[var(--line)] rounded-lg p-3 space-y-2">
      <h3 className="text-[12px] font-semibold text-[var(--fg-0)]">🗂️ 我的决策档案（本次会话 {rows.length} 条）</h3>
      {rows.length === 0 && <p className="text-[11px] text-[var(--fg-2)]">还没有决策记录。在上方对最新信号点击采纳/忽略后会出现在这里。</p>}
      <div className="max-h-56 overflow-y-auto space-y-1.5">
        {rows.map(r => (
          <div key={r.id} className="bg-[var(--bg-3)] rounded-md p-2 text-[11px] leading-relaxed">
            <div className="flex items-center gap-2">
              <span className={r.decision === 'adopt' ? 'text-[var(--up)] font-medium' : 'text-[var(--fg-1)] font-medium'}>
                {r.decision === 'adopt' ? '✓ 采纳' : '✕ 忽略'}
              </span>
              <span className="text-[var(--fg-0)]">{r.symbol.replace('USDT', '')} · {KIND_LABELS[r.signal_kind] ?? r.signal_kind}</span>
              <span className="text-[var(--fg-2)] ml-auto num">{new Date(r.created_at).toLocaleString('zh-CN', { hour12: false })}</span>
            </div>
            {r.reason && <p className="text-[var(--fg-1)] mt-0.5">{r.reason}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
