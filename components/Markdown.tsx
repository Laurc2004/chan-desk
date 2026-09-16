'use client';
// Markdown 渲染（marked + dompurify），流式时带光标
import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ breaks: true, gfm: true });

export function Markdown({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const html = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const raw = marked.parse(text) as string;
    return DOMPurify.sanitize(raw);
  }, [text]);
  return (
    <div
      className={`md-body ${streaming ? 'stream-cursor' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
