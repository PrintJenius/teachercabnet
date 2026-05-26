import uvicorn
import os

from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.rag_server_host,
        port=settings.rag_server_port,
        reload=os.getenv("ENV", "").lower() == "dev",
    )
