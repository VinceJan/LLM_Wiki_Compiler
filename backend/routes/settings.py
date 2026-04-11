"""Settings 路由：管理存储路径等配置。"""

from fastapi import APIRouter, HTTPException

from config_manager import load_config, save_config, resolve_storage_path
from models import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/api", tags=["settings"])


@router.get("/settings", response_model=SettingsResponse)
async def get_settings():
    """获取当前配置。

    返回存储路径、引擎配置等信息。
    """
    config = load_config()
    storage_path = resolve_storage_path()

    return SettingsResponse(
        storage_path=str(storage_path),
        raw_dir=str(storage_path / "raw"),
        wiki_dir=str(storage_path / "wiki"),
        claude_code_git_bash_path=config.get("engine", {}).get("claude_code_git_bash_path", ""),
    )


@router.post("/settings", response_model=SettingsResponse)
async def update_settings(update: SettingsUpdate):
    """更新配置。

    修改 storage_path 后需重启后端生效。
    """
    config = load_config()

    if update.storage_path is not None:
        config["storage_path"] = update.storage_path

    if update.claude_code_git_bash_path is not None:
        config.setdefault("engine", {})
        config["engine"]["claude_code_git_bash_path"] = update.claude_code_git_bash_path

    save_config(config)

    # 重新解析路径
    storage_path = resolve_storage_path()

    return SettingsResponse(
        storage_path=str(storage_path),
        raw_dir=str(storage_path / "raw"),
        wiki_dir=str(storage_path / "wiki"),
        claude_code_git_bash_path=config.get("engine", {}).get("claude_code_git_bash_path", ""),
    )
