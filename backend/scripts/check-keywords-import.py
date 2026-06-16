#!/usr/bin/env python3
"""Compare CSV keywords vs products.keywords in DB (via docker psql)."""
import csv
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = ROOT / "data" / "tiki.vn (full).csv"


def parse_tiki_keywords(raw: str) -> list[str]:
    trimmed = (raw or "").strip()
    if not trimmed:
        return []
    quoted: list[str] = []
    for m in re.finditer(r'"([^"]*)"', trimmed):
        kw = m.group(1).strip()
        if kw:
            quoted.append(kw)
    if quoted:
        return quoted
    return [s.strip().replace('"', "") for s in trimmed.split(",") if s.strip()]


def fetch_db_keywords(skus: list[str]) -> dict[str, list[str]]:
    if not skus:
        return {}
    sku_list = ",".join(f"'{s}'" for s in skus)
    sql = f"""
      SELECT pe.external_id AS sku, p.keywords
      FROM price_entries pe
      JOIN products p ON p.id = pe.product_id
      WHERE pe.source_name = 'tiki' AND pe.external_id IN ({sku_list});
    """
    result = subprocess.run(
        ["docker", "exec", "kombe-postgres", "psql", "-U", "kombe", "-d", "kombe", "-t", "-A", "-F", "|", "-c", sql],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        sys.exit(1)

    out: dict[str, list[str]] = {}
    for line in result.stdout.strip().splitlines():
        if not line.strip():
            continue
        sku, keywords_raw = line.split("|", 1)
        # postgres array: {a,b,c} or NULL
        keywords_raw = keywords_raw.strip()
        if keywords_raw in ("", "NULL"):
            out[sku] = []
        elif keywords_raw.startswith("{") and keywords_raw.endswith("}"):
            inner = keywords_raw[1:-1]
            if not inner:
                out[sku] = []
            else:
                # handle quoted elements with commas
                parts = []
                cur = ""
                in_q = False
                for ch in inner:
                    if ch == '"':
                        in_q = not in_q
                    elif ch == "," and not in_q:
                        parts.append(cur.strip('"'))
                        cur = ""
                    else:
                        cur += ch
                if cur:
                    parts.append(cur.strip('"'))
                out[sku] = parts
        else:
            out[sku] = [keywords_raw]
    return out


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")

    samples: list[tuple[str, list[str]]] = []
    orphan_samples: list[tuple[str, list[str]]] = []

    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            sku = row["sku"]
            expected = parse_tiki_keywords(row.get("keywords", ""))
            if i < 5:
                samples.append((sku, expected))
            if "," not in row.get("keywords", "") and i < 500:
                if len(orphan_samples) < 3 and expected:
                    orphan_samples.append((sku, expected))

    all_samples = samples + orphan_samples
    skus = [s for s, _ in all_samples]
    db_map = fetch_db_keywords(skus)

    mismatches = 0
    matches = 0
    missing = 0

    print("=== So sánh CSV vs products.keywords ===\n")
    for sku, expected in all_samples:
        actual = db_map.get(sku)
        if actual is None:
            missing += 1
            print(f"SKU {sku}: KHÔNG TÌM THẤY trong DB")
            continue
        if actual == expected:
            matches += 1
            print(f"SKU {sku}: OK ({len(actual)} keywords)")
            print(f"  {actual}")
        else:
            mismatches += 1
            print(f"SKU {sku}: KHÔNG KHỚP")
            print(f"  CSV: {expected}")
            print(f"  DB:  {actual}")
        print()

    # Stats
    stats = subprocess.run(
        [
            "docker", "exec", "kombe-postgres", "psql", "-U", "kombe", "-d", "kombe", "-t", "-A", "-c",
            """
            SELECT
              COUNT(*) FILTER (WHERE p.keywords IS NULL OR cardinality(p.keywords) = 0) AS empty_kw,
              COUNT(*) FILTER (WHERE p.keywords IS NOT NULL AND cardinality(p.keywords) > 0) AS has_kw,
              COUNT(*) AS total
            FROM price_entries pe
            JOIN products p ON p.id = pe.product_id
            WHERE pe.source_name = 'tiki';
            """,
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    empty_kw, has_kw, total = stats.stdout.strip().split("|")
    print("=== Thống kê DB ===")
    print(f"Tổng sản phẩm Tiki: {total}")
    print(f"Có keywords (array không rỗng): {has_kw}")
    print(f"Keywords rỗng/null: {empty_kw}")
    print()
    print(f"Mẫu kiểm tra: {matches} khớp, {mismatches} lệch, {missing} thiếu")


if __name__ == "__main__":
    main()
