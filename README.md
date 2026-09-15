# ChanDesk · 缠论决策压力测试台

> Bitget AI Base Camp Hackathon S2 · AI Trading Desk 赛道 · 决策压力测试子主题

美股睡了，缠论信号还在跑——但休市时段触发的三买和盘中触发的三买，根本不是同一个信号。ChanDesk 用逐 K 线回放引擎在 Bitget rToken（代币化美股，7×24 交易）历史上量化证明这件事：交易想法 → 历史信号全量回放 → 胜率/盈亏分布（分盘中/休市窗口）→ 交易员做最终决策。

## 核心特性

- 🧠 缠论引擎 TypeScript 实现：包含处理 → 分型 → 笔 → 线段 → 中枢 → 8 类买卖点（三买/三卖/中枢突破/一买/一卖/二买/二卖），MACD 背驰自动标注（离开段 vs 进入段 DIF 峰值对比）
- 📊 决策压力测试：任一信号在 9 个 rToken 标的历史上的全量触发回放，12 根 K 线窗口的胜率/中位收益/盈亏比/最差单笔
- 🌗 分窗口统计（招牌）：同一信号「美股盘中触发」vs「休市窗口触发（rToken 独有）」分组对比——这是 S2 主题（7×24 代币化美股）的直接量化
- 🧩 多级别联立：15m 信号自动标注所处 1H 环境（趋势/震荡），分型强度用 ATR(14) 自适应过滤
- 🪐 48 个 rToken 全覆盖：科技七巨头、半导体（含 SK 海力士）、热门杠杆 ETF（SOXL/SOXS/SPCX）、中概、甚至 ANTHROPIC/OPENAI/TRUMP 等未上市/非传统标的的代币化合约——缠论信号在"只有链上价格"的资产上同样可回放
- 💬 自然语言投研对话（Qwen，带本地规则回退）
- ⚖️ 人机边界：AI 只给分析，「采纳/忽略」由交易员点击并写理由，决策落档可回看

## 实测结论（15m，9 标的，2026-07-05 → 2026-09-15，共 108 信号）

| 信号 | 样本 | 盘中胜率 | 休市胜率 |
|---|---|---|---|
| 三买 | 23 | 75% | 63% |
| 三卖 | 16 | 75% | 67% |
| 中枢上破（追突破） | 29 | 14% | 27% |
| 中枢下破 | 23 | 25% | 33% |
| 一买（背驰） | 6 | 100% | 50% |
| 一卖（背驰） | 8 | 67% | 100% |

结论：等回抽确认的买卖点显著优于追突破；确认类信号盘中触发胜率普遍高于休市窗口。全部实测，未计手续费。

## 技术栈与部署

Next.js 16（App Router）+ TypeScript + Tailwind + klinecharts。缠论引擎与回放统计为纯前端计算，K 线数据为构建期生成的静态 JSON（来自 Bitget 公开 REST，无需 API Key）。部署：Vercel（免费层）；决策档案：Supabase（可选）。

```
lib/chan/      缠论引擎（merge/fractal/stroke/segment/pivot/signals/macd）
lib/replay/    回放统计引擎（分窗口胜率/盈亏分布）
app/           UI（对话 / K线+信号标注+中枢矩形 / 统计 / 决策）
scripts/       数据刷新与汇总统计脚本（tsx 运行）
public/data/   9 标的 × {15m,1H} 静态K线 + 全市场汇总 JSON
```

```bash
npm i
npx tsx scripts/refresh.ts    # 刷新K线数据到最新
npx tsx scripts/aggregate.ts  # 重新生成全市场汇总
npm run dev
```

环境变量（可选）：`QWEN_API_KEY`（Bitget 黑客松 Qwen 额度）、`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`（决策档案）。不配置时对话走本地规则回退、决策仅存本地。

## 环境变量说明

| 变量 | 作用 | 缺省行为 |
|---|---|---|
| QWEN_API_KEY | Qwen qwen3.8-max（hackathon.bitgetops.com） | 对话面板回退到本地统计摘要 |
| NEXT_PUBLIC_SUPABASE_URL/ANON_KEY | decisions 表（采纳/忽略+理由） | 决策只在会话内生效 |

## 免责

本项目为黑客松参赛作品，回测统计未计手续费与滑点，不构成投资建议。AI 仅提供分析，交易决策由交易员作出。
