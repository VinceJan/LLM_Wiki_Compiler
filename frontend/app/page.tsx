"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, useRef } from "react";
import FileDropZone from "@/components/FileDropZone";
import StatusBar from "@/components/StatusBar";
import GraphSearch from "@/components/GraphSearch";
import { SSEClient } from "@/lib/sse-client";
import * as api from "@/lib/api-client";

// 动态导入 KnowledgeGraph（依赖 force-graph，不支持 SSR）
const KnowledgeGraph = dynamic(() => import("@/components/KnowledgeGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-text-muted">
      <span className="text-sm">加载知识图谱组件...</span>
    </div>
  ),
});

// 动态导入 NodeDetail
const NodeDetail = dynamic(() => import("@/components/NodeDetail"), {
  ssr: false,
});

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

  // 设置面板状态
  const [showSettings, setShowSettings] = useState(false);
  const [storagePath, setStoragePath] = useState<string>("");
  const [rawDir, setRawDir] = useState<string>("");
  const [wikiDir, setWikiDir] = useState<string>("");

  // 加载当前配置
  useEffect(() => {
    api.getSettings().then((settings) => {
      setStoragePath(settings.storage_path);
      setRawDir(settings.raw_dir);
      setWikiDir(settings.wiki_dir);
    }).catch(() => {
      // 配置暂未加载，忽略
    });
  }, []);

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

  // 保存设置
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const settings = await api.updateSettings({ storage_path: storagePath });
      setStoragePath(settings.storage_path);
      setRawDir(settings.raw_dir);
      setWikiDir(settings.wiki_dir);
      setShowSettings(false);
    } catch {
      alert("保存设置失败，请检查路径是否有效");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-dark text-text">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-panel-bg">
        <h1 className="text-lg font-semibold tracking-wide">LLM Wiki Compiler</h1>
        <div className="flex items-center gap-4 text-sm text-text-muted">
          {storagePath && (
            <span className="text-xs font-mono text-text-muted/70" title={storagePath}>
              存储: {storagePath}
            </span>
          )}
          <span>v0.1.0</span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded hover:bg-bg-dark transition-colors"
            title="设置"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
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

      {/* 设置面板 */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative bg-panel-bg border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">设置</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded text-text-muted hover:text-white hover:bg-bg-dark transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  知识库存储路径
                </label>
                <input
                  type="text"
                  value={storagePath}
                  onChange={(e) => setStoragePath(e.target.value)}
                  placeholder="留空使用默认路径"
                  className="w-full bg-bg-dark border border-border rounded px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary font-mono"
                />
                <p className="text-xs text-text-muted mt-1">
                  修改后需重启后端。当前：
                </p>
                {rawDir && (
                  <p className="text-xs text-text-muted font-mono">原始文件: {rawDir}</p>
                )}
                {wikiDir && (
                  <p className="text-xs text-text-muted font-mono">知识库: {wikiDir}</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm rounded bg-bg-dark text-text-muted hover:text-text transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm rounded bg-primary text-white hover:bg-primary-hover transition"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
