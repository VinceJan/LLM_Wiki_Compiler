import httpx
import fitz  # PyMuPDF
import docx
import openpyxl
from pathlib import Path
from urllib.parse import urlparse

# 需要浏览器登录态才能访问的域名列表
_AUTH_REQUIRED_DOMAINS = [
    "mp.weixin.qq.com",    # 微信公众号
    "x.com",               # Twitter/X
    "twitter.com",
]


class ContentExtractor:
    """统一的内容提取器，支持多种文件格式和 URL 抓取。"""

    @staticmethod
    def _needs_browser(url: str) -> bool:
        """判断 URL 是否需要登录态。"""
        domain = urlparse(url).netloc.lower()
        return any(domain == d or domain.endswith("." + d) for d in _AUTH_REQUIRED_DOMAINS)

    @staticmethod
    def from_url_with_cdp(url: str) -> str:
        """通过 CDP Proxy (用户 Chrome) 抓取页面，提取文本内容。

        适用于需要登录态才能访问的页面（如微信公众号、X/Twitter）。
        """
        import json as _json
        from urllib.parse import quote

        try:
            # 1. 创建新后台 tab
            resp = httpx.get(f"http://localhost:3456/new?url={quote(url, safe='')}", timeout=30.0)
            resp.raise_for_status()
        except httpx.ConnectError:
            raise RuntimeError(
                "CDP 代理服务未启动（localhost:3456）。"
                "请先启动 Chrome 浏览器的远程调试模式，或使用 Jina Reader 抓取。"
            )
        target_id = resp.json()["targetId"]

        try:
            # 2. 滚动到底部触发懒加载
            try:
                httpx.get(f"http://localhost:3456/scroll?target={target_id}&direction=bottom", timeout=15.0)
            except Exception:
                pass  # 滚动失败不影响后续读取

            # 3. 通过 eval 提取页面文本内容
            js = "JSON.stringify({title: document.title, text: document.body?.innerText || ''})"
            resp = httpx.post(f"http://localhost:3456/eval?target={target_id}", data=js, timeout=15.0)
            resp.raise_for_status()
            result = _json.loads(_json.loads(resp.text)["value"])
            return f"# {result['title']}\n\n{result['text']}"
        finally:
            # 4. 关闭临时 tab
            try:
                httpx.get(f"http://localhost:3456/close?target={target_id}", timeout=5.0)
            except Exception:
                pass  # 清理失败不影响结果

    @staticmethod
    def from_url(url: str) -> str:
        """抓取 URL 内容，自动选择 Jina Reader 或 CDP proxy。

        对于需要登录态的域名（如微信公众号、X/Twitter），使用 CDP proxy
        连接用户本地 Chrome 以携带登录态；其余使用 Jina Reader。
        """
        if ContentExtractor._needs_browser(url):
            return ContentExtractor.from_url_with_cdp(url)
        resp = httpx.get(f"https://r.jina.ai/{url}", follow_redirects=True, timeout=30.0)
        resp.raise_for_status()
        return resp.text

    @staticmethod
    def from_pdf(path: str) -> str:
        """使用 PyMuPDF 提取 PDF 文本。"""
        doc = fitz.open(path)
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text

    @staticmethod
    def from_docx(path: str) -> str:
        """使用 python-docx 提取 Word 文本。"""
        document = docx.Document(path)
        return "\n".join(p.text for p in document.paragraphs)

    @staticmethod
    def from_xlsx(path: str) -> str:
        """使用 openpyxl 提取 Excel 文本（表格转文本格式）。"""
        wb = openpyxl.load_workbook(path, data_only=True)
        lines = []
        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            lines.append(f"## {sheet_name}")
            for row in ws.iter_rows(values_only=True):
                cell_values = [str(c) for c in row if c is not None]
                if cell_values:
                    lines.append("\t".join(cell_values))
        wb.close()
        return "\n".join(lines)

    @staticmethod
    def extract(file_path: str = None, url: str = None) -> str:
        """统一入口，根据文件扩展名或 url 参数自动选择处理器。

        Args:
            file_path: 本地文件路径，支持 pdf/docx/xlsx/md/txt
            url: 网页 URL，自动选择 Jina Reader 或 CDP proxy（需要登录态的页面） 抓取

        Returns:
            提取后的文本内容（Markdown 或纯文本格式）
        """
        if url:
            return ContentExtractor.from_url(url)

        if not file_path:
            raise ValueError("必须提供 file_path 或 url 参数")

        ext = Path(file_path).suffix.lower().lstrip(".")
        handlers = {
            "pdf": ContentExtractor.from_pdf,
            "docx": ContentExtractor.from_docx,
            "doc": ContentExtractor.from_docx,
            "xlsx": ContentExtractor.from_xlsx,
            "xls": ContentExtractor.from_xlsx,
            "md": lambda p: Path(p).read_text(encoding="utf-8"),
            "txt": lambda p: Path(p).read_text(encoding="utf-8"),
        }

        handler = handlers.get(ext)
        if handler is None:
            raise ValueError(f"不支持的文件格式: .{ext}，支持的格式: {', '.join(handlers.keys())}")

        return handler(file_path)
