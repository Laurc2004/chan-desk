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

## 待办（按排期）

- [ ] D2: 跨标的汇总统计（决策压力测试的"大样本"层）+ 演示剧本用例固化
- [ ] D3: Qwen key 配置 + 实测 LLM 链路；bitget-signal Skill 调研接入
- [ ] D4: UI 打磨（图表交互、信号点 hover 详情）
- [ ] D5: Supabase decisions 表 + 部署 Vercel + 演示录屏
- [ ] D6: 表单六段说明 + 提交
- [ ] 用户侧：X 首帖（含 #BitgetHackathon @Bitget_AI + 转发官方开赛帖）、Qwen 申请表、TG 群
