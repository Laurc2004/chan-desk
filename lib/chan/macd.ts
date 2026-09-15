import { RawBar } from './types';

/** 标准 MACD（12,26,9）：返回与原始K线对齐的 dif / dea / hist 数组 */
export function macd(bars: RawBar[], fast = 12, slow = 26, signal = 9) {
  const n = bars.length;
  const dif: number[] = new Array(n).fill(0);
  const dea: number[] = new Array(n).fill(0);
  const hist: number[] = new Array(n).fill(0);
  if (n === 0) return { dif, dea, hist };
  let emaFast = bars[0].close, emaSlow = bars[0].close;
  let deaPrev = 0;
  const kf = 2 / (fast + 1), ks = 2 / (slow + 1), kd = 2 / (signal + 1);
  for (let i = 0; i < n; i++) {
    const c = bars[i].close;
    emaFast = i === 0 ? c : emaFast * (1 - kf) + c * kf;
    emaSlow = i === 0 ? c : emaSlow * (1 - ks) + c * ks;
    const d = emaFast - emaSlow;
    const dea_i = i === 0 ? d : deaPrev * (1 - kd) + d * kd;
    dif[i] = d; dea[i] = dea_i; hist[i] = (d - dea_i) * 2;
    deaPrev = dea_i;
  }
  return { dif, dea, hist };
}
