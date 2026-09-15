'use client';
import { useMemo, useState } from 'react';
import { Signal } from '@/lib/chan/types';
import { ReplayStats, Outcome, inUsMarketHours } from '@/lib/replay/replay';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export default function DecisionPanel({ symbol, gran, latestSignal, stats, outcomes }: {
  symbol: string; gran: string;
  latestSignal: Signal | null;
  stats?: ReplayStats;
  outcomes?: Outcome[];
}) {
  const [decision, setDecision] = useState<'adopt' | 'ignore' | null>(null);
  const [reason, setReason] = useState('');
  const [saved, setSaved] = useState(false);

  const summary = useMemo(() => {
    if (!stats) return null;
    const all = stats.byWindow.inHours.n + stats.byWindow.offHours.n;
    if (all === 0) return null;
    const wins = Math.round(((stats.byWindow.inHours.winRate12 ?? 0) * stats.byWindow.inHours.n + (stats.byWindow.offHours.winRate12 ?? 0) * stats.byWindow.offHours.n) / all * 100);
    return { all, wins };
  }, [stats]);

  async function submit(d: 'adopt' | 'ignore') {
    setDecision(d);
    const db = getClient();
    if (!db) { setSaved(true); return; }
    try {
      await db.from('decisions').insert({
        symbol, granularity: gran,
        signal_kind: latestSignal?.kind ?? null,
        signal_ts: latestSignal?.ts ?? null,
        decision: d, reason,
      });
      setSaved(true);
    } catch { setSaved(true); /* 本地模式也放行 */ }
  }

  if (!latestSignal) {
    return (
      <aside className="border border-zinc-800 rounded-lg p-4 text-sm text-zinc-500">
        暂无最新信号。切换标的/周期，或等待回放引擎识别新结构。
      </aside>
    );
  }

  const inHours = inUsMarketHours(latestSignal.ts);

  return (
    <aside className="border border-zinc-800 rounded-lg p-4 space-y-3 text-sm">
      <div>
        <h2 className="font-semibold text-zinc-200">最新信号 · 决策</h2>
        <div className="mt-1 text-xs text-zinc-400 leading-relaxed">
          {new Date(latestSignal.ts).toLocaleString('zh-CN', { timeZone: 'America/New_York', hour12: false })} (ET)
          <br />{latestSignal.note}
          <br />触发窗口：<span className={inHours ? 'text-sky-400' : 'text-amber-400'}>{inHours ? '美股盘中' : '休市窗口（rToken 独有）'}</span>
        </div>
      </div>

      {summary && (
        <div className="bg-zinc-900/60 rounded p-2 text-xs leading-relaxed">
          历史同类信号 {summary.all} 次 · 12根K线窗口胜率约 {summary.wins}%。
          {stats && stats.byWindow.inHours.n > 0 && stats.byWindow.offHours.n > 0 && (
            <>盘中 {((stats.byWindow.inHours.winRate12 ?? 0) * 100).toFixed(0)}% vs 休市 {((stats.byWindow.offHours.winRate12 ?? 0) * 100).toFixed(0)}%</>
          )}
        </div>
      )}

      {decision === null ? (
        <>
          <textarea
            value={reason} onChange={e => setReason(e.target.value)}
            placeholder="一句话写下你的判断理由（必填，落档可回看）"
            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs h-16 resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => reason.trim() && submit('adopt')} disabled={!reason.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded py-2 font-medium">采纳</button>
            <button onClick={() => reason.trim() && submit('ignore')} disabled={!reason.trim()}
              className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 rounded py-2 font-medium">忽略</button>
          </div>
          <p className="text-[11px] text-zinc-600">AI 只提供分析。采纳或忽略由你决定——这是 ChanDesk 的边界。</p>
        </>
      ) : (
        <div className="space-y-1">
          <div className={`font-medium ${decision === 'adopt' ? 'text-emerald-400' : 'text-zinc-300'}`}>
            已记录：{decision === 'adopt' ? '采纳' : '忽略'} {saved && '✓'}
          </div>
          <p className="text-xs text-zinc-500">理由：{reason}</p>
          <p className="text-[11px] text-zinc-600">决策已入档案，可在档案页回看这次判断的对错。</p>
        </div>
      )}
    </aside>
  );
}
