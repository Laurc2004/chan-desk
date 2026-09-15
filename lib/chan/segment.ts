import { Stroke } from './types';

export interface Segment {
  dir: 1 | -1;
  high: number;
  low: number;
  startTs: number;
  endTs: number;
  strokeStart: number;
  strokeEnd: number;
}

/**
 * 线段划分（简化特征序列法）：
 * 1. 线段方向由起始笔方向决定
 * 2. 线段至少由 3 笔构成
 * 3. 反向笔的极值突破线段起点极值 → 线段结束（标准"线段破坏"判定的简化）
 * 4. 线段区间取内部所有笔的高低极值
 */
export function buildSegments(strokes: Stroke[]): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  while (i < strokes.length) {
    const dir = strokes[i].dir;
    let end = i;
    let high = -Infinity, low = Infinity;
    for (let j = i; j < strokes.length; j++) {
      high = Math.max(high, strokes[j].high);
      low = Math.min(low, strokes[j].low);
      const isOpposite = strokes[j].dir !== dir;
      const brokeOrigin = dir === 1
        ? strokes[j].low <= strokes[i].low      // 向下笔跌破线段起点低点
        : strokes[j].high >= strokes[i].high;   // 向上笔突破线段起点高点
      if (isOpposite && brokeOrigin && j - i + 1 >= 3) {
        end = j - 1; // 线段到前一笔为止
        break;
      }
      end = j;
    }
    segments.push({
      dir, high, low,
      startTs: strokes[i].startTs, endTs: strokes[end].endTs,
      strokeStart: i, strokeEnd: end,
    });
    i = end + 1;
  }
  return segments;
}
