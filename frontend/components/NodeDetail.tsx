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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 右侧滑出面板 */}
      <div className="relative ml-auto w-full max-w-md h-full bg-slate-900 border-l border-slate-700/50 shadow-2xl flex flex-col animate-slide-in-right">
        {/* 面板头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white truncate">
              {node.title}
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              {node.id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 类型标签 */}
        <div className="px-4 py-2 border-b border-slate-700/30">
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-slate-700/60 text-slate-300">
            {node.type}
          </span>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-400">加载内容中...</span>
              </div>
            </div>
          ) : content ? (
            <MarkdownRenderer content={content} />
          ) : (
            <div className="flex items-center justify-center h-32">
              <span className="text-sm text-slate-500">暂无内容</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
