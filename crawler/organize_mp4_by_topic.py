# -*- coding: utf-8 -*-
"""Move downloads/*.mp4 into topic subfolders by filename heuristics."""
from __future__ import annotations

import os
import shutil

from media_topic_rules import get_topic


def main() -> None:
    root = os.path.dirname(os.path.abspath(__file__))
    downloads = os.path.join(root, "downloads")
    topics: dict[str, list[str]] = {}
    names = [
        f
        for f in os.listdir(downloads)
        if f.lower().endswith(".mp4") and os.path.isfile(os.path.join(downloads, f))
    ]
    if not names:
        print("No mp4 files in downloads root.")
        return

    for name in names:
        t = get_topic(name)
        topics.setdefault(t, []).append(name)

    for topic, files in sorted(topics.items(), key=lambda x: x[0]):
        dest_dir = os.path.join(downloads, topic)
        os.makedirs(dest_dir, exist_ok=True)
        for name in files:
            src = os.path.join(downloads, name)
            dst = os.path.join(dest_dir, name)
            if os.path.exists(dst):
                print(f"Skip (exists): {name}")
                continue
            shutil.move(src, dst)
        print(f"{topic}: {len(files)}")

    print(f"Done. {len(names)} files, {len(topics)} topics.")


if __name__ == "__main__":
    main()
