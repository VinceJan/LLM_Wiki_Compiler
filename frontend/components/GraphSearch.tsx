'use client';

import { useState, useRef, useEffect } from 'react';

interface GraphSearchProps {
  nodes: Array<{ id: string; title: string }>;
  onNodeSelect: (node: { id: string; title: string }) => void;
}

export default function GraphSearch({ nodes, onNodeSelect }: GraphSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 模糊搜索：匹配 title 中包含查询字符串的节点
  const filtered = query.trim()
    ? nodes.filter(n =>
        n.title.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  // 点击外部区域时关闭下拉列表
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (node: { id: string; title: string }) => {
    onNodeSelect(node);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 搜索输入框 */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => filtered.length > 0 && setIsOpen(true)}
          placeholder="搜索节点..."
          className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md bg-bg border border-border text-text placeholder-text-dim focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* 下拉搜索结果 */}
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-40 mt-1 w-full bg-elevated border border-border rounded-md shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {filtered.map(node => (
            <button
              key={node.id}
              onClick={() => handleSelect(node)}
              className="w-full text-left px-3 py-2 text-sm text-text hover:bg-bg transition-colors truncate"
            >
              {node.title}
              <span className="ml-2 text-[10px] text-text-dim font-mono">
                {node.id}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 无匹配结果 */}
      {isOpen && query.trim() && filtered.length === 0 && (
        <div className="absolute z-40 mt-1 w-full bg-elevated border border-border rounded-md shadow-xl px-3 py-2 text-sm text-text-dim">
          未找到匹配的节点
        </div>
      )}
    </div>
  );
}
