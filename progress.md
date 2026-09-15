# Progress

## Session 2026-09-15

- [x] 赛道分析、拿奖策略（专题奖+人气奖+高校专项三层）已与用户对齐
- [x] 创建项目 ~/Documents/code/chan-desk（create-next-app，TS+Tailwind+App Router）
- [x] task_plan.md / findings.md / progress.md 建立
- [x] 缠论 TS 引擎：merge(包含处理)/fractal(分型)/stroke(笔)/pivot(中枢)/signals(买卖点) 全部完成
- [x] 回放统计引擎：12根K线窗口收益分布 + 美股盘中/休市窗口分组统计（招牌功能）
- [x] 真实数据验证：15m 密度可用（TSLA 11信号/NVDA 8信号 per 66天），1H 太稀疏只作辅助
- [x] 数据刷新脚本 refresh.ts：9标的×2周期全部拉到 2026-09-15（15m 6863根/1H 1715根）
  - 坑：Bitget granularity 参数 1H 必须大写 '1H'（'1h' 报 400171）
  - 坑：增量拉取首拉不能带 endTime（会漏最新K线）
- [x] UI 四大件：ChatPanel(对话+LLM解析+本地回退)/KlineChart(klinecharts v10 DataLoader+信号标注+中枢矩形)/StatsPanel(分窗口统计卡片)/DecisionPanel(采纳/忽略+理由→Supabase)
- [x] app/api/llm/route.ts：Qwen 代理（qwen3.8-max, hackathon.bitgetops.com）
- [x] `next build` 通过（klinecharts 需 dynamic import ssr:false，已解）
- [x] git commit ×3

## 待办（按排期）

- [ ] D2: 跨标的汇总统计（决策压力测试的"大样本"层）+ 演示剧本用例固化
- [ ] D3: Qwen key 配置 + 实测 LLM 链路；bitget-signal Skill 调研接入
- [ ] D4: UI 打磨（图表交互、信号点 hover 详情）
- [ ] D5: Supabase decisions 表 + 部署 Vercel + 演示录屏
- [ ] D6: 表单六段说明 + 提交
- [ ] 用户侧：X 首帖（含 #BitgetHackathon @Bitget_AI + 转发官方开赛帖）、Qwen 申请表、TG 群
