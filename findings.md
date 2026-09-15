# Findings

## Bitget rToken 数据（实测，2026-09 上旬，来自旧项目 bitget-hackathon）

- K线端点：`GET https://api.bitget.com/api/v2/mix/market/history-candles?symbol=TSLAUSDT&granularity=1h&endTime=...&limit=100`
- 单次上限 100 根，按 endTime 向前翻页；1H 深度 ≈91 天、15m ≈90 天
- 公开行情无需 API Key
- 已有缓存：~/Documents/code/bitget-hackathon/data/{SYMBOL}_{1H|15m}.json，10 标的全套（TSLA/AAPL/NVDA/MSFT/META/GOOGL/AMZN/AMD/AVGO + MSTR 需确认）
- 注意：旧缓存截至 9 月上旬，ChanDesk 需要刷新到最新再生成静态数据

## 赛道规则要点（S2 手册，全文缓存于 ~/.hermes/cache/web/bitget-ai.gitbook.io-3621a378f5.md）

- AI Trading Desk：纯评委主观打分；必交 = 可访问 Demo + 完整投研任务演示 + 合规 X 帖
- 评分：功能深度（数据源/Skill 数量及有效性）、研究质量、LUI 流畅性、个性化主张
- 硬门槛：X 帖须含 #BitgetHackathon + @Bitget_AI 且转发官方开赛帖；项目说明必须写在 Google Form 六段结构内
- 人做最终决策必须是 UI 上可见的一步（采纳/忽略按钮）
- Qwen：qwen3.8-max，base_url https://hackathon.bitgetops.com/v1（OpenAI 兼容），额度独立表单申请
- 一队最多 2 主题；S1 作品直接复用无效

## 技术决策

- czsc 是 Python 库 → 无法上 Vercel → 缠论引擎用 TS 重写（分型/笔/中枢/买卖点是确定性算法，可行）
- 回放统计是纯计算 → 浏览器端跑，数据用静态 JSON（构建期生成），零服务器成本
- K线图库：klinecharts（轻量、支持标记/覆盖物，React 包装 klinecharts/react-klinecharts）
- Supabase 只做决策档案表（decisions），匿名 key 即可，RLS 允许 anon 插入/读取
- Next.js 版本注意：create-next-app 装的是新版（AGENTS.md 提示 API 有 breaking changes），写代码前查 node_modules/next/dist/docs/
