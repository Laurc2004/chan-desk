import { NextRequest } from 'next/server';

// bitget-signal Skill 数据后端（官方公共 MCP：datahub.noxiaohao.com/mcp，免 Key）
// 提供 technical-analysis Skill 的 full_analysis（RSI/MACD/Bollinger/MA/ATR/支撑压力）
// 情绪/新闻类工具当前上游不稳，失败时优雅降级为 null，前端只展示可用部分
export const runtime = 'nodejs';
export const maxDuration = 60;

const MCP = 'https://datahub.noxiaohao.com/mcp';

let mcpSessionId: string | null = null;

async function rpc(method: string, params?: unknown, id = 1): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (mcpSessionId) headers['mcp-session-id'] = mcpSessionId;
  const res = await fetch(MCP, {
    method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const sid = res.headers.get('mcp-session-id');
  if (sid) mcpSessionId = sid;
  const text = await res.text();
  const dataLine = text.split('\n').find(l => l.startsWith('data:'));
  if (!dataLine) throw new Error('no data in MCP response');
  return JSON.parse(dataLine.slice(5).trim());
}

async function ensureSession() {
  if (mcpSessionId) return;
  await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'chandesk', version: '1.0.0' },
  });
  await fetch(MCP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'mcp-session-id': mcpSessionId! },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  });
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  await ensureSession();
  const r = await rpc('tools/call', { name, arguments: args }, Math.floor(Math.random() * 1e6));
  const text = r?.result?.content?.[0]?.text;
  if (typeof text !== 'string') return null;
  try { return JSON.parse(text); } catch { return text; }
}

/** TSLAUSDT → TSLA/USDT（datahub 的 technical_analysis 用 CCXT 格式） */
function toPair(symbol: string): string {
  return symbol.endsWith('USDT') ? `${symbol.slice(0, -4)}/USDT` : symbol;
}

const notEmpty = (v: unknown) => v !== null && !(typeof v === 'object' && v !== null && 'error' in v && !(v as { error: unknown }).error === false && Object.keys(v as object).length <= 1);

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? 'TSLAUSDT';
  const timeframe = req.nextUrl.searchParams.get('tf') === '1H' ? '1h' : req.nextUrl.searchParams.get('tf') === '15m' ? '15m' : '1h';
  try {
    const [ta, fg, ls] = await Promise.all([
      callTool('technical_analysis', { action: 'full_analysis', symbol: toPair(symbol), timeframe }),
      callTool('sentiment_index', { action: 'current' }).catch(() => null),
      callTool('derivatives_sentiment', { action: 'long_short', symbol: 'BTCUSDT', period: '4h' }).catch(() => null),
    ]);
    const body: Record<string, unknown> = {
      symbol, timeframe, source: 'bitget-signal (official Bitget Agent Hub skills)',
      technicalAnalysis: ta && notEmpty(ta) ? ta : null,
      fearGreed: fg && notEmpty(fg) ? fg : null,
      btcLongShort: ls && notEmpty(ls) ? ls : null,
    };
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'skill backend unavailable', detail: (e as Error).message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}
