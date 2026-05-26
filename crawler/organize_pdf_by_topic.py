# -*- coding: utf-8 -*-
"""Move all downloads/**/*.pdf into topic subfolders (same rules as mp4)."""
from __future__ import annotations

import os
import shutil

from media_topic_rules import get_topic


def iter_pdfs(downloads: str):
    for dirpath, _, filenames in os.walk(downloads):
        for f in filenames:
            if f.lower().endswith(".pdf"):
                yield os.path.join(dirpath, f)


def main() -> None:
    root = os.path.dirname(os.path.abspath(__file__))
    downloads = os.path.join(root, "downloads")
    if not os.path.isdir(downloads):
        print("downloads folder missing.")
        return

    planned: list[tuple[str, str]] = []
    for src in iter_pdfs(downloads):
        name = os.path.basename(src)
        topic = get_topic(name)
        dest_dir = os.path.join(downloads, topic)
        dest = os.path.join(dest_dir, name)
        correct_dir = os.path.normpath(dest_dir)
        current_dir = os.path.normpath(os.path.dirname(src))
        if current_dir == correct_dir:
            continue
        planned.append((src, dest))

    if not planned:
        print("No pdf to move (already in topic folders or no pdf).")
        return

    moved = 0
    for src, dest in planned:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if os.path.exists(dest):
            print(f"Skip (exists): {dest}")
            continue
        shutil.move(src, dest)
        moved += 1

    # Remove empty directories under downloads (deepest first)
    removed = 0
    while True:
        found = False
        for dirpath, dirnames, filenames in os.walk(downloads, topdown=False):
            if os.path.normpath(dirpath) == os.path.normpath(downloads):
                continue
            if not os.listdir(dirpath):
                os.rmdir(dirpath)
                removed += 1
                found = True
        if not found:
            break

    print(f"Done. Moved {moved} pdf files. Removed {removed} empty dirs.")


if __name__ == "__main__":
    main()
