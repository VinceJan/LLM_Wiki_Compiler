"use client";

import { useState, useCallback } from "react";

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

export default function FileDropZone({
  onFilesDropped,
  onUrlSubmit,
  disabled,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");

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

  return (
    <div className="space-y-3">
      {/* 拖放区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.02]"
              : "border-border hover:border-text-muted"
          }
          ${disabled ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <div className="text-2xl mb-2">📂</div>
        <p className="text-sm text-text-muted">
          {isDragging ? "松开以上传文件" : "拖放文件到此处"}
        </p>
        <p className="text-xs text-text-muted mt-1">
          PDF, DOCX, XLSX, MD, TXT
        </p>
      </div>

      {/* URL 输入 */}
      <form onSubmit={handleUrlSubmit} className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="粘贴 URL 链接..."
          disabled={disabled}
          className="flex-1 bg-bg-dark border border-border rounded px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !urlInput.trim()}
          className="px-3 py-2 bg-primary text-white text-sm rounded hover:bg-primary-hover transition disabled:opacity-50"
        >
          提交
        </button>
      </form>
    </div>
  );
}
