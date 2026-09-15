# ChanDesk — Bitget AI Hackathon S2 参赛项目

> AI Trading Desk 赛道 · 决策压力测试子主题
> 「缠论交易决策压力测试台」：交易想法 → Bitget rToken 历史信号回放 → 胜率/盈亏分布 → 人做最终决策

## 一句话定位

美股睡了，缠论信号还在跑。休市时段触发的三买和开盘时段的三买，根本不是同一个信号——ChanDesk 用逐K线回放引擎量化证明这件事，帮 trader 在开仓前 10 秒拿到历史统计，人来决定采纳还是忽略。

## 硬约束

- 只用免费资源：Vercel（Next.js）+ Cloudflare + Supabase，无服务器/无 Python 运行时
- 缠论引擎（分型/笔/中枢/买卖点）用 TypeScript 实现，回放统计在浏览器端跑
- 数据：Bitget 公开 REST `/api/v2/mix/market/history-candles`，构建时/本地拉取后生成静态 JSON
- 提交截止 2026-09-21 23:59 (UTC+8)，今天 09-15，工期 6 天
- 必交：可访问 Demo + 完整投研任务演示 + 合规 X 帖（#BitgetHackathon + @Bitget_AI）

## 评分维度 → 功能映射（纯评委主观打分）

| 评分维度 | 功能 | 优先级 |
|---|---|---|
| 功能深度（数据源/Skill 集成数量及有效性） | TS 缠论回放引擎；bitget-signal 3 个 Skill（technical-analysis / sentiment-analyst / macro-analyst）；Bitget K线 REST | P0 |
| 研究质量 | 回放样本数、分时段（美股开盘 vs 休市）统计、最差 N 笔案例 | P0 |
| LUI 流畅性 | 自然语言进 → 结构化信号出 → K线图标注历史触发点 → 统计卡片 → 采纳/忽略 | P0 |
| 个性中化主张 | 决策档案（Supabase）：每次采纳/忽略+理由落库，可回看对错 | P1 |

## 架构（全部免费资源）

```
[Next.js App Router on Vercel]
  ├─ app/                      # UI（对话式投研工作台）
  │   ├─ page.tsx              # 主工作台：左对话/中K线/右统计+决策
  │   └─ api/llm/route.ts      # Qwen 代理（qwen3.8-max，Vercel 函数）
  ├─ lib/chan/                 # TS 缠论引擎（分型→笔→线段(可选)→中枢→买卖点）
  ├─ lib/replay/               # 回放统计引擎（纯函数：信号→N根K线收益分布）
  ├─ lib/bitget.ts             # Bitget REST 客户端 + 静态数据加载器
  ├─ lib/skills.ts             # bitget-signal 3 Skill 集成层
  ├─ data/                     # 构建期生成的 rToken K线 JSON（不入库，LFS/或不入库直接部署产物）
  └─ supabase/                 # 决策档案表结构 + client
```

## 数据源

- 标的池（美股 rToken 合约，USDT 本位）：TSLAUSDT / AAPLUSDT / NVDAUSDT / MSTRUSDT / AMZNUSDT / METAUSDT / GOOGLUSDT / MSFTUSDT / AMDUSDT / AVGOUSDT
- 周期：1H（主）+ 15m（辅）。历史深度：1H≈91天、15m≈90天（实测）
- 缺口处理：rToken 流动性断档不做插值，标记 gap 并在统计里单列；覆盖率审计写进项目说明
- 已有资产：~/Documents/code/bitget-hackathon/ 有全部 10 标的 1H+15m 缓存 JSON（此前实测拉取），可复用为新项目种子数据

## 六天排期

- D1（9/15 今天）：项目创建 + 计划文件 + 缠论 TS 引擎核心（分型/笔）+ X 首帖
- D2（9/16）：中枢/买卖点识别 + 回放统计引擎 + Jupyter→脚本输出第一版统计
- D3（9/17）：Qwen LLM 层（自然语言→结构化查询；统计+Skill 数据→分析师意见）+ bitget-signal 集成
- D4（9/18）：UI 全天（对话/K线标注/分布卡片/采纳忽略按钮），klinecharts
- D5（9/19）：决策档案（Supabase）+ 部署 Vercel + 演示脚本彩排录屏
- D6（9/20）：表单六段说明 + 提交 + 最终 X 帖。9/21 是 buffer，不指望它

## 砍功能顺序（时间不够时）

决策档案页 → chan.py 可视化对比 → 第三个 Skill → 多标的（保 TSLA 也行）
永不砍：回放统计、采纳/忽略按钮、演示录屏、X 合规帖

## 非目标

- 不做实盘/模拟盘下单（赛道定义禁止 AI 下单）
- 不做 chan.py/czsc 双引擎融合对比（工期不允许，czsc 语义用 TS 实现即可）
- 不做用户系统/多租户（单用户 demo，Supabase 匿名 auth 即可）

## 提交材料对照

- [ ] Demo URL（Vercel 公开可访问）
- [ ] GitHub 仓库（含 README、引擎文档、统计报告）
- [ ] 演示录屏（5 分钟内：提问→回放→分布→分时段对比→人决策→档案回看）
- [ ] X 帖（每条含 #BitgetHackathon @Bitget_AI）
- [ ] 表单六段项目说明（思路/目标用户/验证数据 权重最高）
