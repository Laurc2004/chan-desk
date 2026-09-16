import { NextRequest } from 'next/server';

// Qwen 代理（qwen3.8-max，Bitget 黑客松额度，OpenAI 兼容）
// POST { messages, stream? } → 流式 text/plain 或 JSON { content }
// 流式：解决 reasoning 模型首字延迟（~70s），客户端边收边渲染
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { messages, temperature, stream } = await req.json().catch(() => ({}));
  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'messages required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'QWEN_API_KEY not configured',
      hint: '设置 Vercel 环境变量后重试；Demo 模式下前端会走本地规则回退',
    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  const upstream = await fetch('https://hackathon.bitgetops.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.QWEN_MODEL || 'qwen3.8-max',
      messages,
      temperature: temperature ?? 0.3,
      stream: !!stream,
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(JSON.stringify({ error: `Qwen upstream ${upstream.status}`, detail: text.slice(0, 500) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } });
  }

  if (stream) {
    // 透传 SSE，逐块转发 delta
    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  const json = await upstream.json();
  const content = json?.choices?.[0]?.message?.content ?? '';
  return new Response(JSON.stringify({ content, usage: json?.usage }),
    { headers: { 'Content-Type': 'application/json' } });
}
