// 静态 K线数据加载器（data/*.json 构建期生成，前端静态导入）
import { RawBar } from './chan/types';

export const SYMBOLS = ['TSLAUSDT', 'AAPLUSDT', 'NVDAUSDT', 'MSFTUSDT', 'METAUSDT', 'GOOGLUSDT', 'AMZNUSDT', 'AMDUSDT', 'AVGOUSDT'] as const;
export type SymbolCode = typeof SYMBOLS[number];
export const GRANULARITIES = ['15m', '1H'] as const;

export const SYMBOL_LABELS: Record<string, string> = {
  TSLAUSDT: '特斯拉', AAPLUSDT: '苹果', NVDAUSDT: '英伟达', MSFTUSDT: '微软',
  METAUSDT: 'Meta', GOOGLUSDT: '谷歌', AMZNUSDT: '亚马逊', AMDUSDT: 'AMD', AVGOUSDT: '博通',
};

export function toBars(arr: string[][]): RawBar[] {
  return arr.map(r => ({ ts: +r[0], open: +r[1], high: +r[2], low: +r[3], close: +r[4], vol: +r[5] }));
}

let cache: Record<string, string[][]> | null = null;

export async function loadBars(symbol: string, gran: string): Promise<RawBar[]> {
  if (!cache) {
    const res = await fetch(`/data/${symbol}_${gran}.json`);
    cache = {};
  }
  // 逐文件按需加载
  const key = `${symbol}_${gran}`;
  const cached = (cache as Record<string, string[][] | undefined>)[key];
  if (cached) return toBars(cached);
  const res = await fetch(`/data/${key}.json`);
  if (!res.ok) throw new Error(`data not found: ${key}`);
  const arr = await res.json();
  (cache as Record<string, string[][] | undefined>)[key] = arr;
  return toBars(arr);
}
