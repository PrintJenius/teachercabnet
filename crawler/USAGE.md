# i-누리 크롤러 사용법

## 준비

프로젝트 폴더에서 의존성 설치(최초 1회 또는 변경 시):

```powershell
cd c:\Users\jbpark\Desktop\teachercabnet\crawler
py -3 -m pip install -r requirements.txt
```

실행은 항상 **`crawler` 폴더를 기준**으로 두는 것을 권장합니다.

---

## 자료누리 · 현장지원자료 전체

### 1) 링크만 가져오기 (다운로드 없음)

수집된 ZIP/PDF/MP4 URL과 게시글 제목 등을 터미널에만 출력합니다.

```powershell
py -3 -m crawler --preset field-support --dry-run
```

### 2) 실제 다운로드

기본 저장 위치는 **현재 폴더 아래 `downloads`** 입니다.

```powershell
py -3 -m crawler --preset field-support --out downloads
```

다른 폴더에 받으려면 `--out`에 원하는 경로를 넣습니다.

```powershell
py -3 -m crawler --preset field-support --out "D:\받은자료\현장지원"
```

---

## 자료누리 · 현장지원자료 · 공공기관자료 · 주제「놀이」

[i-누리 공공기관자료(놀이)](https://i-nuri.go.kr/teacher/module/dataSearch/index.do?menu_idx=32&data_type=nanum&how_show=each&how_sort=popular&gubun_type=false&sub_gubun_idx=1&year=&search_type=all&search_text=&cate_menu_idx_arr=1&rowCount=30&nanum_gubun=public&cate_menu_idx=&viewPage=1) 목록에서 글마다 **`dataManage/view.do` 상세 페이지**로 들어가, 실제 받을 수 있는 **`dataManage/download/...` 링크**만 모읍니다. (목록에 보이는 `dataSearch/download/...` 는 상대경로 해석상 404가 나는 경우가 많습니다.)

요청 수가 많아지므로 `--delay`를 너무 낮추지 않는 것을 권장합니다.

### 링크만 확인

```powershell
py -3 -m crawler --preset public-institution-play --dry-run
```

### 전부 다운로드

기본값은 **PDF·HWP만** 받으며, 저장 파일명은 목록의 **게시글 제목**(같은 제목이 겹치면 `제목_2.pdf` 형태)입니다. 예전처럼 첨부 URL의 파일 번호를 이름에 넣으려면 `--name-style attachment`를 쓰면 됩니다.

```powershell
py -3 -m crawler --preset public-institution-play --out downloads
```

다른 확장자까지 받으려면 `--ext`를 넣습니다(예: `--ext pdf,hwp,mp4`).

---

## 자주 쓰는 옵션

| 옵션 | 설명 |
|------|------|
| `--dry-run` | 파일은 받지 않고 링크·메타만 출력 |
| `--out 경로` | 저장 폴더 (기본: `./downloads`) |
| `--delay 초` | 요청 사이 대기 시간 (기본: `0.6`) |
| `--ext` | 확장자 목록, 쉼표 구분 (`field-support` 기본: `zip,pdf,mp4` / `public-institution-play` 기본: `pdf,hwp`) |
| `--name-style` | `title`: 게시글 제목만 파일명 / `attachment`: `제목_파일ID.확장자` (`public-institution-play`에서 미지정 시 `title`) |
| `--cookie "이름=값; ..."` | 로그인이 필요할 때 브라우저에서 복사한 쿠키 |

예: 대기 1초로 받기

```powershell
py -3 -m crawler --preset field-support --out downloads --delay 1
```

---

## 직접 URL 지정하기

`--preset` 대신 시작 URL을 넣을 수 있습니다 (`--url`은 여러 번 가능).

```powershell
py -3 -m crawler --url "https://i-nuri.go.kr/teacher/module/dataSearch/index.do?..." --dry-run
```

```powershell
py -3 -m crawler --url "https://..." --out downloads
```

---

## 참고

- 저장 파일명은 게시글 제목·첨부 표시·서버 응답 등 규칙에 따라 정해집니다. 자세한 동작은 코드의 `download.py`, `links.py`를 참고하세요.
- 사이트 부하와 이용약관을 고려해 `--delay`를 너무 작게 두지 않는 것이 좋습니다.
