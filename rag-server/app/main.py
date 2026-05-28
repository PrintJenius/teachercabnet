import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import AskRequest, AskResponse, HealthResponse, SearchRequest
from app.services import rag

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # 앱 기동 시 Pinecone/Gemini 클라이언트 워밍업 (첫 요청 지연 감소)
    if settings.gemini_api_key and settings.pinecone_api_key:
        try:
            rag._store()
            rag._embedder()
        except Exception as e:
            print(f"[rag-server] warmup skipped: {e}")
    yield


app = FastAPI(
    title="TeacherCabinet RAG API",
    version="0.1.0",
    description="벡터 DB 검색 + Gemini 답변. 참고자료는 title/description/url 카드로 반환.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        index=settings.pinecone_index,
        namespace=settings.pinecone_namespace,
    )


@app.get("/wake", response_model=HealthResponse)
def wake() -> HealthResponse:
    """광고 차단 우회를 위한 워밍업 엔드포인트 (health와 동일 응답)."""
    return HealthResponse(
        index=settings.pinecone_index,
        namespace=settings.pinecone_namespace,
    )


@app.post("/api/ask", response_model=AskResponse)
def api_ask(body: AskRequest) -> AskResponse:
    """질문 → (선택) Gemini 답변 + 참고자료 카드(title, description, url)."""
    try:
        return rag.ask(
            question=body.question.strip(),
            namespace=body.namespace,
            top_k=body.top_k,
            include_answer=body.include_answer,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        logger.exception("api_ask failed")
        msg = str(e).strip() or e.__class__.__name__
        if "INTERNAL" in msg or "Gemini" in msg or "genai" in msg.lower():
            raise HTTPException(
                status_code=503,
                detail=(
                    "Gemini 답변 생성에 실패했습니다. CHAT_MODEL 설정을 확인하고 "
                    "rag-server를 재시작해 보세요. (" + msg + ")"
                ),
            ) from e
        raise HTTPException(status_code=500, detail=msg) from e


@app.post("/api/search", response_model=AskResponse)
def api_search(body: SearchRequest) -> AskResponse:
    """답변 없이 참고자료 카드만 반환 (자료 목록 UI용)."""
    try:
        refs = rag.search(
            query=body.query.strip(),
            namespace=body.namespace,
            top_k=body.top_k,
        )
        return AskResponse(answer=None, references=refs)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
