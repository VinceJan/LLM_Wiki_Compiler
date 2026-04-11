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
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
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
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-800 border border-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
        />
      </div>

      {/* 下拉搜索结果 */}
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-40 mt-1 w-full bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {filtered.map(node => (
            <button
              key={node.id}
              onClick={() => handleSelect(node)}
              className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors truncate"
            >
              {node.title}
              <span className="ml-2 text-xs text-slate-500 font-mono">
                {node.id}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 无匹配结果 */}
      {isOpen && query.trim() && filtered.length === 0 && (
        <div className="absolute z-40 mt-1 w-full bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl px-3 py-2 text-sm text-slate-500">
          未找到匹配的节点
        </div>
      )}
    </div>
  );
}
