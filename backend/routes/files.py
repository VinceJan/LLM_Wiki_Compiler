"""Files 路由：列出和读取 raw/ 与 wiki/ 目录下的文件。"""

from pathlib import Path

from fastapi import APIRouter, HTTPException

from models import FileListResponse, FileContentResponse
from wiki_engine import WikiEngine

router = APIRouter(prefix="/api", tags=["files"])

_engine = WikiEngine()


@router.get("/files", response_model=FileListResponse)
async def list_files(type: str = "wiki"):
    """列出 raw/ 或 wiki/ 目录下的文件。

    查询参数:
    - type: 目录类型，"raw" 或 "wiki"

    返回:
    {
        "files": ["相对路径列表"]
    }
    """
    if type == "raw":
        base_dir = _engine.raw_dir
    elif type == "wiki":
        base_dir = _engine.wiki_root
    else:
        raise HTTPException(status_code=400, detail="type 必须是 'raw' 或 'wiki'")

    if not base_dir.exists():
        return FileListResponse(files=[])

    files = []
    for f in sorted(base_dir.rglob("*")):
        if f.is_file():
            rel_path = str(f.relative_to(base_dir))
            files.append(rel_path)

    return FileListResponse(files=files)


@router.get("/files/content/{file_path:path}", response_model=FileContentResponse)
async def get_file_content(file_path: str):
    """读取指定文件的内容。

    路径参数:
    - file_path: 相对于 wiki/ 或 raw/ 目录的文件路径

    返回:
    {
        "path": "文件路径",
        "content": "文件内容"
    }
    """
    # 尝试在 wiki 和 raw 目录中查找
    wiki_path = _engine.wiki_root / file_path
    raw_path = _engine.raw_dir / file_path

    target_path = None
    if wiki_path.exists() and wiki_path.is_file():
        target_path = wiki_path
    elif raw_path.exists() and raw_path.is_file():
        target_path = raw_path
    else:
        raise HTTPException(status_code=404, detail=f"文件不存在: {file_path}")

    try:
        content = target_path.read_text(encoding="utf-8")
        return FileContentResponse(path=file_path, content=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取文件失败: {str(e)}")
