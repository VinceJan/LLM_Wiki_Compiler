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
      <span className="text-[13px]">加载知识图谱...</span>
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

// 面板标题组件
function PanelTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
      <span className="text-text-dim">{icon}</span>
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-[0.15em]">
        {children}
      </h2>
    </div>
  );
}

// 设置图标 SVG
function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// 关闭图标 SVG
function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
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

        // 为每个文件创建独立的 SSE 客户端并等待完成
        await new Promise<void>((resolve, reject) => {
          const sse = new SSEClient({
            onProgress: (message) => {
              setProgressMessages((prev) => [message, ...prev]);
            },
            onComplete: (changedFiles) => {
              setFilesChanged((prev) => [...prev, ...changedFiles]);
              resolve();
            },
            onError: (error) => {
              setProgressMessages((prev) => [`[错误] ${error}`, ...prev]);
              reject(new Error(error));
            },
          });
          sse.connect(result.task_id);
        });
      } catch {
        setStatus("error");
        setProgressMessages((prev) => [`[错误] 处理文件 ${file.name} 失败`, ...prev]);
      }
    }

    // 所有文件处理完成后，刷新图谱
    fetchGraphData();
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
    <div className="flex flex-col h-screen bg-bg text-text">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-border-subtle bg-panel">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
            <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 className="text-sm font-bold tracking-tight">LLM Wiki Compiler</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-text-muted">
          {storagePath && (
            <span className="text-xs font-mono text-text-dim truncate max-w-[200px]" title={storagePath}>
              {storagePath}
            </span>
          )}
          <span className="text-xs text-text-dim font-mono">v0.1.0</span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-md hover:bg-elevated transition-colors text-text-dim hover:text-text-muted"
            title="设置"
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      {/* 主体三面板 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧面板：输入区 */}
        <aside className="w-[280px] flex-shrink-0 border-r border-border-subtle bg-panel flex flex-col">
          <PanelTitle icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          }>
            输入
          </PanelTitle>
          <div className="flex-1 overflow-y-auto p-4">
            <FileDropZone
              onFilesDropped={handleFilesDropped}
              onUrlSubmit={handleUrlSubmit}
              disabled={status === "running"}
            />
          </div>
          <div className="px-4 py-3 border-t border-border-subtle">
            <div className="text-xs text-text-dim space-y-1">
              <p>支持 PDF, DOCX, XLSX, MD, TXT</p>
              <p>拖放或粘贴文件开始编译</p>
            </div>
          </div>
        </aside>

        {/* 中间面板：编译状态区 */}
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">
          <PanelTitle icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          }>
            编译状态
          </PanelTitle>
          <div className="flex-1 overflow-y-auto p-4">
            <StatusBar
              status={status}
              progressMessages={progressMessages}
              filesChanged={filesChanged}
            />
          </div>
        </main>

        {/* 右侧面板：知识图谱区 */}
        <aside className="w-[400px] flex-shrink-0 border-l border-border-subtle bg-panel flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
              </svg>
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-[0.15em]">
                知识图谱
              </h2>
            </div>
            {graphData.nodes.length > 0 && (
              <GraphSearch nodes={graphData.nodes} onNodeSelect={handleGraphSearch} />
            )}
          </div>
          <div className="flex-1 relative">
            {graphData.nodes.length > 0 ? (
              <KnowledgeGraph data={graphData} onNodeClick={handleNodeClick} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-text-dim">
                <svg className="w-10 h-10 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                </svg>
                <p className="text-[13px] text-text-muted">暂无知识图谱</p>
                <p className="text-xs mt-1 text-text-dim">摄入内容后将自动生成</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 底部面板：Query & Lint */}
      <div className="border-t border-border-subtle bg-panel px-5 py-3 max-h-[200px] overflow-y-auto">
        <div className="flex gap-1.5 mb-3">
          <button
            className={`px-3 py-1 text-xs rounded-md transition ${
              bottomMode === "query"
                ? "bg-primary text-bg font-semibold"
                : "bg-elevated text-text-muted hover:text-text"
            }`}
            onClick={() => setBottomMode("query")}
          >
            Query
          </button>
          <button
            className={`px-3 py-1 text-xs rounded-md transition ${
              bottomMode === "lint"
                ? "bg-primary text-bg font-semibold"
                : "bg-elevated text-text-muted hover:text-text"
            }`}
            onClick={() => setBottomMode("lint")}
          >
            Lint
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
                className="flex-1 bg-bg border border-border rounded-md px-3 py-2 text-[13px] text-text placeholder-text-dim focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-bg text-[13px] font-semibold rounded-md hover:bg-primary-hover transition disabled:opacity-40"
                disabled={status === "running" || queryLoading}
              >
                {queryLoading ? "思考中..." : "发送"}
              </button>
            </form>
            {queryAnswer && (
              <div className="mt-2 text-[13px] text-text bg-bg border border-border rounded-md p-3 max-h-[120px] overflow-y-auto whitespace-pre-wrap animate-fade-in">
                {queryAnswer}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] text-text-muted">运行 Lint 检查断链、矛盾和孤儿页</p>
              <button
                onClick={handleLintSubmit}
                className="px-4 py-2 bg-primary text-bg text-[13px] font-semibold rounded-md hover:bg-primary-hover transition disabled:opacity-40"
                disabled={status === "running" || lintLoading}
              >
                {lintLoading ? "检查中..." : "运行检查"}
              </button>
            </div>
            {lintReport && (
              <div className="text-[13px] text-text bg-bg border border-border rounded-md p-3 max-h-[120px] overflow-y-auto whitespace-pre-wrap font-mono animate-fade-in">
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative bg-panel border border-border rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold">设置</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-md text-text-dim hover:text-text hover:bg-elevated transition"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">
                  知识库存储路径
                </label>
                <input
                  type="text"
                  value={storagePath}
                  onChange={(e) => setStoragePath(e.target.value)}
                  placeholder="留空使用默认路径"
                  className="w-full bg-bg border border-border rounded-md px-3 py-2 text-[13px] text-text placeholder-text-dim focus:outline-none focus:border-primary transition-colors font-mono"
                />
                <p className="text-xs text-text-dim mt-1.5">
                  修改后需重启后端。当前：
                </p>
                {rawDir && (
                  <p className="text-xs text-text-dim font-mono">原始文件: {rawDir}</p>
                )}
                {wikiDir && (
                  <p className="text-xs text-text-dim font-mono">知识库: {wikiDir}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-xs rounded-md bg-elevated text-text-muted hover:text-text transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs rounded-md bg-primary text-bg font-semibold hover:bg-primary-hover transition"
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
