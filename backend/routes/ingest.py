"""Ingest 路由：处理内容摄入任务和 SSE 流式输出。"""

import asyncio
import json
import uuid

from fastapi import APIRouter, HTTPException, UploadFile
from sse_starlette.sse import EventSourceResponse

from models import IngestRequest, IngestResponse
from wiki_engine import WikiEngine
from content_extractor import ContentExtractor

router = APIRouter(prefix="/api", tags=["ingest"])

# 存储 ingest 任务的异步队列（生产者-消费者模式）
_task_queues: dict[str, asyncio.Queue] = {}
_active_tasks: dict[str, asyncio.Task] = {}

# 创建全局 wiki 引擎实例
_engine = WikiEngine()


@router.post("/ingest", response_model=IngestResponse)
async def ingest(request: IngestRequest):
    """接收 IngestRequest，启动 Claude Code 子进程，返回 task_id。

    支持两种输入类型：
    - url: 网页 URL
    - text: 直接输入的文本内容
    """
    task_id = str(uuid.uuid4())

    try:
        # 根据类型提取源内容
        if request.type == "url":
            source_content = ContentExtractor.from_url(request.content)
        else:  # text
            source_content = request.content

        # 将源内容存入 raw/ 目录
        raw_filename = f"raw_{task_id[:8]}.md"
        raw_path = _engine.raw_dir / raw_filename
        raw_path.parent.mkdir(parents=True, exist_ok=True)
        raw_path.write_text(f"# Source: {raw_filename}\n\n{source_content}", encoding="utf-8")

        # 为该任务创建异步队列用于 SSE 通信
        queue: asyncio.Queue = asyncio.Queue()
        _task_queues[task_id] = queue

        # 启动异步 ingest 任务（生产者）
        task = asyncio.create_task(_run_ingest_task(source_content, task_id, queue))
        _active_tasks[task_id] = task

        return IngestResponse(task_id=task_id, status="running")

    except Exception as e:
        # 清理失败任务的队列
        _task_queues.pop(task_id, None)
        raise HTTPException(status_code=500, detail=f"摄入失败: {str(e)}")


@router.post("/upload", response_model=IngestResponse)
async def upload_file(file: UploadFile):
    """接收文件上传，提取内容后启动 ingest 任务。

    支持格式：PDF, DOCX, XLSX, MD, TXT
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")

    task_id = str(uuid.uuid4())

    try:
        # 先保存上传的文件到临时位置
        ext = file.filename.split(".")[-1].lower()
        temp_path = _engine.raw_dir / f"temp_{task_id[:8]}.{ext}"
        temp_path.parent.mkdir(parents=True, exist_ok=True)

        file_content = await file.read()
        temp_path.write_bytes(file_content)

        # 提取文件内容
        source_content = ContentExtractor.extract(file_path=str(temp_path))

        # 将提取的内容存入 raw/ 目录（作为 Markdown 源）
        raw_filename = f"raw_{task_id[:8]}.md"
        raw_path = _engine.raw_dir / raw_filename
        raw_path.write_text(f"# Source: {file.filename}\n\n{source_content}", encoding="utf-8")

        # 删除临时文件
        temp_path.unlink(missing_ok=True)

        # 为该任务创建异步队列用于 SSE 通信
        queue: asyncio.Queue = asyncio.Queue()
        _task_queues[task_id] = queue

        # 启动异步 ingest 任务
        task = asyncio.create_task(_run_ingest_task(source_content, task_id, queue))
        _active_tasks[task_id] = task

        return IngestResponse(task_id=task_id, status="running")

    except ValueError as e:
        _task_queues.pop(task_id, None)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        _task_queues.pop(task_id, None)
        raise HTTPException(status_code=500, detail=f"文件处理失败: {str(e)}")


async def _run_ingest_task(source_content: str, task_id: str, queue: asyncio.Queue):
    """执行实际的 ingest 子进程，将事件推入队列。"""
    try:
        async for event in _engine.run_ingest(source_content, task_id):
            await queue.put(event)
        # 发送结束标记
        await queue.put(None)
    except Exception as e:
        await queue.put({"event": "error", "data": {"error": str(e)}})
        await queue.put(None)


@router.get("/stream/{task_id}")
async def stream_task(task_id: str):
    """SSE 端点，流式输出 ingest 进度。

    从任务队列中消费事件，实时推送给前端。
    """
    if task_id not in _task_queues:
        raise HTTPException(status_code=404, detail="任务不存在")

    queue = _task_queues[task_id]

    async def event_generator():
        """生成 SSE 事件流，从队列中消费。"""
        try:
            while True:
                event = await queue.get()
                if event is None:  # 结束标记
                    break
                yield {
                    "event": event["event"],
                    "data": json.dumps(event["data"], ensure_ascii=False),
                }
        except asyncio.CancelledError:
            yield {
                "event": "error",
                "data": {"error": "任务已取消"},
            }
        finally:
            _task_queues.pop(task_id, None)
            _active_tasks.pop(task_id, None)

    return EventSourceResponse(event_generator())
