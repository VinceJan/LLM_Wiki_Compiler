import httpx
import fitz  # PyMuPDF
import docx
import openpyxl
from pathlib import Path


class ContentExtractor:
    """统一的内容提取器，支持多种文件格式和 URL 抓取。"""

    @staticmethod
    def from_url(url: str) -> str:
        """使用 Jina Reader (r.jina.ai/{url}) 抓取 URL 内容并返回 Markdown。"""
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
            url: 网页 URL，将通过 Jina Reader 抓取

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
