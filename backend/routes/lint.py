"""Lint 路由：处理 wiki 健康检查请求。"""

from fastapi import APIRouter, HTTPException

from models import LintResponse
from wiki_engine import WikiEngine

router = APIRouter(prefix="/api", tags=["lint"])

_engine = WikiEngine()


@router.post("/lint", response_model=LintResponse)
async def lint():
    """调用 Claude Code CLI 对 wiki 目录执行健康检查。

    检测项目：
    - 断链: [[wikilink]] 没有对应文件
    - 矛盾: 页面间存在冲突的陈述
    - 孤儿: 没有被任何其他页面链接的页面
    - 建议: 可以改进的地方

    返回检测报告文本。
    """
    try:
        report = await _engine.run_lint()
        return LintResponse(report=report)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lint 失败: {str(e)}")
