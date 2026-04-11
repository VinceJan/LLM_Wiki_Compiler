'use client';

import MarkdownRenderer from './MarkdownRenderer';

interface NodeDetailProps {
  node: { id: string; title: string; type: string } | null;
  content: string | null;
  loading: boolean;
  onClose: () => void;
}

export default function NodeDetail({ node, content, loading, onClose }: NodeDetailProps) {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 遮罩层 - 点击关闭 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 右侧滑出面板 */}
      <div className="relative ml-auto w-full max-w-md h-full bg-panel border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
        {/* 面板头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-text truncate">
              {node.title}
            </h2>
            <span className="text-xs text-text-dim font-mono">
              {node.id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1.5 rounded-md text-text-dim hover:text-text hover:bg-elevated transition-colors"
            aria-label="关闭"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 类型标签 */}
        <div className="px-4 py-2 border-b border-border-subtle">
          <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md bg-elevated text-text-muted">
            {node.type}
          </span>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-text-dim">加载内容中...</span>
              </div>
            </div>
          ) : content ? (
            <MarkdownRenderer content={content} />
          ) : (
            <div className="flex items-center justify-center h-32">
              <span className="text-sm text-text-dim">暂无内容</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
