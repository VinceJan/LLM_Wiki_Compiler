"""LLM Wiki Compiler - FastAPI 后端入口。"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from wiki_engine import WikiEngine
from routes import ingest, query, lint, files, graph, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理：启动时初始化 wiki 结构。"""
    # 启动时执行
    engine = WikiEngine()
    engine.initialize_wiki()
    print("[WikiEngine] wiki 目录结构已初始化")
    yield
    # 关闭时执行（如需清理资源可在此添加）


app = FastAPI(
    title="LLM Wiki Compiler",
    description="可视化的 LLM Wiki 编译器后端",
    version="0.1.0",
    lifespan=lifespan,
)

# 配置 CORS（开发环境允许所有来源）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(lint.router)
app.include_router(files.router)
app.include_router(graph.router)
app.include_router(settings.router)


@app.get("/api/health")
async def health():
    """健康检查端点。"""
    return {"status": "ok", "service": "LLM Wiki Compiler"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
