# 커밋 메시지 양식 (한글)

이 저장소는 **모노레포**이며, 커밋 메시지는 아래 규칙을 따릅니다.

---

### 1) 기본 형식

```
<type>(<scope>): <한줄 요약>

<필요하면 본문: 왜/영향/주의점>
```

- **type**: 아래 5개만 사용 (`init`, `feat`, `fix`, `refactor`, `chore`)
- **scope**: 변경 범위(폴더/서비스/영역). 예: `backend`, `frontend`, `rag-server`, `rag-ingest`, `crawler`, `docs`, `infra`
- **한줄 요약**: 1줄로 핵심만, 한글로 작성

---

### 2) type 정의 (5개만)

- **`init`**: 저장소 초기 세팅/첫 업로드(초기 커밋). 이후에는 사용하지 않음
- **`feat`**: 기능 추가/확장
- **`fix`**: 버그 수정
- **`refactor`**: 리팩터링(기능 변화 최소, 구조 개선)
- **`chore`**: 설정/빌드/정리/문서/의존성 업데이트 등 “그 외 전부”

> 이 저장소에서는 `docs`, `test`, `ci` 타입을 사용하지 않습니다. 문서 변경도 `chore`로 처리합니다.

---

### 3) scope 추천 목록

- **서비스/폴더 기준**: `backend`, `frontend`, `rag-server`, `rag-ingest`, `crawler`
- **공통/기타**: `docs`, `infra`

scope를 생략해도 되지만, 모노레포에서는 붙이는 것을 권장합니다.

---

### 4) 예시

```
init: 초기 업로드
```

```
feat(frontend): 수업자료 검색 결과 카드 UI 추가
```

```
fix(backend): Render PORT 환경변수로 서버 포트 바인딩
```

```
refactor(rag-server): 검색 응답 중복 제거 로직 정리
```

```
chore(docs): 배포 가이드 환경변수 표 최신화
```

```
chore: 리포지토리 구조 정리 및 불필요 파일 제거
```

