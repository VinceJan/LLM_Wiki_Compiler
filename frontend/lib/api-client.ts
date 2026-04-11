// API 客户端：与后端 FastAPI 服务通信

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * 上传文件进行摄入处理（multipart/form-data）
 */
export async function ingestFile(
  file: File,
): Promise<{ task_id: string }> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

/**
 * 提交 URL 进行摄入处理
 */
export async function ingestUrl(url: string): Promise<{ task_id: string }> {
  const res = await fetch(`${API_BASE}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "url", content: url }),
  });
  return res.json();
}

/**
 * 向知识库提问
 */
export async function submitQuestion(
  question: string,
): Promise<{ answer: string }> {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return res.json();
}

/**
 * 运行 Lint 健康检查
 */
export async function submitLint(): Promise<{ report: string }> {
  const res = await fetch(`${API_BASE}/api/lint`, {
    method: "POST",
  });
  return res.json();
}

/**
 * 获取知识图谱数据
 */
export async function getGraphData() {
  const res = await fetch(`${API_BASE}/api/graph`);
  return res.json();
}

/**
 * 获取文件列表（raw 或 wiki）
 */
export async function getFileList(type: "raw" | "wiki") {
  const res = await fetch(`${API_BASE}/api/files?type=${type}`);
  return res.json();
}

/**
 * 获取指定文件的内容
 */
export async function getFileContent(filePath: string) {
  const res = await fetch(
    `${API_BASE}/api/files/content/${encodeURIComponent(filePath)}`,
  );
  return res.json();
}

/**
 * 获取当前配置（存储路径等）
 */
export async function getSettings(): Promise<{
  storage_path: string;
  raw_dir: string;
  wiki_dir: string;
  claude_code_git_bash_path: string;
}> {
  const res = await fetch(`${API_BASE}/api/settings`);
  return res.json();
}

/**
 * 更新配置（修改存储路径等）
 */
export async function updateSettings(params: {
  storage_path?: string;
  claude_code_git_bash_path?: string;
}): Promise<{
  storage_path: string;
  raw_dir: string;
  wiki_dir: string;
  claude_code_git_bash_path: string;
}> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}
