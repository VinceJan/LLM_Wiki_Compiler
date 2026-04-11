"""配置管理：加载和保存用户配置。"""

import json
from pathlib import Path

# 配置文件路径（与本文件同级目录）
CONFIG_PATH = Path(__file__).resolve().parent / "config.json"


def load_config() -> dict:
    """加载配置文件，如果不存在则使用默认值。"""
    if CONFIG_PATH.exists():
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    return get_default_config()


def save_config(config: dict) -> None:
    """保存配置到文件。"""
    CONFIG_PATH.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")


def get_default_config() -> dict:
    """返回默认配置。"""
    return {
        "storage_path": "",
        "_comment": "LLM Wiki Compiler 配置文件",
        "_storage_path_help": "知识库的存储根目录。留空则使用项目根目录下的 data/ 目录。",
        "engine": {
            "claude_code_git_bash_path": "",
            "_git_bash_help": "Windows 下 Claude Code CLI 需要的 git-bash 路径。",
        },
    }


def resolve_storage_path() -> Path:
    """解析实际的存储路径。

    优先级：
    1. config.json 中的 storage_path（如果非空且存在）
    2. 项目根目录下的 data/ 目录
    """
    config = load_config()
    user_path = config.get("storage_path", "").strip()

    if user_path:
        path = Path(user_path).resolve()
        if path.exists() and path.is_dir():
            return path
        # 用户指定的路径不存在，创建它
        path.mkdir(parents=True, exist_ok=True)
        return path

    # 默认使用项目根目录下的 data/ 目录
    project_root = CONFIG_PATH.parent.parent
    default_path = project_root / "data"
    default_path.mkdir(exist_ok=True)
    return default_path
