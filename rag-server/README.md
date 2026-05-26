# rag-server

Pinecone 벡터 DB + Gemini RAG API. 프론트엔드에 **제목·설명·URL** 카드와 AI 답변을 JSON으로 제공합니다.

`rag-ingest`에서 적재한 데이터(`play_data` namespace 등)를 그대로 검색합니다.

## 설치

```powershell
cd rag-server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

`.env`는 `rag-ingest\.env` 내용을 복사해도 됩니다. 기본 포트는 `8001`입니다.

## 실행

```powershell
python run.py
```

- API 문서: http://localhost:8001/docs
- 헬스체크: http://localhost:8001/health

## API

### POST `/api/ask` — 질문 + 답변 + 참고 카드

```json
{
  "question": "공기총 놀이 할 때 부모는 어떻게 말해줘야 해?",
  "namespace": "play_data",
  "top_k": 5,
  "include_answer": true
}
```

응답 예:

```json
{
  "answer": "…Gemini 답변…",
  "references": [
    {
      "title": "팡팡! 공기총을 쏴라!(공기의 힘과 압력)",
      "description": "활동명: 팡팡! 공기총을 쏴라!…",
      "url": "https://i-nuri.go.kr/teacher/module/dataManage/view.do?…",
      "score": 0.82,
      "source": "유아 과학놀이_공룡시대 화산만들기&팡팡! 공기총을 쏴라!",
      "topic": "팡팡! 공기총을 쏴라!(공기의 힘과 압력)",
      "domain": "자연탐구",
      "data_type": "구체적놀이사례"
    }
  ]
}
```

### POST `/api/search` — 참고 카드만 (답변 없음)

```json
{
  "query": "공기의 힘 놀이",
  "namespace": "play_data",
  "top_k": 5
}
```

## 프론트 연동 예 (fetch)

```javascript
const res = await fetch("http://localhost:8001/api/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    question: userInput,
    namespace: "play_data",
  }),
});
const data = await res.json();
// data.answer → 채팅 답변
// data.references → 카드 목록 (title, description, url)
```

## 메타데이터 → 화면 필드 매핑

| 화면 | JSON 필드 | Pinecone metadata 우선순위 |
|------|-----------|---------------------------|
| 제목 | `title` | `topic` → `title` → `source` |
| 설명 | `description` | `content` → `text` → … |
| 링크 | `url` | `url` |

동일 URL(또는 동일 문서)은 중복 제거 후 카드 1개만 반환합니다.

## 환경 변수

| 변수 | 설명 |
|------|------|
| `RAG_SERVER_PORT` | 기본 8001 |
| `PINECONE_NAMESPACE` | 기본 `play_data` |
| `CORS_ORIGINS` | 프론트 주소 (쉼표 구분) |
| `DESCRIPTION_MAX_CHARS` | 카드 설명 최대 길이 (기본 280) |
