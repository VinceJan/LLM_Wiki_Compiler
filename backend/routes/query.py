"""Query 路由：处理基于 wiki 知识库的查询请求。"""

from fastapi import APIRouter, HTTPException

from models import QueryRequest, QueryResponse
from wiki_engine import WikiEngine

router = APIRouter(prefix="/api", tags=["query"])

_engine = WikiEngine()


@router.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """向知识库提问，调用 Claude Code CLI 基于 wiki 内容生成回答。

    请求体:
    {
        "question": "你的问题"
    }

    返回:
    {
        "answer": "LLM 生成的回答文本"
    }
    """
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="问题不能为空")

    try:
        answer = await _engine.run_query(request.question)
        return QueryResponse(answer=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")
