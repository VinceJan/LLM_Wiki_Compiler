"""Graph 路由：提供 wiki 知识图谱数据。"""

from fastapi import APIRouter

from models import GraphResponse
from graph_builder import build_graph_data
from wiki_engine import WikiEngine

router = APIRouter(prefix="/api", tags=["graph"])

_engine = WikiEngine()


@router.get("/graph", response_model=GraphResponse)
async def get_graph():
    """获取 wiki 知识图谱数据。

    扫描 wiki 目录，提取所有 .md 文件的标题、wikilink 关系
    和页面类型，返回力导向图可视化所需的数据。

    返回:
    {
        "nodes": [{"id": "...", "title": "...", "links_count": N, "type": "..."}],
        "edges": [{"source": "...", "target": "..."}]
    }
    """
    graph_data = build_graph_data(str(_engine.wiki_root))
    return GraphResponse(**graph_data)
