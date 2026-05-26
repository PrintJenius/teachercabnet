# syntax=docker/dockerfile:1
# Render 등: Root Directory = rag-server, GEMINI_API_KEY / PINECONE_API_KEY / PORT 필수

FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    RAG_SERVER_HOST=0.0.0.0 \
    PORT=8001

RUN groupadd -r app && useradd -r -g app -u 10001 app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN chown -R app:app /app
USER app

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8001\")}/health', timeout=3)"

# Render PORT 환경변수 우선 (config.py에서 PORT / RAG_SERVER_PORT 읽음)
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
