"""Wiki 引擎：负责初始化 wiki 结构、调用 Claude Code CLI 执行 ingest/query/lint 操作。"""

import asyncio
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator

from content_extractor import ContentExtractor

# Windows 环境下 Claude Code CLI 需要的 git-bash 路径
CLAUDE_CODE_GIT_BASH_PATH = os.environ.get(
    "CLAUDE_CODE_GIT_BASH_PATH",
    r"E:\Develop_tools\Git\bin\bash.exe"
)

# 项目根目录，默认为脚本所在目录的上级
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WIKI_ROOT = PROJECT_ROOT / "wiki"
DEFAULT_RAW_DIR = PROJECT_ROOT / "raw"


class WikiEngine:
    """Wiki 引擎，管理 wiki 目录结构和 Claude Code CLI 交互。"""

    def __init__(self, wiki_root: str = None, raw_dir: str = None):
        """初始化路径。

        Args:
            wiki_root: wiki 目录根路径
            raw_dir: raw 目录根路径
        """
        self.wiki_root = Path(wiki_root) if wiki_root else DEFAULT_WIKI_ROOT
        self.raw_dir = Path(raw_dir) if raw_dir else DEFAULT_RAW_DIR

    def _get_agents_md_content(self) -> str:
        """生成 AGENTS.md 的内容，包含 Schema 设计指令。"""
        return """# LLM Wiki 编译器

你是一个 LLM Wiki 编译器。你的任务是维护一个结构化的知识库。

## 目录结构
- `raw/` - 原始源文件（不可变，只读）
- `wiki/` - 你生成和维护的互连 Markdown 知识库
- `wiki/index.md` - 内容索引
- `wiki/log.md` - 操作日志

## 页面命名约定
- 概念页: `wiki/concepts/{concept-name}.md`
- 实体页: `wiki/entities/{entity-name}.md`
- 摘要页: `wiki/sources/{source-title}.md`
- 查询页: `wiki/queries/{query-title}.md`

## 页面格式
每个页面必须以 YAML frontmatter 开头：

---
title: 页面标题
created: 2026-04-11
tags: [标签1, 标签2]
source: 原始来源URL或文件
---

正文使用 [[wikilink]] 语法引用其他页面。

## Ingest 流程
当你收到一个 ingest 请求时：

1. 阅读源内容，提取关键信息
2. 识别所有关键概念和实体
3. 对于每个概念/实体：
   a. 检查 wiki/ 下是否已有对应页面
   b. 如果没有，创建新页面
   c. 如果有，更新内容并添加新的关联
4. 创建摘要页 wiki/sources/{title}.md
5. 更新 wiki/index.md，为新页面添加条目
6. 在 wiki/log.md 追加操作记录

## Query 流程
当你收到一个 query 请求时：

1. 先读取 wiki/index.md 了解知识库全貌
2. 搜索相关的 wiki 页面
3. 综合相关信息回答问题
4. 如果有价值，将答案保存为 wiki/queries/{title}.md

## Lint 流程
当你收到一个 lint 请求时：

1. 扫描所有 wiki 页面中的 [[wikilink]]
2. 检查每个链接是否有对应的文件
3. 识别孤立页面（没有被任何其他页面链接）
4. 检查是否有矛盾的陈述
5. 输出检测报告
"""

    def initialize_wiki(self) -> None:
        """如果 wiki 目录不存在，则创建完整的初始结构。

        创建以下目录和文件：
        - raw/
        - wiki/
        - wiki/concepts/
        - wiki/entities/
        - wiki/sources/
        - wiki/queries/
        - wiki/index.md
        - wiki/log.md
        - AGENTS.md
        """
        # 创建目录结构
        self.wiki_root.mkdir(parents=True, exist_ok=True)
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        (self.wiki_root / "concepts").mkdir(exist_ok=True)
        (self.wiki_root / "entities").mkdir(exist_ok=True)
        (self.wiki_root / "sources").mkdir(exist_ok=True)
        (self.wiki_root / "queries").mkdir(exist_ok=True)

        # 创建 index.md
        index_path = self.wiki_root / "index.md"
        if not index_path.exists():
            index_path.write_text("# 知识索引\n\n暂无内容，请先摄入源文件。\n", encoding="utf-8")

        # 创建 log.md
        log_path = self.wiki_root / "log.md"
        if not log_path.exists():
            log_path.write_text("# 操作日志\n\n暂无记录。\n", encoding="utf-8")

        # 创建 AGENTS.md
        agents_path = self.wiki_root.parent / "AGENTS.md"
        if not agents_path.exists():
            agents_path.write_text(self._get_agents_md_content(), encoding="utf-8")

    async def run_ingest(self, source_content: str, task_id: str) -> AsyncGenerator:
        """异步生成器，通过 subprocess 调用 Claude Code CLI 执行 ingest。

        Args:
            source_content: 已提取的源内容文本
            task_id: 任务唯一标识

        Yields:
            dict: SSE 格式的事件数据
                - progress 事件: {"event": "progress", "data": {"message": "..."}}
                - complete 事件: {"event": "complete", "data": {"files_changed": [...]}}
                - error 事件: {"event": "error", "data": {"error": "..."}}
        """
        prompt = f"""你是一个 LLM Wiki 编译器。请执行以下 ingest 操作：

1. 读取以下源内容
2. 提取关键概念和实体
3. 在 wiki/ 下创建/更新对应的概念页面（wiki/concepts/、wiki/entities/）
4. 创建摘要页 wiki/sources/
5. 每个页面使用 [[wikilink]] 语法链接到相关页面
6. 更新 wiki/index.md
7. 在 wiki/log.md 追加操作记录

页面格式要求：
- 每个页面必须以 YAML frontmatter 开头（title, created, tags, source）
- 使用 [[wikilink]] 语法引用其他页面

源内容:
---
{source_content}
---

请在执行完成后，列出所有被创建或修改的文件路径。"""

        env = os.environ.copy()
        env["CLAUDE_CODE_GIT_BASH_PATH"] = CLAUDE_CODE_GIT_BASH_PATH

        try:
            yield {"event": "progress", "data": {"message": "正在启动 Claude Code 编译器..."}}

            process = await asyncio.create_subprocess_exec(
                "claude",
                "--print",
                "--permission-mode", "bypassPermissions",
                prompt,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.wiki_root.parent),
                env=env,
            )

            files_changed = []

            # 实时读取 stdout
            async for line in process.stdout:
                try:
                    text = line.decode("utf-8", errors="replace").strip()
                    if text:
                        # 尝试解析 JSON（--print 模式可能输出 JSON）
                        try:
                            data = json.loads(text)
                            if isinstance(data, dict):
                                # 转发 Claude Code 的流式消息
                                msg = data.get("message", data.get("type", text))
                                yield {"event": "progress", "data": {"message": str(msg)}}
                        except json.JSONDecodeError:
                            # 非 JSON 文本，作为进度消息
                            yield {"event": "progress", "data": {"message": text}}
                except Exception:
                    pass

            # 等待进程结束
            return_code = await process.wait()

            if return_code != 0:
                stderr_output = ""
                async for line in process.stderr:
                    stderr_output += line.decode("utf-8", errors="replace")
                yield {"event": "error", "data": {"error": f"Claude Code 退出码 {return_code}: {stderr_output}"}}
                return

            # 扫描 wiki 目录获取变更的文件
            for md_file in self.wiki_root.rglob("*.md"):
                rel_path = str(md_file.relative_to(self.wiki_root.parent))
                files_changed.append(rel_path)

            yield {
                "event": "complete",
                "data": {"files_changed": files_changed},
            }

        except FileNotFoundError:
            yield {
                "event": "error",
                "data": {"error": "找不到 claude 命令，请确保 Claude Code CLI 已安装且在 PATH 中"},
            }
        except Exception as e:
            yield {"event": "error", "data": {"error": str(e)}}

    def run_query(self, question: str, wiki_root: str = None) -> str:
        """调用 Claude Code CLI 回答基于 wiki 的问题。

        Args:
            question: 用户的问题
            wiki_root: wiki 目录路径

        Returns:
            LLM 生成的回答文本
        """
        root = Path(wiki_root) if wiki_root else self.wiki_root.parent

        prompt = f"""你是一个 LLM Wiki 编译器。请基于 wiki 知识库回答以下问题。

1. 先读取 wiki/index.md 了解知识库全貌
2. 搜索相关的 wiki 页面
3. 综合相关信息回答问题
4. 如果有价值，将答案保存为 wiki/queries/{question[:30].strip()}.md

问题: {question}
"""

        env = os.environ.copy()
        env["CLAUDE_CODE_GIT_BASH_PATH"] = CLAUDE_CODE_GIT_BASH_PATH

        try:
            result = asyncio.run(
                asyncio.create_subprocess_exec(
                    "claude",
                    "--print",
                    "--permission-mode", "bypassPermissions",
                    prompt,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=str(root),
                    env=env,
                )
            )

            stdout_data, stderr_data = asyncio.run(_read_process_output(result))
            if result.returncode != 0:
                return f"查询出错: {stderr_data.decode('utf-8', errors='replace')}"

            return stdout_data.decode("utf-8", errors="replace")

        except FileNotFoundError:
            return "错误: 找不到 claude 命令，请确保 Claude Code CLI 已安装"
        except Exception as e:
            return f"查询异常: {str(e)}"

    def run_lint(self, wiki_root: str = None) -> str:
        """调用 Claude Code CLI 执行 wiki 健康检查。

        Args:
            wiki_root: wiki 目录路径

        Returns:
            检测报告文本
        """
        root = Path(wiki_root) if wiki_root else self.wiki_root.parent

        prompt = """你是一个 LLM Wiki 编译器。请对 wiki 目录执行健康检查（lint）。

1. 扫描所有 wiki 页面中的 [[wikilink]]
2. 检查每个链接是否有对应的文件
3. 识别孤立页面（没有被任何其他页面链接）
4. 检查是否有矛盾的陈述
5. 输出检测报告，包括：
   - 断链列表
   - 矛盾声明
   - 孤立页面
   - 改进建议

请输出结构化的检测报告。
"""

        env = os.environ.copy()
        env["CLAUDE_CODE_GIT_BASH_PATH"] = CLAUDE_CODE_GIT_BASH_PATH

        try:
            result = asyncio.run(
                asyncio.create_subprocess_exec(
                    "claude",
                    "--print",
                    "--permission-mode", "bypassPermissions",
                    prompt,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=str(root),
                    env=env,
                )
            )

            stdout_data, stderr_data = asyncio.run(_read_process_output(result))
            if result.returncode != 0:
                return f"Lint 出错: {stderr_data.decode('utf-8', errors='replace')}"

            return stdout_data.decode("utf-8", errors="replace")

        except FileNotFoundError:
            return "错误: 找不到 claude 命令，请确保 Claude Code CLI 已安装"
        except Exception as e:
            return f"Lint 异常: {str(e)}"


async def _read_process_output(process: asyncio.subprocess.Process) -> tuple:
    """读取子进程的输出。"""
    stdout_data = b""
    stderr_data = b""

    if process.stdout:
        async for line in process.stdout:
            stdout_data += line

    if process.stderr:
        async for line in process.stderr:
            stderr_data += line

    return stdout_data, stderr_data
