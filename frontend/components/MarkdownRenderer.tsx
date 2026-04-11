'use client';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * 简易 Markdown 渲染器（正则转换，不依赖外部库）
 * 支持：
 *   - # 标题 (h1 ~ h3)
 *   - **加粗**
 *   - *斜体*
 *   - `行内代码`
 *   - [[wikilink]] 高亮
 *   - 无序列表 (- / *)
 *   - 空行分段
 */
function simpleMarkdownToHtml(md: string): string {
  // 转义 HTML 特殊字符
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // [[wikilink]] 高亮 — 用主色调
  html = html.replace(
    /\[\[([^\]]+)\]\]/g,
    '<mark class="px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">$1</mark>'
  );

  // # 标题
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-text mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-text mt-4 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-text mt-4 mb-2">$1</h1>');

  // **加粗**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-text font-semibold">$1</strong>');

  // *斜体*（不与加粗冲突）
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="italic text-text-muted">$1</em>');

  // `行内代码`
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="px-1 py-0.5 rounded bg-elevated text-success text-sm font-mono">$1</code>'
  );

  // 无序列表
  html = html.replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc text-text-muted">$1</li>');

  // 空行分段
  html = html.replace(/\n{2,}/g, '</p><p class="mb-2 text-text-muted leading-relaxed">');

  // 单行换行
  html = html.replace(/\n/g, '<br />');

  return html;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const html = simpleMarkdownToHtml(content);

  return (
    <div
      className={`prose prose-invert max-w-none text-sm ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
