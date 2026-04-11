# LLM Wiki Compiler

> 可视化的 LLM Wiki 编译器 —— 让知识编译过程可见、可操作、可交互。

---

## 产品简介

拖入文件或粘贴 URL → 自动编译成结构化、互相链接的知识库，实时看到知识图谱的生长过程。

### 核心能力

| 功能 | 说明 |
|------|------|
| **Ingest（摄入）** | 拖入 PDF/Word/Excel/MD/TXT 文件或粘贴 URL，自动提取关键概念，创建/更新互链 Wiki 页面 |
| **Query（查询）** | 基于知识库提问，LLM 综合已有信息回答，答案自动存为新页面 |
| **Lint（健康检查）** | 扫描断链、矛盾声明、孤立页面，生成检测报告 |

### 技术原理

本项目基于 [Karpathy 提出的 LLM Wiki Compiler 理念](https://gist.github.com/karpathy)：
- LLM 不是每次从零检索，而是**增量式构建持久化 Wiki**
- 知识库维护最累的是簿记工作，但 LLM 不会厌倦
- 用 `AGENTS.md` 定义 Schema，LLM 看到指令就知道该怎么编译

---

## 快速开始（使用者）

### 前置条件

1. **Claude Code CLI** 已安装且在 PATH 中
   - Windows 用户如果 Git 安装在非标准路径，需要设置环境变量：
     ```
     CLAUDE_CODE_GIT_BASH_PATH=E:\Develop_tools\Git\bin\bash.exe
     ```
     （路径替换为你的实际 git-bash 路径）
2. **Node.js** >= 18
3. **Python** >= 3.12

### 启动服务

```bash
# 1. 安装后端依赖
cd backend
pip install -r requirements.txt

# 2. 安装前端依赖
cd ../frontend
npm install

# 3. 启动后端（端口 8000）
cd ../backend
python -m uvicorn main:app --reload --port 8000

# 4. 启动前端（端口 3000），新开一个终端
cd ../frontend
npm run dev
```

### 使用方法

1. 打开浏览器访问 **http://localhost:3000**
2. 左侧面板拖入文件或粘贴 URL
3. 点击 `▶ Ingest` 开始编译，中间面板实时显示进度
4. 右侧图谱区域自动显示知识图谱（摄入内容后）
5. 底部面板可提问（Query）或运行健康检查（Lint）

### 数据存储位置

**默认存储路径**：项目根目录下的 `data/` 目录

| 数据类型 | 存储路径 | 说明 |
|---------|---------|------|
| 原始输入文件 | `data/raw/` | 自动保存摄入的源文件 |
| 编译后的知识库 | `data/wiki/` | LLM 生成的互链 Markdown 文件 |
| Schema 配置 | `data/AGENTS.md` | 告诉 LLM 如何编译知识库 |

```
项目根目录/
├── data/                     ← 运行时数据目录（可在设置中更改）
│   ├── raw/                  ← 你传入的源文件（自动保存）
│   │   └── raw_xxxxxxxx.md
│   ├── wiki/                 ← 编译后的知识库
│   │   ├── index.md          ← 知识索引
│   │   ├── log.md            ← 操作日志
│   │   ├── concepts/         ← 概念页面
│   │   ├── entities/         ← 实体页面
│   │   ├── sources/          ← 来源摘要
│   │   └── queries/          ← 查询答案
│   └── AGENTS.md             ← LLM 编译指令
└── backend/
    └── config.json           ← 配置文件（可手动修改 storage_path）
```

**自定义存储路径**：
1. 点击页面右上角 ⚙️ 设置按钮
2. 输入你想要的存储路径（如 `D:/my-knowledge-base`）
3. 保存后重启后端生效
4. 也可以直接编辑 `backend/config.json` 中的 `storage_path` 字段

**关于使用中的一些问题：**

- **浏览器直接使用即可**：前后端都在本地运行，打开 `http://localhost:3000` 就能用
- **不会影响项目源码**：运行时只读写 `data/` 目录，不修改任何代码文件
- **不会影响测试**：测试和运行完全隔离，互不影响
- **知识图谱是自动生成的**：不需要手动创建，摄入内容后前端自动调用 `/api/graph` 渲染
- **传入的文件自动保存**：上传的文件会提取内容后存入 `data/raw/` 目录
- **测试产生的文件**：`test-results/` 目录已被 gitignore，不会提交到仓库

---

## 开发者指南

### 项目结构

```
LLM Wiki Compiler/
├── backend/                    # Python FastAPI 后端
│   ├── main.py                 # 应用入口 + CORS + 路由注册
│   ├── config.json             # 用户配置（存储路径、git-bash 路径）
│   ├── config_manager.py       # 配置管理模块
│   ├── content_extractor.py    # 多格式内容提取（PDF/URL/DOCX/XLSX）
│   ├── wiki_engine.py          # Wiki 引擎（Claude Code CLI 交互）
│   ├── graph_builder.py        # 图谱数据生成（扫描 wiki 目录）
│   ├── models.py               # Pydantic 数据模型
│   ├── routes/                 # API 路由
│   │   ├── ingest.py           # POST /api/ingest + POST /api/upload + SSE
│   │   ├── query.py            # POST /api/query
│   │   ├── lint.py             # POST /api/lint
│   │   ├── files.py            # GET /api/files, GET /api/files/content
│   │   ├── graph.py            # GET /api/graph
│   │   └── settings.py         # GET/POST /api/settings
│   └── requirements.txt        # Python 依赖
├── frontend/                   # Next.js + React 前端
│   ├── app/
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 主页面（三面板布局）
│   │   └── globals.css         # 主题变量 + 动画
│   ├── components/
│   │   ├── FileDropZone.tsx    # 文件拖放 + URL 输入
│   │   ├── StatusBar.tsx       # 编译状态显示
│   │   ├── KnowledgeGraph.tsx  # force-graph 力导向图谱
│   │   ├── NodeDetail.tsx      # 节点详情侧面板
│   │   ├── GraphSearch.tsx     # 图谱节点搜索
│   │   └── MarkdownRenderer.tsx# 简易 Markdown 渲染
│   ├── lib/
│   │   ├── api-client.ts       # REST API 客户端
│   │   ├── sse-client.ts       # SSE 客户端
│   │   └── force-graph.d.ts    # 类型声明
│   ├── package.json
│   └── tsconfig.json
├── tests/                      # 自动化测试
│   ├── test_api.spec.ts        # API 集成测试（9 个用例）
│   └── test_ui_render.spec.ts  # UI 渲染测试（15 个用例）
├── docs/                       # 项目文档
│   ├── 01-调研结论汇总.md
│   ├── 02-产品设计文档.md
│   └── 03-技术架构与实现计划.md
├── DEV_PLAN.md                 # 开发计划（任务分解）
├── playwright.config.ts        # Playwright 测试配置
├── .gitignore
└── README.md                   # 本文件
```

### 架构设计

```
┌─────────────────────────────────────────┐
│          Next.js Web UI (3000)          │
│  ┌────────┐ ┌────────┐ ┌──────────────┐│
│  │ 输入   │ │ 编译状态│ │ 知识图谱     ││
│  │ 拖/URL │ │ SSE 流 │ │ force-graph  ││
│  └───┬────┘ └───┬────┘ └──────┬───────┘│
└──────┼──────────┼─────────────┼─────────┘
       │          │             │
       ▼          ▼             ▼
┌─────────────────────────────────────────┐
│       FastAPI Backend (8000)            │
│                                         │
│  POST /api/ingest   → 启动编译任务       │
│  POST /api/upload   → 文件上传+编译      │
│  GET  /api/stream   → SSE 流式进度       │
│  POST /api/query    → 基于 Wiki 回答     │
│  POST /api/lint     → 健康检查           │
│  GET  /api/graph    → 图谱数据           │
│  GET  /api/files    → 文件列表/内容      │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ Content      │  │ Wiki Engine     │  │
│  │ Extractor    │  │ (Claude Code    │  │
│  │ PDF/DOCX/    │  │  CLI subproc)   │  │
│  │ XLSX/URL     │  │                 │  │
│  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────┘
       │
       ▼
┌──────────────┐
│  raw/ + wiki/│
│  AGENTS.md   │
└──────────────┘
```

### 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| 前端框架 | Next.js 15 + React 19 | App Router + Server Components |
| 样式 | Tailwind CSS v4 | 深色主题 |
| 图谱可视化 | force-graph (D3) | 力导向图 |
| 后端框架 | Python FastAPI | 异步支持 |
| LLM 引擎 | Claude Code CLI | 通过 subprocess 调用 |
| 内容提取 | PyMuPDF, python-docx, openpyxl, Jina Reader | 多格式支持 |
| 实时通信 | SSE (Server-Sent Events) | 编译进度流式推送 |
| 测试 | Playwright | E2E + API 测试 |

### 运行测试

```bash
# 安装测试依赖（在 frontend 目录下）
cd frontend
npm install

# 运行全部测试（24 个用例）
npx playwright test

# 只运行 API 测试
npx playwright test --project api

# 只运行 UI 测试
npx playwright test --project ui

# 有头模式（可视化）
npx playwright test --headed

# 生成报告
npx playwright show-report
```

### API 接口

| 方法 | 路径 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/ingest` | 启动编译任务（URL/text） | `{"type":"url\|text","content":"..."}` | `{"task_id":"...","status":"running"}` |
| POST | `/api/upload` | 文件上传并编译 | `multipart/form-data` | `{"task_id":"...","status":"running"}` |
| GET | `/api/stream/{task_id}` | SSE 流式进度 | — | EventStream |
| POST | `/api/query` | 基于 Wiki 回答 | `{"question":"..."}` | `{"answer":"..."}` |
| POST | `/api/lint` | 健康检查 | — | `{"report":"..."}` |
| GET | `/api/graph` | 图谱数据 | — | `{"nodes":[...],"edges":[...]}` |
| GET | `/api/files?type=wiki` | 文件列表 | — | `{"files":[...]}` |
| GET | `/api/files/content/{path}` | 文件内容 | — | `{"path":"...","content":"..."}` |
| GET | `/api/health` | 健康检查 | — | `{"status":"ok"}` |
| GET | `/api/settings` | 获取配置 | — | `{"storage_path":"...","raw_dir":"...","wiki_dir":"..."}` |
| POST | `/api/settings` | 更新配置 | `{"storage_path":"..."}` | 更新后的配置 |

### 编译引擎原理

后端通过 subprocess 调用 `claude --print --permission-mode bypassPermissions` 执行编译：
- Claude Code 看到 `AGENTS.md` 中的指令，自动执行 ingest/query/lint 操作
- 实时读取 stdout，通过 SSE 推送给前端
- 编译完成后自动扫描 `wiki/` 目录更新图谱

**无需自建 Agent 框架** —— Prompt 就是流程控制。

---

## 路线图

### MVP（当前）
- [x] 文件拖放 / URL 粘贴
- [x] 文件上传（multipart/form-data）
- [x] 多格式内容提取
- [x] Claude Code CLI 编译引擎
- [x] SSE 实时进度推送
- [x] 知识图谱可视化
- [x] Query 对话框
- [x] Lint 基础功能
- [x] 自定义存储路径设置

### 后续
- [ ] 矛盾检测
- [ ] 矛盾检测
- [ ] 一键修复
- [ ] 导出为 Obsidian Vault
- [ ] Git 版本控制集成
- [ ] 多知识库管理

---

## License

MIT
