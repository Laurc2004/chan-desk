# Progress

## Session 2026-09-15

- [x] 赛道分析、拿奖策略（专题奖+人气奖+高校专项三层）已与用户对齐
- [x] 创建项目 ~/Documents/code/chan-desk（create-next-app，TS+Tailwind+App Router）
- [x] 缠论引擎完整化（响应用户"太简化"反馈）：
  - 笔（分型交替+间距≥5+同向合并）→ 线段（简化特征序列，反向破坏+≥3笔）
  - 笔中枢（三笔重叠+延伸）
  - 8 类信号：三买/三卖/中枢上破/下破 + 一买/一卖（背驰+创新低/高驱动）+ 二买/二卖（回抽不破极值）
  - MACD(12,26,9) 背驰标注：离开段 vs 进入段 DIF 峰值对比
- [x] 全市场大样本：15m 108 信号 / 1H 30 信号，8 类全部有真实样本
  - 核心实测结论：三买盘中75% vs 追突破盘中14%；一卖休市100%（n=5）
- [x] GitHub 仓库 https://github.com/Laurc2004/chan-desk 已建（public, main 分支同步）
- [x] UI：对话/K线(信号+中枢+背驰标记)/单标的统计/全市场汇总/决策面板
- [x] `next build` 全绿

## Session 2026-09-15（D3 进行中）

- [x] Qwen API key 到位（用户领到 30U 额度）：写入 gitignored .env，.env.example 已入库
- [x] LLM 链路实测全通：
  - 直连 hackathon.bitgetops.com/v1 chat/completions → 200
  - dev server /api/llm 带真实统计上下文 → 200，回答质量高（会自己算盈亏比 0.28%/0.92%≈0.30 然后提示风险，最后让用户自行判断——完全符合赛道"人做决策"要求）
  - 注意：qwen3.8-max 是 reasoning 模型，首响应 ~71s（dev 日志 POST /api/llm 200 in 71s）。Vercel maxDuration 已设 60，可能需要调到更长或前端加"思考中"提示
- [x] 静态数据全部 200（K线/汇总/symbols）

## 待办

- [ ] /api/llm maxDuration 加大 + 前端等待提示优化（71s 首响应）
- [ ] 部署 Vercel（QWEN_API_KEY 配到环境变量）
- [ ] bitget-signal Skill 接入
- [ ] 演示录屏
- [ ] 表单六段说明
