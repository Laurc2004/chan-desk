'use client';
// OKX 风格自定义下拉：搜索 + 高亮选中 + 键盘操作
import { useEffect, useRef, useState } from 'react';

export function Select({ value, options, onChange, placeholder, width = 120, searchable = false }: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options;

  return (
    <div ref={box} className="relative" style={{ width }}>
      <button type="button" onClick={() => { setOpen(o => !o); setQuery(''); }}
        className="inp w-full px-3 py-1.5 text-[13px] flex items-center justify-between gap-1 hover:border-[var(--brand-dim)]">
        <span className="truncate">{value || placeholder}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div className="dropdown-panel absolute z-50 mt-1 w-full max-h-64 overflow-y-auto">
          {searchable && (
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="搜索…"
              className="w-full bg-transparent px-3 py-2 text-[12px] border-b border-[var(--line)] outline-none placeholder:text-[var(--fg-2)]" />
          )}
          {filtered.length === 0 && <div className="px-3 py-2 text-[12px] text-[var(--fg-2)]">无匹配</div>}
          {filtered.map(o => (
            <div key={o} onClick={() => { onChange(o); setOpen(false); }}
              className={`dropdown-item px-3 py-2 text-[12px] cursor-pointer num ${o === value ? 'active font-semibold' : 'text-[var(--fg-1)]'}`}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
