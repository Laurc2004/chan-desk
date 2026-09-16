'use client';
import { useEffect, useMemo, useState } from 'react';
import { Signal } from '@/lib/chan/types';
import { ReplayStats, Outcome, inUsMarketHours } from '@/lib/replay/replay';
import { createClient } from '@supabase/supabase-js';
import DecisionHistory, { getSessionId } from './DecisionHistory';

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
  const [historyKey, setHistoryKey] = useState(0);

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
        session_id: getSessionId(),
        symbol, granularity: gran,
        signal_kind: latestSignal?.kind ?? null,
        signal_ts: latestSignal?.ts ?? null,
        decision: d, reason,
        entry_price: latestSignal?.price ?? null,
        stats_snapshot: stats ? { inHours: stats.byWindow.inHours, offHours: stats.byWindow.offHours } : null,
      });
      setSaved(true);
      setHistoryKey(k => k + 1);
    } catch { setSaved(true); }
  }

  const [skills, setSkills] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    setSkills(null);
    fetch(`/api/skills?symbol=${symbol}`).then(r => r.ok ? r.json() : null).then(setSkills).catch(() => setSkills(null));
  }, [symbol]);

  const ta = skills?.technicalAnalysis as { rsi?: { rsi: number; signal: string }; macd?: { cross: string }; verdict?: string } | null | undefined;

  if (!latestSignal) {
    return (
      <aside className="panel p-4 text-[13px] text-[var(--fg-2)] space-y-3">
        暂无最新信号。切换标的/周期，或等待回放引擎识别新结构。
        {ta && (
          <div className="bg-[var(--bg-2)] rounded-lg p-2.5 text-[12px] text-[var(--fg-1)] leading-relaxed">
            <div className="text-[var(--fg-0)] font-medium mb-1">bitget-signal 技术面（{symbol.replace('USDT','')}）</div>
            RSI {ta.rsi?.rsi?.toFixed(1) ?? '—'} · MACD {ta.macd?.cross ?? '—'}
            {ta.verdict && <div className="mt-1 text-[var(--fg-2)]">{ta.verdict}</div>}
          </div>
        )}
      </aside>
    );
  }

  const inHours = inUsMarketHours(latestSignal.ts);

  return (
    <aside className="panel p-4 space-y-3 text-[13px]">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)]"></span>
          最新信号 · 你来决策
        </h2>
        <div className="mt-2 text-[12px] text-[var(--fg-1)] leading-relaxed bg-[var(--bg-2)] rounded-lg p-2.5">
          <div className="num">{new Date(latestSignal.ts).toLocaleString('zh-CN', { timeZone: 'America/New_York', hour12: false })} (ET)</div>
          <div className="mt-0.5">{latestSignal.note}</div>
          <div className="mt-1">
            触发窗口：<span className={inHours ? 'text-[var(--brand)] font-medium' : 'text-[var(--warn)] font-medium'}>{inHours ? '美股盘中' : '休市窗口（rToken 独有）'}</span>
          </div>
        </div>
      </div>

      {ta && (
        <div className="bg-[var(--bg-2)] rounded-lg p-2.5 text-[12px] text-[var(--fg-1)] leading-relaxed">
          <span className="text-[var(--fg-0)] font-medium">bitget-signal 技术面：</span>
          RSI {ta.rsi?.rsi?.toFixed(1) ?? '—'}（{ta.rsi?.signal ?? '—'}）· MACD {ta.macd?.cross ?? '—'}
          {ta.verdict && <span className="text-[var(--fg-2)]"> · {ta.verdict}</span>}
        </div>
      )}

      {summary && (
        <div className="bg-[var(--bg-2)] rounded-lg p-2.5 text-[12px] leading-relaxed text-[var(--fg-1)]">
          历史同类信号 <span className="num text-[var(--fg-0)]">{summary.all}</span> 次 · 12根K线窗口胜率约 <span className={`num font-semibold ${summary.wins >= 50 ? 'text-[var(--up)]' : 'text-[var(--down)]'}`}>{summary.wins}%</span>
          {stats && stats.byWindow.inHours.n > 0 && stats.byWindow.offHours.n > 0 && (
            <span className="text-[var(--fg-2)]">（盘中 {((stats.byWindow.inHours.winRate12 ?? 0) * 100).toFixed(0)}% vs 休市 {((stats.byWindow.offHours.winRate12 ?? 0) * 100).toFixed(0)}%）</span>
          )}
        </div>
      )}

      {decision === null ? (
        <>
          <textarea
            value={reason} onChange={e => setReason(e.target.value)}
            placeholder="一句话写下你的判断理由（必填，落档可回看）"
            className="inp w-full p-2.5 text-[12px] h-16 resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => reason.trim() && submit('adopt')} disabled={!reason.trim()}
              className="btn btn-up py-2 text-[13px]">采纳</button>
            <button onClick={() => reason.trim() && submit('ignore')} disabled={!reason.trim()}
              className="btn btn-down-ghost py-2 text-[13px]">忽略</button>
          </div>
          <p className="text-[11px] text-[var(--fg-2)] border-t border-[var(--line)] pt-2.5 mt-1 leading-relaxed">
            🔒 AI 只提供分析。采纳或忽略由你决定——这是 ChanDesk 的人机边界。
          </p>
        </>
      ) : (
        <div className="space-y-2">
          <div className={`font-semibold text-[13px] ${decision === 'adopt' ? 'text-[var(--up)]' : 'text-[var(--fg-1)]'}`}>
            {decision === 'adopt' ? '✓ 已采纳' : '✕ 已忽略'} {saved && '· 已入档'}
          </div>
          <p className="text-[12px] text-[var(--fg-1)] bg-[var(--bg-2)] rounded-lg p-2">{reason}</p>
          <DecisionHistory refreshKey={historyKey} />
        </div>
      )}
    </aside>
  );
}
