'use client';
import { useEffect, useRef } from 'react';
import { init, dispose, registerOverlay, KLineData, Chart } from 'klinecharts';
import { RawBar, Signal, Pivot } from '@/lib/chan/types';

const KIND_TAG: Record<string, string> = {
  sanmai_buy: '三买', sanmai_sell: '三卖',
  pivot_break_up: '中枢上破', pivot_break_down: '中枢下破',
  yimai_buy: '一买', yimai_sell: '一卖', ermai_buy: '二买', ermai_sell: '二卖', leimai_buy: '类二买', leimai_sell: '类二卖',
};

// 自定义中枢矩形 overlay（rect 是 figure 不是 overlay，必须包一层）
if (typeof window !== 'undefined' && !registerOverlay.name) {
  // noop，registerOverlay 每次调用覆盖
}
function ensurePivotRectRegistered() {
  try {
    registerOverlay({
      name: 'pivotRect',
      totalStep: 3,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      createPointFigures: ({ coordinates, overlay }) => {
        const [p1, p2] = coordinates;
        if (!p1 || !p2) return [];
        const x1 = Math.min(p1.x, p2.x);
        const x2 = Math.max(p1.x, p2.x);
        const y1 = Math.min(p1.y, p2.y);
        const y2 = Math.max(p1.y, p2.y);
        const stroke = (overlay.styles as { borderColor?: string } | undefined)?.borderColor ?? '#3b82f6';
        return [{
          type: 'rect',
          attrs: { x: x1, y: y1, width: Math.max(x2 - x1, 2), height: Math.max(y2 - y1, 2) },
          styles: {
            style: 'stroke_fill',
            color: 'rgba(59,130,246,0.10)',
            borderColor: stroke,
            borderSize: 1,
            borderStyle: 'dashed',
          },
        }];
      },
    });
  } catch { /* 已注册则忽略 */ }
}

const GRAN_PERIOD: Record<string, { span: number; type: 'minute' | 'hour' }> = {
  '15m': { span: 15, type: 'minute' },
  '1H': { span: 1, type: 'hour' },
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
    ensurePivotRectRegistered();
    const chart = init(ref.current, {
      styles: {
        grid: { horizontal: { color: '#1a2130' }, vertical: { color: '#1a2130' } },
        candle: { bar: { upColor: '#00c087', downColor: '#f45b5b', upWickColor: '#00c087', downWickColor: '#f45b5b' } },
        xAxis: { axisLine: { show: false } },
      },
      timezone: 'America/New_York',
    });
    if (!chart) return;
    chartRef.current = chart;

    // v10 关键：loader 供数，但必须 setSymbol + setPeriod 才会触发 getBars('init')
    chart.setDataLoader({
      getBars: ({ callback }) => {
        const { bars, signals, pivots } = payloadRef.current;
        const data: KLineData[] = bars.map(b => ({
          timestamp: b.ts, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.vol,
        }));
        callback(data, { backward: false, forward: false });
        // 数据就绪后叠加 overlays（下一帧确保内部布局完成）
        requestAnimationFrame(() => {
          const c = chartRef.current;
          if (!c) return;
          const overlays: Array<Record<string, unknown>> = signals.map(s => ({
            name: 'simpleAnnotation',
            points: [{ timestamp: s.ts, value: s.price }],
            extendData: `${KIND_TAG[s.kind] ?? s.kind}${s.divergence ? '⚠背驰' : ''}`,
            styles: { line: { color: s.kind.includes('buy') || s.kind.includes('up') ? '#00c087' : '#f45b5b' } },
          }));
          for (const p of pivots) {
            overlays.push({
              name: 'pivotRect',
              points: [
                { timestamp: p.startTs, value: p.high },
                { timestamp: p.endTs, value: p.low },
              ],
            });
          }
          if (overlays.length) {
            try { c.createOverlay(overlays as never); } catch { /* overlay 失败不影响K线 */ }
          }
        });
      },
    });
    chart.setSymbol({ symbol: `${symbol.replace('USDT', '')}/USDT` });
    chart.setPeriod(GRAN_PERIOD[gran] ?? { span: 1, type: 'hour' });

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      dispose(ref.current!);
      chartRef.current = null;
    };
  // symbol/gran 变化时整个重建（key 已保证，这里冗余保险）
  }, [symbol, gran]);

  return <div className="h-[440px] w-full" ref={ref} />;
}
