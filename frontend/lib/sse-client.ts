// SSE 客户端：接收后端流式事件输出

export class SSEClient {
  private eventSource: EventSource | null = null;
  private onProgress: (message: string) => void;
  private onComplete: (filesChanged: string[]) => void;
  private onError: (error: string) => void;

  constructor(callbacks: {
    onProgress: (message: string) => void;
    onComplete: (filesChanged: string[]) => void;
    onError: (error: string) => void;
  }) {
    this.onProgress = callbacks.onProgress;
    this.onComplete = callbacks.onComplete;
    this.onError = callbacks.onError;
  }

  /**
   * 连接到 SSE 流
   * @param taskId 任务 ID
   */
  connect(taskId: string) {
    const API_BASE =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // 关闭已有连接
    this.disconnect();

    this.eventSource = new EventSource(`${API_BASE}/api/stream/${taskId}`);

    // 监听进度消息
    this.eventSource.addEventListener("progress", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        this.onProgress(data.message);
      } catch {
        this.onProgress(event.data);
      }
    });

    // 监听完成事件
    this.eventSource.addEventListener("complete", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        this.onComplete(data.files_changed || []);
        this.disconnect();
      } catch {
        this.onComplete([]);
        this.disconnect();
      }
    });

    // 监听错误事件
    this.eventSource.addEventListener("error", (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        this.onError(data.error || "未知错误");
        this.disconnect();
      } catch {
        this.onError(event.data || "连接错误");
        this.disconnect();
      }
    });

    // 连接错误处理
    this.eventSource.onerror = () => {
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        return; // 已主动关闭，忽略
      }
      this.onError("SSE 连接断开");
      this.disconnect();
    };
  }

  /**
   * 断开 SSE 连接
   */
  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
  }
}
