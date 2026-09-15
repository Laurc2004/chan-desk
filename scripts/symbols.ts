// Bitget USDT 合约全量里筛 rToken（代币化美股/ETF）标的
// npx tsx scripts/symbols.ts
//
// 判定：合约基础币必须是真实在交易的股票/ETF 代码。Bitget 的 rToken 命名是 <TICKER>USDT，
// 与加密代币混在同一列表。这里用两步：
// 1) 明确已知美股/ETF 白名单（人工核对过）
// 2) 用公开行情接口过滤掉 24h 成交额过小（<50万U）的死标的
import * as fs from 'fs';
import * as path from 'path';

const KNOWN = [
  // 科技七巨头 + 半导体
  'TSLAUSDT','AAPLUSDT','NVDAUSDT','MSFTUSDT','METAUSDT','GOOGLUSDT','AMZNUSDT',
  'AMDUSDT','AVGOUSDT','INTCUSDT','QCOMUSDT','TXNUSDT','MUUSDT','ARMUSDT','TSMUSDT','ASMLUSDT',
  'MRVLUSDT','ONDSUSDT','LRCXUSDT','AMATUSDT','KLACUSDT','WDCUSDT','STXSTOCKUSDT','NXPINothing',
  // 软件/互联网
  'NFLXUSDT','ADBEUSDT','CRMUSDT','NOWUSDT','ORCLUSDT','IBMUSDT','PANWUSDT','CRWDUSDT',
  'NETUSDT','DDOGUSDT','MDBUSDT','SNOWUSDT','SHOPUSDT','ZSUSDT','TEAMUSDT','PLTRUSDT','SNAPNothing',
  // 金融
  'JPMUSDT','BACUSDT','GSUSDT','MSUSDT','SOFIUSDT','HOODUSDT','COINUSDT','MSTRUSDT','MARAUSDT','RIOTNothing',
  // 消费/医疗/能源/工业
  'WMTUSDT','NKEUSDT','SBUXNothing','DISNothing','LLYUSDT','UNHUSDT','MRKUSDT','PFEUSDT',
  'XOMUSDT','CVXUSDT','KOUSDT','PEPUSDT','MELIUSDT','TMUSDT','ZMUSDT','GMEUSDT','OPENUSDT','IONQUSDT',
  // 中概
  'BABAUSDT','JDUSDT','PDDUSDT','NETEASEUSDT','NIOUSDT','BIDUNothing',
  // ETF
  'SPYUSDT','QQQUSDT','IWMUSDT','TQQQUSDT','SQQQUSDT',
  // 热门杠杆/主题 ETF 与新经济标的
  'SOXLUSDT','SOXSUSDT','SPCXUSDT','KWEBUSDT','NVDLUSDT',
  // 其他国际
  'SONYUSDT','SAMSUNGEMUSDT','LGELECTRONICSUSDT','TSEMUSDT','MUFGUSDT','TEMUSDT',
  // SK 海力士 / AI 未上市代币化 / 热门 meme 股
  'SKHYUSDT','SKHYNIXUSDT','ANTHROPICUSDT','OPENAIUSDT','TRUMPUSDT',
];

async function main() {
  const res = await fetch('https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES');
  const json = await res.json() as any;
  if (json.code !== '00000') throw new Error(json.msg);
  const byBase = new Map<string, { symbol: string; usdtVol: number }>();
  for (const t of json.data) {
    byBase.set(t.symbol, { symbol: t.symbol, usdtVol: Number(t.usdtVolume ?? t.baseVolume ?? 0) });
  }
  const candidates = KNOWN.filter(k => !k.endsWith('Nothing')).filter(k => byBase.has(k));
  const active = candidates
    .map(k => byBase.get(k)!)
    .filter(t => t.usdtVol >= 500_000)
    .sort((a, b) => b.usdtVol - a.usdtVol);
  const dropped = candidates.filter(k => (byBase.get(k)?.usdtVol ?? 0) < 500_000);
  console.log(`active rToken symbols (${active.length}):`);
  for (const t of active) console.log(`  ${t.symbol}  24h ${Math.round(t.usdtVol / 1000)}k USDT`);
  console.log('dropped (low volume):', dropped.join(', ') || '(none)');
  fs.writeFileSync(path.join(__dirname, '../data/symbols.json'), JSON.stringify(active.map(t => t.symbol), null, 2));
}
main();
