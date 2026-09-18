import os
from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from app.services.db import init_models
from app.api.routes import routers

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("✅ Starting up app")
    try:
        print("🔹 About to init models")
        init_models()
        print("✅ Startup completed")
    except Exception as e:
        print(f"❌ Exception during lifespan startup: {e}")
        raise

    yield


# ✅ Create the FastAPI app using lifespan context
app = FastAPI(
    title="ShovelReady",
    description="AI Backed Zoning Analysis",
    version="1.0.0",
    lifespan=lifespan,  # ✅ Use new lifespan handler
)

# ✅ Register all routers
for router in routers:
    app.include_router(router)

app.mount("/static", StaticFiles(directory="app/static", html=True), name="static")

@app.get("/")
def home():
    return {}




@app.get("/")
def serve_index():
    return FileResponse(os.path.join("app", "static", "index.html"))

# ✅ If running locally, use this
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

@app.get("/health")
def health_check():
    return {"status": "ok"}