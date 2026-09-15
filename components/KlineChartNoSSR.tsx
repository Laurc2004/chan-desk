'use client';
import dynamic from 'next/dynamic';

// klinecharts 只在浏览器可用，禁 SSR
const KlineChart = dynamic(() => import('./KlineChart'), {
  ssr: false,
  loading: () => <div className="h-[420px] flex items-center justify-center text-zinc-500 text-sm">图表加载中…</div>,
});

export default function KlineChartNoSSR(props: {
  bars: { ts: number; open: number; high: number; low: number; close: number; vol: number }[];
  signals: Parameters<typeof import('./KlineChart')['default']>[0]['signals'];
  pivots: Parameters<typeof import('./KlineChart')['default']>[0]['pivots'];
  symbol: string; gran: string;
}) {
  return <KlineChart {...props} />;
}
