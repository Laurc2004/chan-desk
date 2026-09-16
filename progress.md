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

## Session 2026-09-15（D3 完成）

- [x] 流式 LLM：/api/llm 改 SSE 透传，首字延迟 71s → 7s；ChatPanel 边收边渲染
- [x] Vercel 生产部署：https://chan-desk-9lkhid1rz-liurc2004.vercel.app（SSO protection 已关，公开可访问；QWEN_API_KEY 已配 production env）
  - 验证：home 200 / K线 JSON 200 / aggregate 200 / llm stream 200 / skills 200
- [x] bitget-signal Skill 接入：/api/skills 是官方公共 MCP datahub（datahub.noxiaohao.com/mcp）的客户端
  - technical_analysis full_analysis 实测可用（RSI/MACD/布林/MA/ATR/支撑压力，真实数据）→ DecisionPanel 技术面卡片
  - sentiment_index / derivatives_sentiment / news_feed / tradfi_news / macro 上游当前返回空 error → 代码已接入但优雅降级显示 null（诚实集成）
  - MCP 会话缓存（module-level session id），5min 客户端缓存
- 全部已 commit + push + 生产部署验证

## 待办

- [ ] 演示录屏（D5）
- [ ] 表单六段说明（D6）
- [ ] 用户侧：X 首帖、TG 群

## 2026-09-16 上午（D3/D4 临界点）
- 修 K线不显示（P0）：klinecharts v10 必须 setSymbol+setPeriod 触发 DataLoader；中枢矩形改自定义 pivotRect overlay。headless 截图+像素验证（绿烛3661/红烛1768）。
- UI 重做：GuideBanner 四步引导（可收起+localStorage）、K线状态栏（信号数/图例/操作提示）、面板图标、建议问题常驻。
- /api/skills 30s→1.2s（9s 超时 + 5min 服务端缓存+Cache-Control）。
- Supabase 决策档案全链路打通：decisions 表（schema.sql 入库）、session_id+stats_snapshot、DecisionHistory 右栏内嵌。REST 插入/查询/清理均实测 200/204。
- 生产部署：https://chan-desk-gunrfsqm9-liurc2004.vercel.app 全绿（home/kline/agg/skills 200，HTML 含「使用指南」）。Vercel env: QWEN_API_KEY/QWEN_MODEL/NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY（加密）。
- commit 900220b 已推 main。
