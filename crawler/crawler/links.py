from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

DEFAULT_ALLOWED_HOSTS = frozenset({"i-nuri.go.kr", "www.i-nuri.go.kr"})

# path는 소문자로 비교하므로 소문자만 사용
_DOWNLOAD_FRAGMENT = "board/boardfile/download"
_DATA_SEARCH_DOWNLOAD_FRAGMENT = "module/datasearch/download/"
_DATA_MANAGE_DOWNLOAD_FRAGMENT = "module/datamanage/download/"


@dataclass(frozen=True)
class AssetLink:
    """다운로드 URL, 첨부 표시명, 같은 카드 안의 게시글 제목(있을 때)."""

    url: str
    label: str | None = None
    post_title: str | None = None


def _normalize_label(text: str) -> str | None:
    t = " ".join(text.split())
    if not t:
        return None
    t = re.sub(r"\s*다운로드\s*$", "", t, flags=re.IGNORECASE).strip()
    return t or None


def _same_site(url: str, allowed_hosts: frozenset[str]) -> bool:
    host = urlparse(url).hostname
    if not host:
        return False
    return host.lower() in allowed_hosts


def _post_title_for_download_anchor(anchor) -> str | None:
    """목록 카드(`li` + `p.tit`)에서 같은 글의 제목을 찾습니다."""
    el = anchor
    for _ in range(40):
        if el is None:
            return None
        if el.name == "li":
            tit = (
                el.select_one("p.tit a")
                or el.select_one("p.tit")
                or el.select_one("p.subject a")
                or el.select_one("p.subject")
                or el.select_one(".tit a")
            )
            if tit:
                text = tit.get_text(strip=True)
                if text:
                    return text
        el = el.parent
    return None


def should_follow_teacher_url(url: str) -> bool:
    """
    i-누리 교사 포털에서 자료·게시가 모일 가능성이 높은 경로만 추가 방문합니다.
    (메인/로그인 등 전역 메뉴 .do 링크 폭주를 막기 위함)
    """
    p = urlparse(url)
    if p.hostname and p.hostname.lower() not in DEFAULT_ALLOWED_HOSTS:
        return False
    path = p.path or ""
    if "/teacher/module/dataSearch/" in path:
        return True
    if "/teacher/board/" in path and path.endswith(".do"):
        return True
    if "/teacher/module/lms/" in path and path.endswith(".do"):
        return True
    return False


def collect_links_from_html(
    page_url: str,
    html: str,
    *,
    extensions: frozenset[str],
    follow_html_pages: bool,
    allowed_hosts: frozenset[str] = DEFAULT_ALLOWED_HOSTS,
) -> tuple[list[AssetLink], list[str]]:
    """
    HTML에서 (1) 첨부 다운로드 링크, (2) 직접 .pdf/.mp4 URL, (3) 같은 사이트 HTML 링크(크롤 확장용)를 수집합니다.
    """
    soup = BeautifulSoup(html, "html.parser")
    assets: list[AssetLink] = []
    next_pages: list[str] = []
    seen_asset: set[str] = set()

    def add_asset(url: str, label: str | None, post_title: str | None) -> None:
        if url in seen_asset:
            return
        seen_asset.add(url)
        assets.append(AssetLink(url=url, label=label, post_title=post_title))

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href.startswith("#") or href.lower().startswith("javascript:"):
            continue
        full = urljoin(page_url, href)
        if not _same_site(full, allowed_hosts):
            continue

        path = urlparse(full).path.lower()
        label = _normalize_label(a.get_text() or "")
        if not label:
            label = _normalize_label(a.get("title") or "")

        post_title = _post_title_for_download_anchor(a)

        if _DOWNLOAD_FRAGMENT in path:
            ext = _extension_from_label(label)
            if ext and ext in extensions:
                add_asset(full, label, post_title)
            continue

        if _DATA_SEARCH_DOWNLOAD_FRAGMENT in path and path.endswith(".do"):
            ext = _extension_from_label(label)
            if ext and ext in extensions:
                add_asset(full, label, post_title)
            continue

        if _DATA_MANAGE_DOWNLOAD_FRAGMENT in path and path.endswith(".do"):
            ext = _extension_from_label(label)
            if ext and ext in extensions:
                add_asset(full, label, post_title)
            continue

        low = full.split("?", 1)[0].lower()
        for ext in extensions:
            if low.endswith(f".{ext}"):
                add_asset(full, label, post_title)
                break
        else:
            if follow_html_pages and full != page_url and should_follow_teacher_url(full):
                if any(path.endswith(s) for s in (".do", ".jsp", ".html", ".htm")):
                    next_pages.append(full)

    return assets, next_pages


def _extension_from_label(label: str | None) -> str | None:
    if not label:
        return None
    # "HWP 제목.hwp (33MB)" 처럼 끝이 괄호/용량이면 단순 $ 앵커로는 실패 → 문자열 안의 마지막 .확장자 토큰 사용
    common = frozenset(
        "pdf hwp mp4 mov avi wmv zip ppt pptx ppsx doc docx xls xlsx txt png jpg jpeg gif webp epub".split()
    )
    hits = re.findall(r"\.([a-z0-9]{1,8})\b", label, flags=re.IGNORECASE)
    if not hits:
        return None
    lowered = [h.lower() for h in hits]
    for ext in reversed(lowered):
        if ext in common:
            return ext
    return lowered[-1]
