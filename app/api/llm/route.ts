import { NextRequest, NextResponse } from 'next/server';

// Qwen 代理（qwen3.8-max，Bitget 黑客松额度，OpenAI 兼容）
// POST { messages, jsonSchema? } → { content }
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { messages, jsonSchema, temperature } = await req.json().catch(() => ({}));
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'QWEN_API_KEY not configured', hint: '设置 Vercel 环境变量后重试；Demo 模式下前端会走本地规则回退' }, { status: 503 });
  }
  const body: Record<string, unknown> = {
    model: process.env.QWEN_MODEL || 'qwen3.8-max',
    messages,
    temperature: temperature ?? 0.3,
  };
  if (jsonSchema) {
    body.response_format = { type: 'json_object' };
  }
  try {
    const res = await fetch('https://hackathon.bitgetops.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Qwen upstream ${res.status}`, detail: text.slice(0, 500) }, { status: 502 });
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ content, usage: json?.usage });
  } catch (e) {
    return NextResponse.json({ error: 'qwen fetch failed', detail: (e as Error).message }, { status: 502 });
  }
}
