"use client";

import { useState, useCallback, useEffect } from "react";

interface FileDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  onUrlSubmit: (url: string) => void;
  disabled: boolean;
}

// 支持的文件类型
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".md", ".txt"];

function isAcceptedFile(file: File): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext);
}

function extractFilesFromClipboard(clipboardData: DataTransfer | null): File[] {
  if (!clipboardData) return [];
  const files: File[] = [];
  for (const item of Array.from(clipboardData.items)) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
}

export default function FileDropZone({
  onFilesDropped,
  onUrlSubmit,
  disabled,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  // 全局粘贴事件处理
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;

      // 如果焦点在任何输入元素中，不拦截（允许正常粘贴文本）
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      const files = extractFilesFromClipboard(e.clipboardData);
      const acceptedFiles = files.filter(isAcceptedFile);

      if (acceptedFiles.length > 0) {
        e.preventDefault();
        onFilesDropped(acceptedFiles);

        // 视觉反馈：短暂高亮拖放区域
        setIsPasting(true);
        setTimeout(() => setIsPasting(false), 500);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [disabled, onFilesDropped]);

  // 拖放事件处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter(isAcceptedFile);
      if (files.length > 0) {
        onFilesDropped(files);
      }
    },
    [disabled, onFilesDropped],
  );

  // URL 提交处理
  const handleUrlSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (disabled || !urlInput.trim()) return;
      onUrlSubmit(urlInput.trim());
      setUrlInput("");
    },
    [disabled, urlInput, onUrlSubmit],
  );

  const dropZoneActive = isDragging || isPasting;

  return (
    <div className="space-y-3">
      {/* 拖放区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border border-dashed rounded-lg p-6 text-center transition-all duration-200
          ${
            dropZoneActive
              ? "border-primary bg-primary-subtle"
              : "border-border hover:border-text-dim"
          }
          ${disabled ? "opacity-40 pointer-events-none" : ""}
        `}
      >
        <div className="flex flex-col items-center gap-2">
          <svg className={`w-6 h-6 transition-colors ${dropZoneActive ? "text-primary" : "text-text-dim"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-[13px] text-text-muted">
            {isPasting
              ? "已粘贴文件"
              : isDragging
                ? "松开以上传"
                : "拖放或粘贴文件"}
          </p>
          <p className="text-xs text-text-dim">
            PDF, DOCX, XLSX, MD, TXT
          </p>
        </div>
      </div>

      {/* URL 输入 */}
      <form onSubmit={handleUrlSubmit} className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="粘贴 URL..."
          disabled={disabled}
          className="flex-1 bg-bg border border-border rounded-md px-3 py-2 text-[13px] text-text placeholder-text-dim focus:outline-none focus:border-primary disabled:opacity-40 transition-colors"
        />
        <button
          type="submit"
          disabled={disabled || !urlInput.trim()}
          className="px-3 py-2 bg-primary text-bg text-[13px] font-semibold rounded-md hover:bg-primary-hover transition disabled:opacity-40"
        >
          提交
        </button>
      </form>
    </div>
  );
}
