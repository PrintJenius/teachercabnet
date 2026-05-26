# 로컬 Spring ↔ Supabase DB 연결

로컬 `backend`는 **Supabase PostgreSQL**만 사용합니다 (기존 로컬 MySQL 제거).

## 1. Supabase에서 연결 정보 복사

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **Connect** → **Session mode** (또는 Direct, 포트 5432)
3. 비밀번호는 **Database password** (프로젝트 생성 시 설정한 값)

## 2. `backend/.env` 설정

`backend/.env.example`을 복사하거나 아래 3줄을 `backend/.env`에 추가합니다.

Supabase Connect URI에 비밀번호가 포함돼 있어도, **Spring + HikariCP는 URL·username·password를 분리**하는 것이 안전합니다.  
(URL에 넣고 username/password를 비우면 `UnknownHostException: postgres.xxx:비밀번호@호스트` 오류가 날 수 있음)

```env
# Session pooler (5432) — 이 프로젝트 권장 (IPv4 + JPA 호환)
SPRING_DATASOURCE_URL=jdbc:postgresql://aws-0-리전.pooler.supabase.com:5432/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=postgres.프로젝트ID
SPRING_DATASOURCE_PASSWORD=DB비밀번호
```

Supabase Connect에서 **Session** 탭의 host/port/username을 그대로 쓰면 됩니다.

- `db.프로젝트ID.supabase.co:5432` (Direct)는 **IPv6만** 있는 경우가 있어 Windows/Java에서 `UnknownHostException` → pooler **5432** 사용
- `6543` (Transaction pooler) → `prepared statement does not exist` → **5432**로 변경
- URL·username·password **분리** (비밀번호를 URL에 넣지 않음)

Direct(`db.xxx`)를 쓰려면: Supabase에서 IPv4 추가 또는 JVM `-Djava.net.preferIPv6Addresses=true`

## 3. 서버 실행

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

첫 기동 시 `JPA_DDL_AUTO=update`로 테이블이 Supabase에 생성됩니다.

- 기본 관리자: `admin` / `admin1234` (없을 때만 자동 생성)

## 4. MySQL 데이터 이전 (선택)

로컬 MySQL에 쓰던 데이터가 있으면:

- Supabase 빈 DB에 Spring 1회 기동(스키마 생성) 후
- MySQL → CSV/pgloader 등으로 이전, 또는 수동 재입력

스키마는 JPA `ddl-auto=update`로 맞춥니다. 데이터 확인은 `sql/select.sql`(Supabase SQL Editor용)을 참고하세요.

## 5. 운영(Render)

환경 변수는 동일 키(`SPRING_DATASOURCE_*`)를 쓰고, 프로필만 다릅니다.

```env
SPRING_PROFILES_ACTIVE=prod
```

`application-prod.yaml`에서 `ddl-auto: validate`로 스키마 자동 변경을 막습니다.
