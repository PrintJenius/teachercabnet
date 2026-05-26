from __future__ import annotations

import re
from pathlib import Path
from typing import Literal
from urllib.parse import unquote

import httpx

NameStyle = Literal["attachment", "title"]

# /board/boardFile/download/{게시판}/{글}/{파일번호}.do — 목록에 같은 제목이 반복될 때 구분용
_RE_BOARD_FILE_ID = re.compile(
    r"/board/boardfile/download/\d+/\d+/(\d+)\.do(?:\?.*)?$",
    re.IGNORECASE,
)
# /teacher/module/dataSearch/download/{글}/{파일번호}.do (자료누리 공공기관자료 등)
_RE_DATA_SEARCH_FILE_ID = re.compile(
    r"/teacher/module/datasearch/download/\d+/(\d+)\.do(?:\?.*)?$",
    re.IGNORECASE,
)
_RE_DATA_MANAGE_FILE_ID = re.compile(
    r"/teacher/module/datamanage/download/\d+/(\d+)\.do(?:\?.*)?$",
    re.IGNORECASE,
)


def _has_hangul(s: str) -> bool:
    return any("\uac00" <= c <= "\ud7a3" for c in s)


def _recover_misdecoded_header_string(s: str) -> str:
    """
    HTTP 헤더/잘못된 단계에서 한 바이트 = 한 글자로 잘못 읽힌 문자열을,
    다시 원바이트열로 만든 뒤 UTF-8 / CP949 / EUC-KR 로 디코딩해 봅니다.

    - UTF-8 바이트가 Latin-1로 잘못 해석된 경우 → UTF-8 로 복구
    - CP949(EUC-KR) 바이트가 Latin-1/Windows-1252로 잘못 해석된 경우 → CP949 로 복구
      (스크린샷의 ÁÖÂ÷ 류 깨짐)
    """
    if not s:
        return s
    try:
        raw = s.encode("latin-1")
    except UnicodeEncodeError:
        return s

    candidates: list[tuple[str, str]] = []
    for enc in ("utf-8", "cp949", "euc-kr"):
        try:
            u = raw.decode(enc)
        except UnicodeDecodeError:
            continue
        candidates.append((enc, u))

    for _enc, u in candidates:
        if _has_hangul(u):
            return u

    for enc, u in candidates:
        if enc == "utf-8":
            return u

    if candidates:
        return candidates[0][1]
    return s


def _filename_from_cd(value: str | None) -> str | None:
    """
    Content-Disposition에서 파일명 추출.
    - RFC 5987 `filename*=UTF-8''...` 우선, 퍼센트 디코딩.
    - 레거시 `filename="..."` 는 UTF-8/CP949 등 오인코딩 복구 시도.
    """
    if not value:
        return None
    # filename*=UTF-8''%EC%9E%90%EB%A3%8C.pdf  (공백 허용)
    m5987 = re.search(
        r"filename\*\s*=\s*(?:UTF-8|utf-8)\s*''\s*([^;\r\n]+)",
        value,
        re.IGNORECASE,
    )
    if m5987:
        raw = m5987.group(1).strip().strip('"')
        try:
            decoded = unquote(raw, errors="strict")
        except Exception:
            decoded = unquote(raw, errors="replace") or ""
        if not decoded:
            return None
        return _recover_misdecoded_header_string(decoded)

    # filename="..."
    mqq = re.search(r'filename\s*=\s*"((?:\\.|[^"])*)"', value, re.IGNORECASE)
    if mqq:
        inner = mqq.group(1).replace(r"\"", '"').replace(r"\\", "\\")
        inner = _recover_misdecoded_header_string(inner.strip())
        return inner or None

    # filename=token (따옴표 없음)
    mtok = re.search(r"filename\s*=\s*([^;\r\n]+)", value, re.IGNORECASE)
    if mtok:
        raw = mtok.group(1).strip().strip('"')
        if raw.lower().startswith("utf-8''"):
            return None
        raw = _recover_misdecoded_header_string(raw)
        return raw or None

    return None


def _sanitize_filename(name: str) -> str:
    name = name.replace("\x00", "")
    name = re.sub(r'[<>:"/\\|?*]', "_", name)
    name = name.strip(" .")
    return name or "download"


def _extension_from_fallback(fallback_name: str | None) -> str:
    if not fallback_name:
        return ""
    m = re.search(r"\.([a-z0-9]+)\s*$", fallback_name.strip(), flags=re.IGNORECASE)
    return f".{m.group(1).lower()}" if m else ""


def _board_file_id(url: str) -> str | None:
    m = _RE_BOARD_FILE_ID.search(url.split("#", 1)[0])
    return m.group(1) if m else None


def _data_search_file_id(url: str) -> str | None:
    m = _RE_DATA_SEARCH_FILE_ID.search(url.split("#", 1)[0])
    return m.group(1) if m else None


def _data_manage_file_id(url: str) -> str | None:
    m = _RE_DATA_MANAGE_FILE_ID.search(url.split("#", 1)[0])
    return m.group(1) if m else None


def _attachment_file_id(url: str) -> str | None:
    return _board_file_id(url) or _data_search_file_id(url) or _data_manage_file_id(url)


def _is_generic_attachment_filename(filename: str) -> bool:
    """서버가 준 이름도 '파일동영상.mp4'처럼 무의미한 경우 게시글 제목으로 바꿉니다."""
    stem = Path(filename).stem.lower()
    lower = filename.lower()
    if lower in (
        "파일동영상.mp4",
        "파일.mp4",
        "동영상.mp4",
        "첨부.zip",
        "파일.zip",
        "파일.pdf",
        "첨부파일.pdf",
    ):
        return True
    if stem in ("파일동영상", "파일", "동영상", "첨부파일", "첨부"):
        return True
    if re.fullmatch(r"파일\d*", stem):
        return True
    return False


def _with_board_file_id(url: str, filename: str) -> str:
    """첨부 URL의 파일 번호를 파일명에 넣어 '파일동영상.mp4' 등 중복 표기를 구분합니다."""
    fid = _attachment_file_id(url)
    if not fid:
        return filename
    p = Path(filename)
    stem, suf = p.stem, p.suffix
    if stem.endswith(f"_{fid}"):
        return filename
    return f"{stem}_{fid}{suf}"


def download_file(
    client: httpx.Client,
    url: str,
    dest_dir: Path,
    *,
    fallback_name: str | None = None,
    post_title: str | None = None,
    name_style: NameStyle = "attachment",
) -> Path:
    """
    GET으로 파일을 저장합니다.
    post_title이 있으면 파일명은 게시글 제목 기준.
    - name_style \"attachment\": 제목_파일ID.확장자
    - name_style \"title\": 제목.확장자 (같은 제목·확장자 충돌 시 제목_2 형태)
    서버 Content-Disposition 이름은 확장자 추론에만 사용합니다.
    """
    dest_dir.mkdir(parents=True, exist_ok=True)
    if post_title:
        post_title = _recover_misdecoded_header_string(post_title)
    if fallback_name:
        fallback_name = _recover_misdecoded_header_string(fallback_name)

    with client.stream("GET", url, follow_redirects=True) as resp:
        resp.raise_for_status()
        cd = resp.headers.get("content-disposition")
        cd_name = _filename_from_cd(cd) or ""

        # 게시글 제목을 수집했다면 파일명은 항상 제목 우선(Content-Disposition은 확장자 보조만).
        # 서버가 준 이름만 쓰면 목록 제목과 다르게 저장되는 문제가 생김.
        if post_title:
            ext = _extension_from_fallback(fallback_name)
            if not ext and cd_name:
                ext = Path(cd_name).suffix
            if not ext:
                ext = ".bin"
            stem = _sanitize_filename(post_title)
            if len(stem) > 120:
                stem = stem[:120].rstrip("_. ")
            if name_style == "title":
                name = f"{stem}{ext}"
            else:
                fid = _attachment_file_id(url)
                name = f"{stem}_{fid}{ext}" if fid else f"{stem}{ext}"
        else:
            name = cd_name
            if name and _is_generic_attachment_filename(name):
                name = ""

            if not name and fallback_name:
                name = _sanitize_filename(fallback_name)
                name = _with_board_file_id(url, name)

            if not name:
                path_last = url.rstrip("/").split("/")[-1].split("?", 1)[0]
                name = path_last if path_last and "." in path_last else "download.bin"
                name = _with_board_file_id(url, name)

        name = _sanitize_filename(name)
        out = dest_dir / name
        if out.exists():
            stem, suf = out.stem, out.suffix
            for i in range(2, 10_000):
                cand = dest_dir / f"{stem}_{i}{suf}"
                if not cand.exists():
                    out = cand
                    break
        with out.open("wb") as f:
            for chunk in resp.iter_bytes(1024 * 256):
                f.write(chunk)
    return out
