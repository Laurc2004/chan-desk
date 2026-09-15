# Findings

## Bitget rToken 数据（实测，2026-09-15 更新）

- K线端点：`GET https://api.bitget.com/api/v2/mix/market/history-candles?symbol=X&granularity=1H&productType=USDT-FUTURES&limit=100&endTime=...`
- 单次上限 100 根，按 endTime 向前翻页；granularity 参数大小写敏感（'1H' 对 '1h' 报 400171）
- 历史深度因标的而异（重要修正）：老标的 15m 可达 20100 根（≈7个月）、1H 可达 9125 根（≈14个月），如 MSTR/COIN/INTC/MRVL/MU；2026-07 新上线的标的只有 ~6968/1817 根。**不要按 90 天上限假设**
- 增量拉取首拉不能带 endTime（会漏最新K线）
- 公开行情无需 API Key
- 标的清单：scripts/symbols.ts 用 tickers 接口按 24h 成交额 ≥50万U 过滤，当前 48 个 rToken（含 SOXL/SPCX/SKHY/SKHYNIX/ANTHROPIC/OPENAI/TRUMP/SOXS/KWEB/NVDL 等热门）

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
