"use client";

interface StatusBarProps {
  status: "idle" | "running" | "complete" | "error";
  progressMessages: string[];
  filesChanged: string[];
}

// 状态配置
const STATUS_CONFIG = {
  idle: { label: "空闲", color: "bg-text-muted", dotColor: "bg-text-muted" },
  running: { label: "运行中", color: "text-primary", dotColor: "bg-primary animate-pulse-dot" },
  complete: { label: "完成", color: "text-success", dotColor: "bg-success" },
  error: { label: "错误", color: "text-error", dotColor: "bg-error" },
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
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* 进度消息列表 */}
      {progressMessages.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            进度消息
          </h3>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {progressMessages.map((msg, index) => (
              <div
                key={`${index}-${msg}`}
                className={`text-xs px-3 py-1.5 rounded bg-bg-dark border border-border ${
                  index === 0 ? "text-text" : "text-text-muted"
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
          <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            文件变更（{filesChanged.length}）
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filesChanged.map((filePath) => {
              const fileName = filePath.split("/").pop() || filePath;
              const isNew = filePath.includes("create") || !filePath.startsWith("wiki/");
              return (
                <div
                  key={filePath}
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-bg-dark border border-border"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      isNew ? "bg-success" : "bg-warning"
                    }`}
                  />
                  <span className="text-text-muted truncate font-mono">
                    {filePath}
                  </span>
                  <span
                    className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
                      isNew
                        ? "bg-success/20 text-success"
                        : "bg-warning/20 text-warning"
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
        <div className="text-center py-8 text-text-muted">
          <p className="text-sm">等待输入...</p>
          <p className="text-xs mt-1">拖放文件或输入 URL 开始编译</p>
        </div>
      )}
    </div>
  );
}
