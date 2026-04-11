"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import FileDropZone from "@/components/FileDropZone";
import StatusBar from "@/components/StatusBar";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import NodeDetail from "@/components/NodeDetail";
import GraphSearch from "@/components/GraphSearch";
import { SSEClient } from "@/lib/sse-client";
import * as api from "@/lib/api-client";

interface GraphNode {
  id: string;
  title: string;
  type: "concept" | "entity" | "source" | "query" | "other";
  links_count: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

export default function Home() {
  // 状态管理
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  const [filesChanged, setFilesChanged] = useState<string[]>([]);
  const [inputUrl, setInputUrl] = useState("");

  // 图谱状态
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    nodes: [],
    edges: [],
  });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodeContent, setNodeContent] = useState<string | null>(null);
  const [nodeLoading, setNodeLoading] = useState(false);

  // 底部面板状态
  const [bottomMode, setBottomMode] = useState<"query" | "lint">("query");
  const [queryInput, setQueryInput] = useState("");
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [lintReport, setLintReport] = useState<string | null>(null);
  const [lintLoading, setLintLoading] = useState(false);

  // SSE 客户端引用
  const sseRef = useRef<SSEClient | null>(null);

  // 初始化 SSE 客户端
  useEffect(() => {
    const sse = new SSEClient({
      onProgress: (message) => {
        setProgressMessages((prev) => [message, ...prev]);
      },
      onComplete: (changedFiles) => {
        setFilesChanged(changedFiles);
        setStatus("complete");
        fetchGraphData();
      },
      onError: (error) => {
        setProgressMessages((prev) => [`[错误] ${error}`, ...prev]);
        setStatus("error");
      },
    });
    sseRef.current = sse;

    return () => {
      sse.disconnect();
    };
  }, []);

  // 获取图谱数据
  const fetchGraphData = async () => {
    try {
      const data = await api.getGraphData();
      setGraphData(data);
    } catch {
      // 图谱数据暂未可用，忽略
    }
  };

  // 处理文件拖放
  const handleFilesDropped = useCallback(async (files: File[]) => {
    setStatus("running");
    setProgressMessages([]);
    setFilesChanged([]);

    for (const file of files) {
      try {
        const result = await api.ingestFile(file);
        sseRef.current?.connect(result.task_id);
      } catch {
        setStatus("error");
        setProgressMessages((prev) => [`[错误] 处理文件 ${file.name} 失败`, ...prev]);
      }
    }
  }, []);

  // 处理 URL 提交
  const handleUrlSubmit = useCallback(async (url: string) => {
    setInputUrl(url);
    setStatus("running");
    setProgressMessages([]);
    setFilesChanged([]);

    try {
      const result = await api.ingestUrl(url);
      sseRef.current?.connect(result.task_id);
    } catch {
      setStatus("error");
      setProgressMessages((prev) => [`[错误] 处理 URL ${url} 失败`, ...prev]);
    }
  }, []);

  // 处理 Query 提交
  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;

    setQueryLoading(true);
    setQueryAnswer(null);
    try {
      const result = await api.submitQuestion(queryInput);
      setQueryAnswer(result.answer);
    } catch {
      setQueryAnswer("查询失败，请稍后重试");
    } finally {
      setQueryLoading(false);
    }
  };

  // 处理 Lint 提交
  const handleLintSubmit = async () => {
    setLintLoading(true);
    setLintReport(null);
    try {
      const result = await api.submitLint();
      setLintReport(result.report);
    } catch {
      setLintReport("Lint 执行失败，请稍后重试");
    } finally {
      setLintLoading(false);
    }
  };

  // 点击图谱节点
  const handleNodeClick = useCallback(async (node: GraphNode) => {
    setSelectedNode(node);
    setNodeLoading(true);
    setNodeContent(null);
    try {
      const result = await api.getFileContent(node.id);
      setNodeContent(result.content);
    } catch {
      setNodeContent("无法加载内容");
    } finally {
      setNodeLoading(false);
    }
  }, []);

  // 图谱搜索选中
  const handleGraphSearch = useCallback(
    (node: { id: string; title: string }) => {
      const found = graphData.nodes.find((n) => n.id === node.id);
      if (found) {
        handleNodeClick(found);
      }
    },
    [graphData.nodes, handleNodeClick],
  );

  return (
    <div className="flex flex-col h-screen bg-bg-dark text-text">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-panel-bg">
        <h1 className="text-lg font-semibold tracking-wide">LLM Wiki Compiler</h1>
        <div className="flex gap-3 text-sm text-text-muted">
          <span>v0.1.0</span>
        </div>
      </header>

      {/* 主体三面板 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧面板：输入区 */}
        <aside className="w-[280px] flex-shrink-0 border-r border-border bg-panel-bg p-4 flex flex-col gap-4 overflow-y-auto">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider">
            📥 输入区
          </h2>
          <FileDropZone
            onFilesDropped={handleFilesDropped}
            onUrlSubmit={handleUrlSubmit}
            disabled={status === "running"}
          />
          <div className="mt-auto">
            <div className="text-xs text-text-muted space-y-1">
              <p>支持格式：PDF, DOCX, XLSX, MD, TXT</p>
              <p>拖放文件或粘贴 URL 开始编译</p>
            </div>
          </div>
        </aside>

        {/* 中间面板：编译状态区 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider">
              ⚙️ 编译状态
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <StatusBar
              status={status}
              progressMessages={progressMessages}
              filesChanged={filesChanged}
            />
          </div>
        </main>

        {/* 右侧面板：知识图谱区 */}
        <aside className="w-[400px] flex-shrink-0 border-l border-border bg-panel-bg flex flex-col relative">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider">
              🗺️ 知识图谱
            </h2>
            {graphData.nodes.length > 0 && (
              <GraphSearch nodes={graphData.nodes} onNodeSelect={handleGraphSearch} />
            )}
          </div>
          <div className="flex-1 relative">
            {graphData.nodes.length > 0 ? (
              <KnowledgeGraph data={graphData} onNodeClick={handleNodeClick} />
            ) : (
              <div className="flex items-center justify-center h-full text-center text-text-muted">
                <div>
                  <div className="text-4xl mb-3">🗺️</div>
                  <p className="text-sm">暂无知识图谱</p>
                  <p className="text-xs mt-1">摄入内容后将自动生成</p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 底部面板：Query & Lint */}
      <div className="border-t border-border bg-panel-bg px-4 py-3 max-h-[200px] overflow-y-auto">
        <div className="flex gap-2 mb-3">
          <button
            className={`px-3 py-1 text-xs rounded transition ${
              bottomMode === "query"
                ? "bg-primary text-white"
                : "bg-bg-dark text-text-muted hover:text-text"
            }`}
            onClick={() => setBottomMode("query")}
          >
            💬 Query
          </button>
          <button
            className={`px-3 py-1 text-xs rounded transition ${
              bottomMode === "lint"
                ? "bg-primary text-white"
                : "bg-bg-dark text-text-muted hover:text-text"
            }`}
            onClick={() => setBottomMode("lint")}
          >
            🔍 Lint
          </button>
        </div>

        {bottomMode === "query" ? (
          <div>
            <form onSubmit={handleQuerySubmit} className="flex gap-2">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="向知识库提问，例如：Transformer 和 RNN 的区别是什么？"
                className="flex-1 bg-bg-dark border border-border rounded px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white text-sm rounded hover:bg-primary-hover transition disabled:opacity-50"
                disabled={status === "running" || queryLoading}
              >
                {queryLoading ? "思考中..." : "发送"}
              </button>
            </form>
            {queryAnswer && (
              <div className="mt-2 text-sm text-text bg-bg-dark rounded p-3 max-h-[120px] overflow-y-auto whitespace-pre-wrap">
                {queryAnswer}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-text-muted">运行 Lint 检查断链、矛盾和孤儿页</p>
              <button
                onClick={handleLintSubmit}
                className="px-4 py-2 bg-primary text-white text-sm rounded hover:bg-primary-hover transition disabled:opacity-50"
                disabled={status === "running" || lintLoading}
              >
                {lintLoading ? "检查中..." : "运行检查"}
              </button>
            </div>
            {lintReport && (
              <div className="text-sm text-text bg-bg-dark rounded p-3 max-h-[120px] overflow-y-auto whitespace-pre-wrap font-mono">
                {lintReport}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 节点详情面板 */}
      <NodeDetail
        node={selectedNode}
        content={nodeContent}
        loading={nodeLoading}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
