"use client";

interface StatusBarProps {
  status: "idle" | "running" | "complete" | "error";
  progressMessages: string[];
  filesChanged: string[];
}

// 状态配置
const STATUS_CONFIG = {
  idle: { label: "空闲", dotColor: "bg-text-dim" },
  running: { label: "运行中", dotColor: "bg-primary animate-pulse-dot" },
  complete: { label: "完成", dotColor: "bg-success" },
  error: { label: "错误", dotColor: "bg-error" },
};

export default function StatusBar({
  status,
  progressMessages,
  filesChanged,
}: StatusBarProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="space-y-4">
      {/* 状态指示器 */}
      <div className="flex items-center gap-2.5">
        <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        <span className="text-[13px] font-semibold text-text-muted">
          {config.label}
        </span>
      </div>

      {/* 进度消息列表 */}
      {progressMessages.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold text-text-dim uppercase tracking-[0.15em] mb-2">
            进度
          </h3>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {progressMessages.map((msg, index) => (
              <div
                key={`${index}-${msg}`}
                className={`text-xs px-3 py-1.5 rounded-md border ${
                  index === 0
                    ? "text-text bg-elevated border-border"
                    : "text-text-dim bg-bg border-border-subtle"
                }`}
              >
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 文件变更列表 */}
      {filesChanged.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold text-text-dim uppercase tracking-[0.15em] mb-2">
            文件变更 ({filesChanged.length})
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filesChanged.map((filePath) => {
              const fileName = filePath.split("/").pop() || filePath;
              const isNew = filePath.includes("create") || !filePath.startsWith("wiki/");
              return (
                <div
                  key={filePath}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md bg-bg border border-border-subtle"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      isNew ? "bg-success" : "bg-warning"
                    }`}
                  />
                  <span className="text-text-dim truncate font-mono">
                    {filePath}
                  </span>
                  <span
                    className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
                      isNew
                        ? "text-success bg-success/10"
                        : "text-warning bg-warning/10"
                    }`}
                  >
                    {isNew ? "创建" : "更新"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 空闲状态提示 */}
      {status === "idle" && progressMessages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-text-dim">
          <svg className="w-8 h-8 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
          <p className="text-[13px] text-text-muted">等待输入</p>
          <p className="text-xs mt-1 text-text-dim">拖放文件或输入 URL 开始编译</p>
        </div>
      )}
    </div>
  );
}
