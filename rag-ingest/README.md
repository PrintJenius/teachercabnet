# rag-ingest

JSON·TXT 데이터를 Pinecone 벡터 DB에 **적재(ingest)** 하고, CLI로 RAG 검색·답변을 **로컬에서 검증**하는 도구입니다. 임베딩과 LLM은 Gemini를 사용합니다.

운영 API는 **`rag-server`**가 담당하며, 여기서 넣은 namespace(예: `play_data`)를 그대로 검색합니다.

## 구조

```
rag-ingest/
├── data/                    # JSON/TXT 데이터 폴더
├── src/
│   ├── config.py            # .env 로딩 / 설정값
│   ├── embeddings.py        # Gemini 임베딩 (RETRIEVAL_DOCUMENT/QUERY)
│   ├── vector_store.py      # Pinecone 인덱스 관리/업서트/검색
│   ├── chunker.py           # JSON → Document → Chunk
│   ├── ingest.py            # [CLI] JSON 적재
│   └── chat.py              # [CLI] 질문 → 검색 → Gemini 답변
├── requirements.txt
├── .env.example
└── .gitignore
```

## 1. 설치 (PowerShell)

```powershell
cd rag-ingest
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

이미 가상환경이 만들어져 있다면 의존성 변경 반영을 위해 다시 설치하세요.

```powershell
pip install -r requirements.txt --upgrade
```

## 2. 환경 변수 설정

`.env` 파일에 키를 채워주세요.

- `GEMINI_API_KEY`: <https://aistudio.google.com/app/apikey>
- `PINECONE_API_KEY`: <https://app.pinecone.io/> → API Keys

기타 옵션:

- `PINECONE_INDEX`: Pinecone 인덱스 이름 (기본 `teachercabinet-play`, `rag-server`와 동일하게 맞출 것)
- `EMBEDDING_MODEL`: 기본 `gemini-embedding-001`
- `EMBEDDING_DIM`: 768 / 1536 / 3072 중 선택. 작을수록 빠르고 저렴.
- `CHAT_MODEL`: 기본 `gemini-2.0-flash`. `gemini-2.0-flash-lite` 등으로 변경 가능.

## 3. JSON 데이터 적재

단일 파일:

```powershell
python -m src.ingest data/sample.json --namespace default
```

폴더 통째로 (안의 `.json` / `.txt` 전부):

```powershell
python -m src.ingest data --namespace play_data --text-field topic --text-field content --reset
```

본문으로 우선 인식하는 키는 `text`, `content`, `body`, `description`, `answer`, `question`, `title`. 다른 키 이름을 쓰면 `--text-field` 옵션으로 지정합니다.

기존 namespace 비우고 다시 넣을 때만 `--reset`.

## 4. 질문하기 (로컬 검증)

대화 모드:

```powershell
python -m src.chat --namespace play_data
```

`exit` 종료, `:ctx` 컨텍스트 표시 토글.

단일 질문:

```powershell
python -m src.chat --once "유아가 질문하면 정답을 바로 알려줘야 해?" --namespace play_data --show-context
```

## 5. 동작 원리

1. **청킹**: JSON record → 텍스트 → `tiktoken` 토큰 기준 슬라이딩 윈도우 청크.
2. **임베딩**: Gemini `embed_content` 호출. 적재 시 `task_type=RETRIEVAL_DOCUMENT`, 검색 시 `RETRIEVAL_QUERY`.
3. **저장**: Pinecone 서버리스 인덱스에 `(id, vector, metadata)` 업서트. 메타데이터에 원본 텍스트와 source/category 등 포함.
4. **검색**: 질문 벡터로 cosine 유사도 top-k 검색.
5. **생성**: 검색된 청크를 프롬프트에 끼워 `generate_content` 호출.

## 6. 주요 파라미터 (`.env`)

- `EMBEDDING_MODEL`, `EMBEDDING_DIM` — 모델/차원을 바꾸면 Pinecone 인덱스도 새로 만들어야 합니다. `PINECONE_INDEX` 이름을 바꿔주세요.
- `CHAT_MODEL` — `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-2.0-pro` 등.
- `TOP_K` — 검색할 청크 개수.
- `CHUNK_SIZE`, `CHUNK_OVERLAP` — 토큰 단위. 짧은 FAQ면 400/50, 긴 문서면 1000/150 정도.

## 7. 트러블슈팅

- **`GEMINI_API_KEY 환경변수가 설정되지 않았습니다`**: `.env` 파일이 `rag-ingest/` 바로 아래에 있는지 확인하세요.
- **차원 불일치 오류**: 이미 만든 인덱스의 차원과 `EMBEDDING_DIM` 이 다릅니다. Pinecone 콘솔에서 인덱스를 지우거나 `PINECONE_INDEX` 를 다른 이름으로 바꾸세요.
- **검색 결과가 비어 있음**: `--namespace` 가 ingest와 chat에서 같은지 확인.
