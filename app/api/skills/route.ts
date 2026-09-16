import { NextRequest } from 'next/server';

// bitget-signal Skill 数据后端（官方公共 MCP：datahub.noxiaohao.com/mcp，免 Key）
// 提供 technical-analysis Skill 的 full_analysis（RSI/MACD/Bollinger/MA/ATR/支撑压力）
// 情绪/新闻类工具当前上游不稳，失败时优雅降级为 null，前端只展示可用部分
export const runtime = 'nodejs';
export const maxDuration = 60;

const MCP = 'https://datahub.noxiaohao.com/mcp';
const CACHE_TTL_MS = 5 * 60 * 1000; // 服务端缓存 5 分钟

let mcpSessionId: string | null = null;
const cache = new Map<string, { at: number; body: unknown }>();

async function rpc(method: string, params: unknown | undefined, id: number, timeoutMs = 9000): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (mcpSessionId) headers['mcp-session-id'] = mcpSessionId;
  const res = await fetch(MCP, {
    method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    signal: AbortSignal.timeout(timeoutMs),
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
  }, 1);
  await fetch(MCP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'mcp-session-id': mcpSessionId! },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    signal: AbortSignal.timeout(8000),
  });
}

async function callTool(name: string, args: Record<string, unknown>, timeoutMs = 9000): Promise<unknown> {
  await ensureSession();
  const r = await rpc('tools/call', { name, arguments: args }, Math.floor(Math.random() * 1e6), timeoutMs);
  const text = r?.result?.content?.[0]?.text;
  if (typeof text !== 'string') return null;
  try { return JSON.parse(text); } catch { return text; }
}

/** TSLAUSDT → TSLA/USDT（datahub 的 technical_analysis 用 CCXT 格式） */
function toPair(symbol: string): string {
  return symbol.endsWith('USDT') ? `${symbol.slice(0, -4)}/USDT` : symbol;
}

const isEmptyErr = (v: unknown) =>
  v === null || (typeof v === 'object' && v !== null && 'error' in v && Object.keys(v as object).length <= 1);

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') ?? 'TSLAUSDT';
  const tfParam = req.nextUrl.searchParams.get('tf');
  const timeframe = tfParam === '1H' ? '1h' : tfParam === '15m' ? '15m' : '1h';

  const hit = cache.get(`${symbol}:${timeframe}`);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return new Response(JSON.stringify(hit.body), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  }

  try {
    const [ta] = await Promise.all([
      callTool('technical_analysis', { action: 'full_analysis', symbol: toPair(symbol), timeframe }, 9000),
    ]);
    const body: Record<string, unknown> = {
      symbol, timeframe, source: 'bitget-signal (official Bitget Agent Hub skills)',
      technicalAnalysis: isEmptyErr(ta) ? null : ta,
    };
    cache.set(`${symbol}:${timeframe}`, { at: Date.now(), body });
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'skill backend unavailable', detail: (e as Error).message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}
