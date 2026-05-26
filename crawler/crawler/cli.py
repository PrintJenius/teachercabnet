from __future__ import annotations

import argparse
import time
from pathlib import Path
from urllib.parse import urlparse

import httpx

from crawler import datasearch
from crawler.download import NameStyle, download_file
from crawler.links import (
    DEFAULT_ALLOWED_HOSTS,
    AssetLink,
    collect_links_from_html,
)


def _build_client(headers: dict[str, str] | None, cookie: str | None) -> httpx.Client:
    base_headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    if headers:
        base_headers.update(headers)
    cookies = None
    if cookie:
        cookies = httpx.Cookies()
        # "a=b; c=d" 형태
        for part in cookie.split(";"):
            part = part.strip()
            if "=" in part:
                k, v = part.split("=", 1)
                cookies.set(k.strip(), v.strip(), domain="i-nuri.go.kr")
    return httpx.Client(headers=base_headers, cookies=cookies, timeout=120.0)


def main() -> None:
    p = argparse.ArgumentParser(
        description="i-누리(i-nuri.go.kr) 목록/게시 페이지에서 PDF·MP4 첨부를 다운로드합니다.",
    )
    p.add_argument(
        "--preset",
        choices=["field-support", "public-institution-play"],
        default=None,
        help=(
            "field-support: 현장지원자료 전체 목록 | "
            "public-institution-play: 공공기관자료 > 주제 '놀이' 공개글 전체"
        ),
    )
    p.add_argument(
        "--url",
        action="append",
        dest="urls",
        default=None,
        help="시작 URL (여러 번 지정 가능). --preset과 함께 쓸 수 없습니다.",
    )
    p.add_argument(
        "--out",
        type=Path,
        default=Path("downloads"),
        help="저장 폴더 (기본: ./downloads)",
    )
    p.add_argument(
        "--ext",
        default=None,
        help=(
            "다운로드할 확장자 쉼표 구분. "
            "미지정 시 field-support는 zip,pdf,mp4, "
            "public-institution-play는 pdf,hwp."
        ),
    )
    p.add_argument(
        "--delay",
        type=float,
        default=0.6,
        help="요청 간 대기 초 (기본: 0.6)",
    )
    p.add_argument(
        "--crawl",
        action="store_true",
        help="자료검색/게시/LMS 등 허용 경로의 HTML 링크를 넓게 따라가며 링크 수집",
    )
    p.add_argument(
        "--max-pages",
        type=int,
        default=50,
        help="방문할 HTML 페이지 수 상한 (--crawl 시에만 의미 있음, 기본: 50)",
    )
    p.add_argument(
        "--cookie",
        default=None,
        help='로그인 세션이 필요하면 브라우저에서 복사한 Cookie 헤더 값 ("name=value; ...")',
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="URL만 출력하고 파일은 받지 않음",
    )
    p.add_argument(
        "--name-style",
        choices=["attachment", "title"],
        default=None,
        help=(
            "저장 파일명: attachment=게시글제목_파일ID.확장자(기본), "
            "title=게시글제목.확장자. "
            "public-institution-play 에서 미지정 시 title."
        ),
    )
    args = p.parse_args()

    if bool(args.preset) == bool(args.urls):
        p.error("--preset 또는 --url 중 하나는 반드시 지정해야 합니다(동시 지정 불가).")

    if args.ext is None:
        if args.preset == "public-institution-play":
            args.ext = "pdf,hwp"
        else:
            args.ext = "zip,pdf,mp4"

    if args.name_style is None:
        name_style: NameStyle = "title" if args.preset == "public-institution-play" else "attachment"
    else:
        name_style = args.name_style

    extensions = frozenset(e.strip().lower().lstrip(".") for e in args.ext.split(",") if e.strip())
    if not extensions:
        raise SystemExit("확장자(--ext)가 비었습니다.")

    extra_headers: dict[str, str] = {}
    client = _build_client(extra_headers, args.cookie)

    to_download: dict[str, AssetLink] = {}

    if args.preset == "field-support":
        if args.crawl:
            p.error("--preset field-support 는 목록 페이지만 순회하므로 --crawl 과 함께 쓸 수 없습니다.")
        list_url = datasearch.FIELD_SUPPORT_ALL_LIST
        for page_no, html in datasearch.iter_field_support_list_pages(client, delay_sec=args.delay):
            assets, _more = collect_links_from_html(
                list_url,
                html,
                extensions=extensions,
                follow_html_pages=False,
                allowed_hosts=DEFAULT_ALLOWED_HOSTS,
            )
            for al in assets:
                to_download.setdefault(al.url, al)
            print(f"  목록 페이지 {page_no} 스캔 → 누적 파일 링크 {len(to_download)}건")
    elif args.preset == "public-institution-play":
        if args.crawl:
            p.error(
                "--preset public-institution-play 는 목록 페이지만 순회하므로 "
                "--crawl 과 함께 쓸 수 없습니다."
            )
        list_url = datasearch.PUBLIC_INSTITUTION_NANUM_PLAY
        seen_post_ids: set[str] = set()
        for page_no, html, list_page_url in datasearch.iter_public_institution_play_pages(
            client, delay_sec=args.delay
        ):
            menu_idx = datasearch.menu_idx_from_data_search_list(html)
            cards = datasearch.parse_public_nanum_play_post_cards(html)
            for data_idx, post_title in cards:
                if data_idx in seen_post_ids:
                    continue
                seen_post_ids.add(data_idx)
                time.sleep(max(0.0, args.delay))
                view_url = datasearch.data_manage_view_url(data_idx=data_idx, menu_idx=menu_idx)
                rv = client.get(view_url, headers={"Referer": list_page_url})
                rv.raise_for_status()
                assets, _more = collect_links_from_html(
                    view_url,
                    rv.text,
                    extensions=extensions,
                    follow_html_pages=False,
                    allowed_hosts=DEFAULT_ALLOWED_HOSTS,
                )
                for al in assets:
                    merged = AssetLink(
                        url=al.url,
                        label=al.label,
                        post_title=post_title or al.post_title,
                    )
                    to_download.setdefault(merged.url, merged)
            print(
                f"  목록 {page_no} (글 {len(cards)}건) + 상세 방문 누적 "
                f"게시글 {len(seen_post_ids)} / 파일 링크 {len(to_download)}건"
            )
    else:
        queue: list[str] = []
        seen_pages: set[str] = set()
        assert args.urls is not None
        for u in args.urls:
            if u not in seen_pages:
                queue.append(u)

        pages_fetched = 0
        while queue and pages_fetched < args.max_pages:
            page_url = queue.pop(0)
            if page_url in seen_pages:
                continue
            seen_pages.add(page_url)
            pages_fetched += 1
            r = client.get(page_url)
            r.raise_for_status()
            ctype = (r.headers.get("content-type") or "").lower()
            if "text/html" not in ctype and "application/xhtml" not in ctype:
                continue
            assets, more = collect_links_from_html(
                page_url,
                r.text,
                extensions=extensions,
                follow_html_pages=args.crawl,
                allowed_hosts=DEFAULT_ALLOWED_HOSTS,
            )
            for al in assets:
                to_download.setdefault(al.url, al)
            for u in more:
                if u not in seen_pages and urlparse(u).hostname and u not in queue:
                    queue.append(u)
            time.sleep(max(0.0, args.delay))

    print(f"발견된 파일 링크: {len(to_download)}건")
    for url, al in sorted(to_download.items(), key=lambda x: x[0]):
        print(f"  {url}")
        if al.post_title:
            print(f"    [게시글] {al.post_title}")
        if al.label:
            print(f"    [첨부표시] {al.label}")

    if args.dry_run:
        return

    for i, (url, al) in enumerate(sorted(to_download.items(), key=lambda x: x[0])):
        print(f"[{i + 1}/{len(to_download)}] 받는 중: {url}")
        download_file(
            client,
            url,
            args.out,
            fallback_name=al.label,
            post_title=al.post_title,
            name_style=name_style,
        )
        time.sleep(max(0.0, args.delay))

    print(f"완료. 저장 위치: {args.out.resolve()}")


if __name__ == "__main__":
    main()
