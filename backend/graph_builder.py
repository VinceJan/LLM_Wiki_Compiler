"""知识图谱构建器：扫描 wiki 目录，提取节点和边信息。"""

import re
from pathlib import Path


def extract_frontmatter_title(content: str) -> str:
    """从 YAML frontmatter 提取标题。

    Args:
        content: Markdown 文件内容

    Returns:
        标题字符串，如果未找到则返回文件名
    """
    match = re.search(r"^---\s*\ntitle:\s*(.+?)\s*\n", content, re.MULTILINE)
    return match.group(1).strip() if match else "Untitled"


def categorize_page(path: str) -> str:
    """根据文件路径分类页面类型。

    Args:
        path: 相对于 wiki 目录的文件路径

    Returns:
        页面类型: concept / entity / source / query / other
    """
    if "concepts/" in path:
        return "concept"
    elif "entities/" in path:
        return "entity"
    elif "sources/" in path:
        return "source"
    elif "queries/" in path:
        return "query"
    return "other"


def extract_wikilinks(content: str) -> list[str]:
    """从 Markdown 内容中提取 [[wikilink]] 语法链接。

    Args:
        content: Markdown 文件内容

    Returns:
        wikilink 目标名称列表
    """
    # 移除 frontmatter 部分再搜索
    content_without_frontmatter = re.sub(r"^---\s*\n.*?\n---\s*\n", "", content, flags=re.DOTALL)
    return re.findall(r"\[\[([^\]]+)\]\]", content_without_frontmatter)


def build_graph_data(wiki_dir: str) -> dict:
    """从 wiki 目录构建图谱数据。

    扫描 wiki_dir 下所有 .md 文件，提取 frontmatter 标题、
    wikilink 关系，并根据路径分类页面类型。

    Args:
        wiki_dir: wiki 目录路径

    Returns:
        包含 nodes 和 edges 的字典:
        {
            "nodes": [{"id": "...", "title": "...", "links_count": N, "type": "..."}],
            "edges": [{"source": "...", "target": "..."}]
        }
    """
    nodes = []
    edges = []
    wiki_path = Path(wiki_dir)

    if not wiki_path.exists():
        return {"nodes": [], "edges": []}

    for md_file in sorted(wiki_path.rglob("*.md")):
        rel_path = str(md_file.relative_to(wiki_path))
        node_id = rel_path.replace("\\", "/")

        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception:
            content = ""

        title = extract_frontmatter_title(content)
        wikilinks = extract_wikilinks(content)
        page_type = categorize_page(rel_path)

        nodes.append({
            "id": node_id,
            "title": title,
            "links_count": len(wikilinks),
            "type": page_type,
        })

        for link_target in wikilinks:
            edges.append({
                "source": node_id,
                "target": link_target.strip(),
            })

    return {"nodes": nodes, "edges": edges}
