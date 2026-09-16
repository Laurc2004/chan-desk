import { NextRequest } from 'next/server';

// K线代理：浏览器侧每 60s 经此拉 Bitget 最新K线（解决浏览器直连 Bitget 的 CORS/网络问题）
// GET /api/bars?symbol=TSLAUSDT&gran=15m&since=<ms 时间戳，可选>
export const runtime = 'nodejs';
export const maxDuration = 30;

const GRAN_MAP: Record<string, string> = { '15m': '15m', '1H': '1H' };

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? 'TSLAUSDT';
  const gran = GRAN_MAP[req.nextUrl.searchParams.get('gran') ?? '15m'] ?? '15m';
  const since = Number(req.nextUrl.searchParams.get('since') ?? 0);
  try {
    const url = `https://api.bitget.com/api/v2/mix/market/history-candles?symbol=${symbol}&granularity=${gran}&productType=USDT-FUTURES&limit=100`;
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
    const json = await res.json();
    if (json.code !== '00000' || !Array.isArray(json.data)) {
      return new Response(JSON.stringify({ error: json.msg ?? 'upstream error' }), { status: 502 });
    }
    const bars = (json.data as string[][])
      .map(r => ({ ts: +r[0], open: +r[1], high: +r[2], low: +r[3], close: +r[4], vol: +r[5] }))
      .filter(b => b.ts > since)
      .sort((a, b) => a.ts - b.ts);
    return new Response(JSON.stringify({ bars }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 502 });
  }
}
