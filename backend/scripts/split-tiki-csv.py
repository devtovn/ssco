#!/usr/bin/env python3
"""Split tiki.vn (full).csv into upload-safe chunks (header preserved in each part)."""
import csv
import sys
from pathlib import Path

DEFAULT_MAX_BYTES = 500 * 1024  # 500 KB — safe for typical 1 MB request limits


def split_csv(source: Path, out_dir: Path, max_bytes: int = DEFAULT_MAX_BYTES) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("tiki.vn-part-*.csv"):
        stale.unlink()

    written: list[Path] = []
    part_idx = 0
    current_path: Path | None = None
    current_size = 0
    current_rows = 0
    total_rows = 0

    def open_part() -> tuple[csv.writer, object]:
        nonlocal part_idx, current_path, current_size, current_rows
        part_idx += 1
        current_path = out_dir / f"tiki.vn-part-{part_idx:02d}.csv"
        f = current_path.open("w", encoding="utf-8", newline="")
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        written.append(current_path)
        current_size = 0
        current_rows = 0
        return writer, f

    with source.open("r", encoding="utf-8", newline="") as src:
        reader = csv.reader(src)
        header = next(reader)
        writer, out_file = open_part()
        writer.writerow(header)
        current_size = current_path.stat().st_size
        current_rows = 0

        for row in reader:
            writer.writerow(row)
            current_size = current_path.stat().st_size
            current_rows += 1
            total_rows += 1

            if current_size >= max_bytes:
                out_file.close()
                writer, out_file = open_part()
                writer.writerow(header)

        out_file.close()

    return written, total_rows, part_idx


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    source = root / "data" / "tiki.vn (full).csv"
    out_dir = root / "data" / "tiki.vn-split"
    max_bytes = DEFAULT_MAX_BYTES
    if len(sys.argv) > 1:
        max_bytes = int(sys.argv[1])

    if not source.exists():
        raise SystemExit(f"Source not found: {source}")

    paths, total_rows, parts = split_csv(source, out_dir, max_bytes)
    sizes = [p.stat().st_size for p in paths]

    print(f"Source: {source} ({source.stat().st_size / 1024 / 1024:.1f} MB)")
    print(f"Output: {out_dir}/ ({parts} parts, {total_rows} data rows)")
    print(f"Max part size target: {max_bytes / 1024:.0f} KB")
    print(f"Part sizes: min={min(sizes)/1024:.0f}KB max={max(sizes)/1024:.0f}KB avg={sum(sizes)/len(sizes)/1024:.0f}KB")
    for p in paths:
        print(f"  {p.name}  ({p.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
