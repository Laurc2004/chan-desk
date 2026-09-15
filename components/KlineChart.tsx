'use client';
import { useEffect, useRef } from 'react';
import { init, dispose, KLineData, Chart } from 'klinecharts';
import { RawBar, Signal, Pivot } from '@/lib/chan/types';

const KIND_TAG: Record<string, string> = {
  sanmai_buy: '三买', sanmai_sell: '三卖',
  pivot_break_up: '上破', pivot_break_down: '下破',
  yimai_buy: '一买', yimai_sell: '一卖', ermai_buy: '二买', ermai_sell: '二卖',
};

export default function KlineChart({ bars, signals, pivots, symbol, gran }: {
  bars: RawBar[]; signals: Signal[]; pivots: Pivot[]; symbol: string; gran: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const payloadRef = useRef({ bars, signals, pivots });
  payloadRef.current = { bars, signals, pivots };

  useEffect(() => {
    if (!ref.current) return;
    const chart = init(ref.current, {
      styles: {
        grid: { horizontal: { color: '#1b2029' }, vertical: { color: '#1b2029' } },
        candle: { bar: { upColor: '#22c55e', downColor: '#ef4444', upWickColor: '#22c55e', downWickColor: '#ef4444' } },
      },
    });
    if (!chart) return;
    chartRef.current = chart;

    // klinecharts v10：用 DataLoader 供数（applyNewData 已移除）
    chart.setDataLoader({
      getBars: ({ callback }) => {
        const { bars, signals, pivots } = payloadRef.current;
        const data: KLineData[] = bars.map(b => ({
          timestamp: b.ts, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.vol,
        }));
        callback(data, { backward: false, forward: false });

        // 数据就绪后叠信号标记与中枢矩形（延迟一帧确保内部已建图）
        requestAnimationFrame(() => {
          const c = chartRef.current; if (!c) return;
          const overlays: Array<Record<string, unknown>> = signals.map(s => ({
            name: 'simpleAnnotation',
            points: [{ timestamp: s.ts, value: s.price }],
            styles: { symbol: { shape: 'circle', color: s.kind.includes('buy') || s.kind.includes('up') ? '#22c55e' : '#ef4444' } },
            extendData: { text: KIND_TAG[s.kind] ?? s.kind },
          }));
          for (const p of pivots) {
            overlays.push({
              name: 'rect',
              points: [
                { timestamp: p.startTs, value: p.high },
                { timestamp: p.endTs, value: p.low },
              ],
              styles: { style: 'stroke_fill', color: 'rgba(59,130,246,0.12)', borderColor: '#3b82f6' },
            });
          }
          if (overlays.length) c.createOverlay(overlays as never);
        });
      },
    });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      dispose(ref.current!);
      chartRef.current = null;
    };
  // 仅按 symbol/gran 重建 chart 实例；数据变化走 loader 重新拉
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, gran]);

  // 数据更新时通过重新触发 loader（setSymbol 轻触发）
  useEffect(() => {
    const chart = chartRef.current; if (!chart) return;
    chart.removeOverlay();
    chart.resetData();
  }, [bars, signals, pivots]);

  return <div className="h-[420px] w-full" ref={ref} key={`${symbol}-${gran}`} />;
}
