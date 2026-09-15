// 静态 K线数据加载器（data/*.json 构建期生成，前端静态导入）
import { RawBar } from './chan/types';

export const GRANULARITIES = ['15m', '1H'] as const;

// 默认清单（构建期由 scripts/symbols.ts 生成）；运行时从 /data/symbols.json 刷新
const DEFAULT_SYMBOLS = ['TSLAUSDT', 'AAPLUSDT', 'NVDAUSDT', 'MSFTUSDT', 'METAUSDT', 'GOOGLUSDT', 'AMZNUSDT', 'AMDUSDT', 'AVGOUSDT'];

let symbolsCache: string[] | null = null;
export async function getSymbols(): Promise<string[]> {
  if (symbolsCache) return symbolsCache;
  let result: string[] = DEFAULT_SYMBOLS;
  try {
    const res = await fetch('/data/symbols.json');
    if (res.ok) {
      const arr = await res.json();
      if (Array.isArray(arr) && arr.length > 0) result = arr;
    }
  } catch { /* 用默认清单 */ }
  symbolsCache = result;
  return result;
}

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
