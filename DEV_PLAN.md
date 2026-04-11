# LLM Wiki Compiler - 开发计划

## 并行开发包拆分

### 包 A：后端基础（FastAPI）
**负责**：
- FastAPI 项目骨架 + `requirements.txt`
- 内容提取管道（`ContentExtractor`）：PDF / URL / DOCX / XLSX / MD / TXT
- Wiki 初始化：自动创建 `raw/`, `wiki/`, `wiki/index.md`, `wiki/log.md`, `AGENTS.md`
- API 路由骨架：
  - `POST /api/ingest` - 摄入
  - `POST /api/query` - 查询
  - `POST /api/lint` - 健康检查
  - `GET /api/files` - 文件列表
  - `GET /api/graph` - 图谱数据（基础版，从 wiki/ 扫描生成）
- SSE 流式输出：`GET /api/stream/{task_id}`
- Claude Code CLI 子进程调用引擎（方案 A）

**接口契约**：
```python
# POST /api/ingest 请求
{"type": "file"|"url", "content": "<file_path or url>"}
# POST /api/ingest 响应
{"task_id": "xxx", "status": "running"}

# GET /api/stream/{task_id} SSE 事件流
event: progress  data: {"message": "正在读取源内容..."}
event: progress  data: {"message": "发现概念: Transformer, Attention..."}
event: complete  data: {"files_changed": ["wiki/concepts/transformer.md", ...]}
event: error     data: {"error": "..."}

# GET /api/graph 响应
{"nodes": [{"id": "concepts/transformer.md", "title": "Transformer", "type": "concept", "links_count": 5}], "edges": [{"source": "concepts/transformer.md", "target": "concepts/attention.md"}]}
```

### 包 B：前端基础（Next.js）
**负责**：
- Next.js 项目骨架 + Tailwind CSS 配置
- 三面板布局组件（左：输入区，中：编译状态，右：知识图谱占位）
- 文件拖放组件 + URL 输入框
- Ingest / Query / Lint 操作按钮
- SSE 客户端：接收后端流式输出并实时显示
- 编译状态面板：进度条 + 文件变更列表 + 概念发现提示

**接口契约**：
```tsx
// 组件 props 示例
interface FileDropZoneProps {
  onFilesDropped: (files: File[]) => void;
}
interface StatusBarProps {
  status: 'idle' | 'running' | 'complete' | 'error';
  progressMessages: string[];
  filesChanged: string[];
}
```

### 包 C：知识图谱可视化
**负责**：
- `force-graph` 集成（React 封装组件）
- 节点交互：点击 → 侧边面板显示页面内容
- 搜索框：快速定位节点
- 颜色编码：concept / entity / source / query 不同颜色
- 图谱数据获取：调用 `GET /api/graph`

**接口契约**：
```tsx
interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
interface GraphNode {
  id: string;
  title: string;
  type: 'concept' | 'entity' | 'source' | 'query' | 'other';
  links_count: number;
}
interface GraphLink {
  source: string;
  target: string;
}
interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
}
```

### 目录结构
```
LLM Wiki Compiler/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── requirements.txt
│   ├── content_extractor.py # 内容提取管道
│   ├── wiki_engine.py       # Claude Code CLI 引擎
│   ├── graph_builder.py     # 图谱数据生成
│   ├── models.py            # Pydantic 模型
│   └── routes/
│       ├── ingest.py
│       ├── query.py
│       ├── lint.py
│       ├── files.py
│       └── graph.py
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx         # 主页面（三面板布局）
│   │   └── api/             # 如有需要的前端 API proxy
│   ├── components/
│   │   ├── FileDropZone.tsx
│   │   ├── StatusBar.tsx
│   │   ├── KnowledgeGraph.tsx
│   │   ├── NodeDetail.tsx
│   │   └── QueryPanel.tsx
│   ├── lib/
│   │   └── sse-client.ts
│   ├── package.json
│   └── tailwind.config.ts
├── docs/                    # 已有，不动
├── raw/                     # 运行时创建
├── wiki/                    # 运行时创建
└── AGENTS.md                # 运行时创建
```
