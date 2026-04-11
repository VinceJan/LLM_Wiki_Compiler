"""Pydantic 数据模型定义。"""

from typing import Literal

from pydantic import BaseModel


class IngestRequest(BaseModel):
    """摄入请求体。"""

    type: Literal["file", "url", "text"]
    content: str


class IngestResponse(BaseModel):
    """摄入响应体。"""

    task_id: str
    status: str


class TaskStatus(BaseModel):
    """任务状态。"""

    task_id: str
    status: str
    messages: list[str]
    files_changed: list[str]


class GraphResponse(BaseModel):
    """图谱数据响应体。"""

    nodes: list[dict]
    edges: list[dict]


class QueryRequest(BaseModel):
    """查询请求体。"""

    question: str


class QueryResponse(BaseModel):
    """查询响应体。"""

    answer: str


class LintResponse(BaseModel):
    """Lint 检测响应体。"""

    report: str


class FileListResponse(BaseModel):
    """文件列表响应体。"""

    files: list[str]


class FileContentResponse(BaseModel):
    """文件内容响应体。"""

    path: str
    content: str
