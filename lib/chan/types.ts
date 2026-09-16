// 缠论基础类型 + 原始K线
export interface RawBar {
  ts: number;      // ms
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;     // 成交量(quote)
}

// 包含关系处理后的合并K线
export interface MergedBar {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  dir: 1 | -1;     // 合并方向：1 向上处理（取高高），-1 向下（取低低）
  startTs: number; // 区间起始原始K线时间
  barCount: number; // 该合并K线包含的原始K线数
}

export interface Fractal {
  index: number;   // 合并K线序号（中心元素）
  ts: number;
  kind: 'top' | 'bottom';
  high: number;
  low: number;
}

export interface Stroke {
  startTs: number;
  endTs: number;
  dir: 1 | -1;     // 1 向上笔（底→顶），-1 向下笔（顶→底）
  high: number;
  low: number;
  startIndex: number; // 分型中心所在合并K线序号
  endIndex: number;
}

export interface Pivot {
  high: number;    // 中枢区间上沿 ZG
  low: number;     // 中枢区间下沿 ZD
  startTs: number;
  endTs: number;
  strokeStart: number; // 构成中枢的笔序号 [strokeStart, strokeStart+2]
  strokeEnd: number;
}

export type SignalKind =
  | 'sanmai_buy'    // 三买：向上离开中枢后回抽不回中枢
  | 'sanmai_sell'   // 三卖：向下离开中枢后回抽不回中枢
  | 'pivot_break_up'   // 中枢向上突破
  | 'pivot_break_down' // 中枢向下突破
  | 'yimai_buy'     // 一买：向下离开段创新低且底背驰
  | 'yimai_sell'    // 一卖：向上离开段创新高且顶背驰
  | 'ermai_buy'     // 二买：一买后回抽不创新低
  | 'ermai_sell'    // 二卖：一卖后回抽不创新高
  | 'leimai_buy'    // 类二买(chan.py bsp2s)：二买区间内再次回抽不回突破笔终点
  | 'leimai_sell';  // 类二卖：对称

export interface Signal {
  kind: SignalKind;
  ts: number;          // 信号确认时间（触发K线收盘）
  barIndex: number;    // 原始K线序号
  price: number;       // 确认时收盘价
  pivotHigh: number;
  pivotLow: number;
  /** 简化背驰标记：离开段价格创新高/新低但 MACD DIF 峰值未创新高/新低 */
  divergence?: boolean;
  /** chan.py 精髓：二买回抽幅度比 retrace_rate = 回抽笔幅度/突破笔幅度（越小越强，chan.py 默认阈值≤0.618） */
  retraceRate?: number;
  note?: string;
}
