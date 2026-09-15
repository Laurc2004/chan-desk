import { Stroke, Pivot } from './types';

/**
 * 中枢识别（笔中枢，简化缠论定义）：
 * 连续三笔（1,2,3）的价格区间有重叠 → 中枢区间 ZG=min(high1,high2,high3), ZD=max(low1,low2,low3)
 * 后续笔与中枢区间继续重叠则延伸中枢；完全离开则中枢结束。
 * 返回中枢列表（含延伸后的完整区间与时间范围）。
 */
export function findPivots(strokes: Stroke[]): Pivot[] {
  const pivots: Pivot[] = [];
  let i = 0;
  while (i + 2 < strokes.length) {
    const [s1, s2, s3] = [strokes[i], strokes[i + 1], strokes[i + 2]];
    const zg = Math.min(s1.high, s2.high, s3.high);
    const zd = Math.max(s1.low, s2.low, s3.low);
    if (zg > zd) {
      // 中枢成立，尝试延伸
      let end = i + 2;
      let lastTs = s3.endTs;
      for (let j = i + 3; j < strokes.length; j++) {
        const s = strokes[j];
        if (s.high >= zd && s.low <= zg) {
          end = j;
          lastTs = s.endTs;
        } else break;
      }
      pivots.push({
        high: zg, low: zd,
        startTs: s1.startTs, endTs: lastTs,
        strokeStart: i, strokeEnd: end,
      });
      i = end + 1; // 下一个中枢从离开笔之后找
    } else {
      i++;
    }
  }
  return pivots;
}
