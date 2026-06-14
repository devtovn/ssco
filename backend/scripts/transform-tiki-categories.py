#!/usr/bin/env python3
"""Normalize tiki.vn (full).csv to 15 categories + keywords column."""
import csv
import re
import sys
from pathlib import Path

SACH_TRUYEN = "Sách -Truyện"

CANONICAL = {
    SACH_TRUYEN,
    "Nhà Cửa - Đời Sống",
    "Thiết Bị Số - Phụ Kiện Số",
    "Làm Đẹp - Sức Khỏe",
    "Điện Gia Dụng",
    "Thể Thao - Dã Ngoại",
    "Bách Hóa Online",
    "Đồ Chơi - Mẹ &amp; Bé",
    "Balo và Vali",
    "Laptop - Máy Vi Tính - Linh kiện",
    "Giày - Dép nam",
    "Giày - Dép nữ",
    "Phụ kiện thời trang",
    "Ô Tô - Xe Máy - Xe Đạp",
    "Chăm sóc nhà cửa",
}

ROOT_MAP = {
    # Top-level → canonical (15 originals)
    "Nhà Sách Tiki": SACH_TRUYEN,
    "Nhà Cửa - Đời Sống": "Nhà Cửa - Đời Sống",
    "Thiết Bị Số - Phụ Kiện Số": "Thiết Bị Số - Phụ Kiện Số",
    "Làm Đẹp - Sức Khỏe": "Làm Đẹp - Sức Khỏe",
    "Điện Gia Dụng": "Điện Gia Dụng",
    "Thể Thao - Dã Ngoại": "Thể Thao - Dã Ngoại",
    "Bách Hóa Online": "Bách Hóa Online",
    "Đồ Chơi - Mẹ &amp; Bé": "Đồ Chơi - Mẹ &amp; Bé",
    "Balo và Vali": "Balo và Vali",
    "Laptop - Máy Vi Tính - Linh kiện": "Laptop - Máy Vi Tính - Linh kiện",
    "Giày - Dép nam": "Giày - Dép nam",
    "Giày - Dép nữ": "Giày - Dép nữ",
    "Phụ kiện thời trang": "Phụ kiện thời trang",
    "Ô Tô - Xe Máy - Xe Đạp": "Ô Tô - Xe Máy - Xe Đạp",
    "Chăm sóc nhà cửa": "Chăm sóc nhà cửa",
    # Other Tiki root categories → canonical
    "Túi thời trang nam": "Phụ kiện thời trang",
    "Thời trang nữ": "Phụ kiện thời trang",
    "Đồng hồ và Trang sức": "Phụ kiện thời trang",
    "Máy Ảnh - Máy Quay Phim": "Thiết Bị Số - Phụ Kiện Số",
    "Thời trang nam": "Phụ kiện thời trang",
    "Điện Tử - Điện Lạnh": "Điện Gia Dụng",
    "Túi thời trang nữ": "Phụ kiện thời trang",
    "NGON": "Bách Hóa Online",
    "Thời Trang Cho Mẹ Và Bé": "Đồ Chơi - Mẹ &amp; Bé",
    "Điện Thoại - Máy Tính Bảng": "Thiết Bị Số - Phụ Kiện Số",
    "Phụ kiện thời trang nữ": "Phụ kiện thời trang",
    "Phụ kiện thời trang nam": "Phụ kiện thời trang",
    "Túi đeo chéo, túi đeo vai nữ": "Phụ kiện thời trang",
    # Orphan leaf categories (no &gt; separator)
    "Sách tư duy - Kỹ năng sống": SACH_TRUYEN,
    "Sách doanh nhân": SACH_TRUYEN,
    "Bài học kinh doanh": SACH_TRUYEN,
    "Truyện dài": SACH_TRUYEN,
    "Sách Nấu ăn": SACH_TRUYEN,
    "Đạo đức - Kỹ năng sống": SACH_TRUYEN,
    "Sách quản trị, lãnh đạo": SACH_TRUYEN,
    "Lịch Sử Việt Nam": SACH_TRUYEN,
    "Sách Marketing - Bán hàng": SACH_TRUYEN,
    "Phê Bình - Lý Luận Văn Học": SACH_TRUYEN,
    "Sách giáo dục": SACH_TRUYEN,
    "Truyện kể cho bé": SACH_TRUYEN,
    "Dụng cụ học sinh khác": SACH_TRUYEN,
    "Bộ ga, ra, drap": "Nhà Cửa - Đời Sống",
    "Giỏ đựng quần áo": "Nhà Cửa - Đời Sống",
    "Nội thất khác": "Nhà Cửa - Đời Sống",
    "Tranh ghép": "Nhà Cửa - Đời Sống",
    "Máy cắt cỏ": "Nhà Cửa - Đời Sống",
    "Máy mài, máy cắt": "Nhà Cửa - Đời Sống",
    "Thùng đồ nghề, túi công cụ": "Nhà Cửa - Đời Sống",
    "Lĩnh vực khác": "Nhà Cửa - Đời Sống",
    "USB Wifi": "Thiết Bị Số - Phụ Kiện Số",
    "Giá Đỡ - Chân Đế Thường": "Thiết Bị Số - Phụ Kiện Số",
    "Bàn Phím Văn Phòng Không Dây": "Thiết Bị Số - Phụ Kiện Số",
    "Bộ Chuyển Đổi Không Dây": "Thiết Bị Số - Phụ Kiện Số",
    "Phụ Kiện Âm Thanh": "Thiết Bị Số - Phụ Kiện Số",
    "Dây Đeo Thay Thế, Phụ Trợ - Phụ Kiện Khác": "Thiết Bị Số - Phụ Kiện Số",
    "Đồ Chơi Công Nghệ - Thiết Bị Số và Phụ Kiện Số Khác": "Thiết Bị Số - Phụ Kiện Số",
    "Hub Chuyển Đổi USB Type-C": "Thiết Bị Số - Phụ Kiện Số",
    "Bao Da - Ốp Lưng Điện Thoại Khác": "Thiết Bị Số - Phụ Kiện Số",
    "Microphone Di Động": "Thiết Bị Số - Phụ Kiện Số",
    "Miếng Dán Màn Hình Điện Thoại": "Thiết Bị Số - Phụ Kiện Số",
    "Cáp HDMI - Displayport": "Thiết Bị Số - Phụ Kiện Số",
    "Dụng cụ vệ sinh điện thoại và máy tính bảng": "Thiết Bị Số - Phụ Kiện Số",
    "Camera IP": "Thiết Bị Số - Phụ Kiện Số",
    "Bộ Vi Xử Lý CPU": "Laptop - Máy Vi Tính - Linh kiện",
    "Mực In Màu": "Laptop - Máy Vi Tính - Linh kiện",
    "Bút Trình Chiếu": "Laptop - Máy Vi Tính - Linh kiện",
    "Máy Tính Cầm Tay": "Laptop - Máy Vi Tính - Linh kiện",
    "Phụ kiện nhà bếp khác": "Điện Gia Dụng",
    "Phụ kiện máy lọc nước": "Điện Gia Dụng",
    "Đèn khác": "Điện Gia Dụng",
    "Quạt treo tường": "Điện Gia Dụng",
    "Máy sấy quần áo": "Điện Gia Dụng",
    "Nồi cơm nắp gài": "Điện Gia Dụng",
    "Máy xay thịt": "Điện Gia Dụng",
    "Nồi tiềm, nồi nấu cháo": "Điện Gia Dụng",
    "Thiết bị đo lường khác": "Điện Gia Dụng",
    "Thức ăn cho mèo": "Bách Hóa Online",
    "Thức ăn cho cá": "Bách Hóa Online",
    "Hóa chất": "Bách Hóa Online",
    "Nước xả quần áo cho bé": "Bách Hóa Online",
    "Các loại giấy khác": "Bách Hóa Online",
    "Sáp nặn": "Đồ Chơi - Mẹ &amp; Bé",
    "Xe điều khiển và phụ kiện": "Đồ Chơi - Mẹ &amp; Bé",
    "Dép quai ngang": "Giày - Dép nam",
    "Ví nam ngang": "Phụ kiện thời trang",
    "Đồng hồ để bàn": "Phụ kiện thời trang",
    "Hộp và thùng lưu trữ": "Chăm sóc nhà cửa",
    "Thiết bị phòng tắm khác": "Chăm sóc nhà cửa",
}


def parse_keywords(raw_category: str) -> list[str]:
    raw = (raw_category or "").strip()
    if not raw:
        return []
    if " &gt; " in raw:
        return [part.strip() for part in raw.split(" &gt; ") if part.strip()]
    return [raw]


def root_of(raw_category: str) -> str:
    raw = (raw_category or "").strip()
    if " &gt; " in raw:
        return raw.split(" &gt; ", 1)[0].strip()
    return raw


def classify(raw_category: str) -> str:
    root = root_of(raw_category)
    if root in ROOT_MAP:
        return ROOT_MAP[root]
    low = raw_category.lower()
    if re.search(r"sách|book|truyện|tiểu thuyết", low):
        return SACH_TRUYEN
    if re.search(r"usb|wifi|hdmi|camera|microphone|điện thoại|màn hình|hub|âm thanh", low):
        return "Thiết Bị Số - Phụ Kiện Số"
    if re.search(r"nồi|cơm|quạt|máy sấy|máy xay|lọc nước|bếp|đèn|tủ lạnh|máy giặt", low):
        return "Điện Gia Dụng"
    if re.search(r"giày|dép|sandal", low):
        return "Giày - Dép nam" if re.search(r"nam", low) else "Giày - Dép nữ"
    if re.search(r"túi|balo|vali|ví", low):
        return "Balo và Vali" if re.search(r"balo|vali", low) else "Phụ kiện thời trang"
    raise ValueError(f"Unmapped category root: {root!r} (full: {raw_category!r})")


def format_keywords(parts: list[str]) -> str:
    return ",".join(f'"{part}"' for part in parts)


def transform(path: Path) -> None:
    tmp = path.with_suffix(".csv.tmp")
    rows_written = 0
    categories_seen: set[str] = set()

    with path.open("r", encoding="utf-8", newline="") as src, tmp.open(
        "w", encoding="utf-8", newline=""
    ) as dst:
        reader = csv.DictReader(src)
        fieldnames = list(reader.fieldnames or [])
        if "keywords" in fieldnames:
            fieldnames.remove("keywords")
        fieldnames.append("keywords")

        writer = csv.DictWriter(dst, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        writer.writeheader()

        for row in reader:
            raw_category = row.get("category", "")
            keywords_parts = parse_keywords(raw_category)
            new_category = classify(raw_category)
            categories_seen.add(new_category)

            out = {k: row[k] for k in reader.fieldnames if k != "keywords"}
            out["category"] = new_category
            out["keywords"] = format_keywords(keywords_parts)
            writer.writerow(out)
            rows_written += 1

    if categories_seen - CANONICAL:
        raise RuntimeError(f"Unexpected categories: {categories_seen - CANONICAL}")

    tmp.replace(path)
    print(f"Updated {rows_written} rows in {path}")
    print(f"Categories ({len(categories_seen)}): {sorted(categories_seen)}")


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[2] / "data" / "tiki.vn (full).csv"
    if len(sys.argv) > 1:
        target = Path(sys.argv[1])
    transform(target)
