"""자료누리 dataSearch 목록: 폼 파싱·viewPage 페이지네이션."""

from __future__ import annotations

import re
import time
from typing import Iterator

import httpx
from bs4 import BeautifulSoup

DATA_SEARCH_INDEX = "https://i-nuri.go.kr/teacher/module/dataSearch/index.do"

# 자료누리 > 현장지원자료 > 정부개발자료 > 전체 (531건 통합 목록)
FIELD_SUPPORT_ALL_LIST = (
    "https://i-nuri.go.kr/teacher/module/dataSearch/index.do"
    "?data_type=normal&manage_idx=31&menu_idx=60"
)

# 자료누리 > 현장지원자료 > 공공기관자료 > 주제 "놀이"(cate_menu_idx_arr=1) 공개 나눔 목록
PUBLIC_INSTITUTION_NANUM_PLAY = (
    "https://i-nuri.go.kr/teacher/module/dataSearch/index.do"
    "?menu_idx=32&data_type=nanum&how_show=each&how_sort=popular&gubun_type=false"
    "&sub_gubun_idx=1&year=&search_type=all&search_text="
    "&cate_menu_idx_arr=1&rowCount=30&nanum_gubun=public&cate_menu_idx=&viewPage=1"
)

_PAGE_RE = re.compile(r"(\d+)\s*/\s*(\d+)\s*페이지")
_VIEW_DATA_JS = re.compile(r"javascript:viewData\('(\d+)'\)", re.IGNORECASE)

DATA_MANAGE_VIEW = "https://i-nuri.go.kr/teacher/module/dataManage/view.do"


def parse_list_total_pages(html: str) -> int:
    """목록 상단 '1/49 페이지' 형식에서 총 페이지 수만 추출합니다."""
    soup = BeautifulSoup(html, "html.parser")
    h2 = soup.find("h2")
    if not h2:
        return 1
    text = h2.get_text(" ", strip=True)
    m = _PAGE_RE.search(text)
    if not m:
        return 1
    return max(1, int(m.group(2)))


def parse_data_search_form_pairs(html: str) -> list[tuple[str, str]]:
    """
    #dataSearchForm 필드를 GET 쿼리스트링용 (name, value) 목록으로 직렬화합니다.
    동일 name이 여러 번 나오는 체크박스(예: sub_gubun_arr)를 보존합니다.
    """
    soup = BeautifulSoup(html, "html.parser")
    form = soup.find("form", id="dataSearchForm")
    if not form:
        return []

    pairs: list[tuple[str, str]] = []

    for el in form.find_all("input"):
        name = el.get("name")
        if not name:
            continue
        typ = (el.get("type") or "text").lower()
        if typ in ("submit", "button", "image"):
            continue
        if typ == "checkbox":
            if el.has_attr("checked"):
                pairs.append((name, el.get("value") or "on"))
            continue
        if typ == "radio":
            if el.has_attr("checked"):
                pairs.append((name, el.get("value") or ""))
            continue
        pairs.append((name, el.get("value") or ""))

    for el in form.find_all("select"):
        name = el.get("name")
        if not name:
            continue
        opt = el.find("option", selected=True) or el.find("option")
        pairs.append((name, (opt.get("value") or "") if opt else ""))

    for el in form.find_all("textarea"):
        name = el.get("name")
        if not name:
            continue
        pairs.append((name, el.get_text() or ""))

    return pairs


def menu_idx_from_data_search_list(html: str) -> str:
    """목록 HTML의 폼 또는 #menu_idx 에서 menu_idx 값을 가져옵니다."""
    for k, v in parse_data_search_form_pairs(html):
        if k == "menu_idx" and (v or "").strip():
            return v.strip()
    soup = BeautifulSoup(html, "html.parser")
    inp = soup.find("input", id="menu_idx")
    if inp and (inp.get("value") or "").strip():
        return str(inp.get("value")).strip()
    return "32"


def data_manage_view_url(*, data_idx: str, menu_idx: str) -> str:
    """공공 나눔 등 자료 상세(첨부 다운로드가 있는 페이지)."""
    return f"{DATA_MANAGE_VIEW}?data_idx={data_idx}&menu_idx={menu_idx}"


def parse_public_nanum_play_post_cards(html: str) -> list[tuple[str, str | None]]:
    """
    공공기관자료 나눔 놀이 목록 한 페이지에서 (data_idx, 게시글 제목) 목록을 추출합니다.
    상세는 javascript:viewData('숫자') 로 열립니다.
    """
    soup = BeautifulSoup(html, "html.parser")
    ul = soup.select_one("#archive-list ul.list") or soup.select_one("ul.list.clearfix")
    if not ul:
        return []

    out: list[tuple[str, str | None]] = []
    for li in ul.find_all("li", recursive=False):
        a = li.find("a", href=True)
        if not a:
            continue
        m = _VIEW_DATA_JS.search(a.get("href") or "")
        if not m:
            continue
        data_idx = m.group(1)
        subj = li.select_one("p.subject")
        title = subj.get_text(strip=True) if subj else None
        out.append((data_idx, title))
    return out


def _params_with_view_page(base: list[tuple[str, str]], page: int) -> list[tuple[str, str]]:
    return [(k, v) for k, v in base if k != "viewPage"] + [("viewPage", str(page))]


def iter_field_support_list_pages(
    client: httpx.Client,
    *,
    delay_sec: float,
) -> Iterator[tuple[int, str]]:
    """
    현장지원자료(전체) 목록의 각 페이지 HTML을 (페이지번호, html)로 순회합니다.
    첫 응답의 폼 상태를 유지한 채 viewPage만 바꿉니다.
    """
    r0 = client.get(FIELD_SUPPORT_ALL_LIST)
    r0.raise_for_status()
    html0 = r0.text
    total = parse_list_total_pages(html0)
    base_pairs = parse_data_search_form_pairs(html0)
    if not base_pairs:
        raise RuntimeError("dataSearchForm을 찾지 못했습니다. 사이트 구조가 바뀌었을 수 있습니다.")

    time.sleep(max(0.0, delay_sec))

    yield 1, html0

    for page in range(2, total + 1):
        time.sleep(max(0.0, delay_sec))
        r = client.get(DATA_SEARCH_INDEX, params=_params_with_view_page(base_pairs, page))
        r.raise_for_status()
        yield page, r.text


def iter_public_institution_play_pages(
    client: httpx.Client,
    *,
    delay_sec: float,
) -> Iterator[tuple[int, str, str]]:
    """
    현장지원자료 > 공공기관자료 > 주제 '놀이' 목록의 각 페이지를
    (페이지번호, html, 해당 목록 페이지 URL)로 순회합니다.
    상세 페이지 Referer 등에 목록 URL을 쓰기 위해 실제 요청 URL을 함께 돌려줍니다.
    """
    r0 = client.get(PUBLIC_INSTITUTION_NANUM_PLAY)
    r0.raise_for_status()
    html0 = r0.text
    total = parse_list_total_pages(html0)
    base_pairs = parse_data_search_form_pairs(html0)
    if not base_pairs:
        raise RuntimeError("dataSearchForm을 찾지 못했습니다. 사이트 구조가 바뀌었을 수 있습니다.")

    time.sleep(max(0.0, delay_sec))

    yield 1, html0, str(r0.url)

    for page in range(2, total + 1):
        time.sleep(max(0.0, delay_sec))
        r = client.get(DATA_SEARCH_INDEX, params=_params_with_view_page(base_pairs, page))
        r.raise_for_status()
        yield page, r.text, str(r.url)
