# GSMArena → Database Field Mapping

Tài liệu này mô tả toàn bộ field crawl từ GSMArena và cách lưu vào DB.  
Tham khảo từ 3 thiết bị: Galaxy Z Flip7 (mobile), Tab A11+ (tablet), Galaxy Watch8 (smartwatch).

---

## Legend

| Ký hiệu | Ý nghĩa |
|---|---|
| ✓ OK | Lưu đúng, không cần sửa |
| ⚠ Fixed | Đã fix (cần re-crawl để populate lại data) |
| — Mất | Không lưu (orphan không có col, hoặc chủ động bỏ qua) |

---

## NETWORK → `gadget_network`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| Technology | `technology` | technology | ✓ | ✓ | ✓ | ✓ OK |
| 2G bands | `2g_bands` | bands_2g | ✓ | ✓ | ✓ | ⚠ alias added |
| 3G bands | `3g_bands` | bands_3g | ✓ | ✓ | ✓ | ⚠ alias added |
| 4G bands | `4g_bands` | bands_4g | ✓ | ✓ | ✓ | ⚠ alias added |
| 5G bands | `5g_bands` | bands_5g | ✓ | ✓ | N/A | ⚠ alias added |
| Speed | `speed` | speed | ✓ | ✓ | ✓ | ✓ OK |

> **Ghi chú:** GSMArena crawl label "2G bands" → key `2g_bands`, nhưng SPEC_WRITERS trước đó expect `bands_2g`. Đã thêm alias cho cả 4 band.

---

## LAUNCH → `gadget_launch`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| Announced | `announced` | announced | ✓ | ✓ | ✓ | ✓ OK |
| Status | `status` | status | ✓ | ✓ | ✓ | ✓ OK |

---

## BODY → `gadget_body`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| Dimensions | `dimensions` | dimensions | ✓ | ✓ | ✓ | ✓ OK |
| Weight | `weight` | weight_grams | ✓ | ✓ | ✓ | ✓ OK (parseGrams) |
| Build | `build` | build | ✓ | N/A | ✓ | ✓ OK |
| SIM | `sim` | sim | ✓ | ✓ | ✓ (eSIM) | ✓ OK |
| *(orphan) IP rating* | regex từ `_extra` | water_resistance | IP48 | — | IP68 | ⚠ Fixed |
| *(orphan) MIL-STD / ECG / BP* | phần còn lại của `_extra` | build (append) | — | — | MIL-STD-810H, ECG... | ⚠ Fixed |

> **Ghi chú Watch:** Body orphan row tách riêng: phần khớp `IP\d+...` → `water_resistance`, phần còn lại (MIL-STD-810H, ECG certified, Blood pressure) → append vào `build`.

---

## DISPLAY → `gadget_display`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| Type | `type` | type | ✓ AMOLED | ✓ TFT LCD | ✓ Super AMOLED | ✓ OK |
| Size | `size` | size_inches | ✓ 6.9" | ✓ 11.0" | ✓ 1.47" | ✓ OK |
| Resolution | `resolution` | resolution | ✓ | ✓ | ✓ 480x480 | ✓ OK |
| Protection | `protection` | protection | ✓ | ✓ | ✓ Sapphire | ✓ OK |
| *(embedded in Type)* | — | refresh_rate_hz | 120Hz | 90Hz | — | ⚠ post-process từ type text |
| *(embedded in Resolution)* | — | ppi | ~397 | ~206 | ~327 | ⚠ post-process từ resolution |
| *(orphan) Cover display* | `_extra` | cover_display | Z Flip7 only | — | — | ⚠ new column |

> **Ghi chú:** GSMArena không có row riêng cho refresh rate hay ppi — đều embedded trong text của Type và Resolution. Crawler post-process bằng regex.

---

## PLATFORM → `gadget_platform`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| OS | `os` | os | ✓ | ✓ | ✓ Wear OS 6 | ✓ OK |
| Chipset | `chipset` | chipset | ✓ | ✓ | ✓ Exynos W1000 | ✓ OK |
| CPU | `cpu` | cpu | ✓ | ✓ | ✓ | ✓ OK |
| GPU | `gpu` | gpu | ✓ | ✓ | ✓ | ✓ OK |

---

## MEMORY → `gadget_memory`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| Card slot | `card_slot` | card_slot | No | microSDXC | No | ✓ OK |
| Internal | `internal` | internal | 256GB 12GB RAM | 128GB 6GB RAM | 32GB 2GB RAM | ✓ OK (raw text) |
| *(orphan) UFS/eMMC* | `_extra` | storage_type | UFS 4.0 | — | — | ⚠ orphan→_extra |

> **Ghi chú:** RAM được parse bằng regex `(\d+)\s*GB\s*RAM` từ field `internal`. Tablet và Watch không có orphan UFS row.

---

## MAIN CAMERA → `gadget_main_camera`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| Dual / Triple / Quad | `dual`/`triple`/`quad` | modules | ✓ 50MP+12MP | — | — | ⚠ alias added |
| Single | `single` | modules | — | ✓ 8MP | — | ⚠ alias added |
| *(parse từ modules)* | — | megapixels_main | 50 MP | 8 MP | — | ⚠ post-process |
| *(parse từ modules)* | — | aperture_main | f/1.8 | — | — | ⚠ post-process |
| Features | `features` | features | ✓ | — | — | ✓ OK |
| Video | `video` | video | ✓ 4K@60fps | ✓ 1080p@30fps | — | ✓ OK |
| *(Watch: Camera = "No")* | skipped | — | — | — | Watch | ⚠ Fixed (filter "No") |

> **Ghi chú:** GSMArena dùng label "Dual"/"Triple"/"Single" thay vì "specs"/"modules" như SPEC_WRITERS cũ expect. Watch8 có section Camera với orphan value "No" — crawler giờ skip orphan có value `"No"`.

---

## SELFIE CAMERA → `gadget_selfie_camera`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| Single / Dual | `single`/`dual` | modules | ✓ 10MP | ✓ 5MP | — | ⚠ alias added |
| *(parse từ modules)* | — | megapixels | 10 MP | 5 MP | — | ⚠ post-process |
| Features | `features` | features | ✓ HDR | — | — | ✓ OK |
| Video | `video` | video | ✓ 4K@30fps | ✓ 1080p@30fps | — | ✓ OK |

---

## SOUND → `gadget_sound`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| Loudspeaker | `loudspeaker` | loudspeaker | ✓ Stereo | ✓ 4 speakers | ✓ Yes | ✓ OK |
| *(parse: stereo)* | — | has_stereo | true | true | false | ⚠ post-process |
| 3.5mm jack | `3_5mm_jack` | jack_3_5mm | ✓ No | ✓ Yes | ✓ No | ✓ OK |
| *(parse: Yes/No)* | — | has_jack | false | true | false | ⚠ post-process |
| *(orphan) 32-bit/384kHz* | `_extra` | audio_info | Z Flip7 | — | — | ⚠ new column |

---

## COMMS → `gadget_comms`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| WLAN | `wlan` | wlan | ✓ Wi-Fi 7 | ✓ Wi-Fi 5 | ✓ Wi-Fi 4 | ✓ OK |
| Bluetooth | `bluetooth` | bluetooth | ✓ 5.4 | ✓ 5.3 | ✓ 5.3 | ✓ OK |
| *(parse: version)* | — | bt_version | 5.4 | 5.3 | 5.3 | ⚠ parseFloat từ bluetooth text |
| Positioning | `positioning` | positioning | ✓ | ✓ | ✓ GPS L1+L5 | ✓ OK |
| NFC | `nfc` | nfc | ✓ Yes | ✓ No | ✓ Yes | ✓ OK |
| *(parse: Yes/No)* | — | has_nfc | true | false | true | ⚠ post-process |
| Radio | `radio` | radio | ✓ No | ✓ No | ✓ No | ✓ OK |
| USB | `usb` | usb | ✓ USB-C 3.2 | ✓ USB-C 2.0 | ✓ No | ✓ OK |

---

## FEATURES → `gadget_features`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| Sensors | `sensors` | sensors | ✓ Fingerprint, gyro... | ✓ Accel, gyro... | ✓ HR, SpO2, temp, BP... | ✓ OK |
| *(orphan) Samsung DeX* | `_extra` | — | Z Flip7 | Tab A11+ | — | — không có col |

---

## BATTERY → `gadget_battery`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| Type ("Li-Po/Li-Ion Xmah") | `type` | type + capacity_mah | 4300 mAh | 7040 mAh | 435 mAh | ⚠ parseMah từ type field |
| Charging | `charging` | charging | ✓ | ✓ 25W wired | ✓ 10W wireless | ✓ OK |
| *(parse: wired W)* | — | charging_wired_w | 25W | 25W | — (wireless only) | ⚠ post-process |
| *(parse: wireless W)* | — | wireless_w + has_wireless | 15W | — | 10W | ⚠ post-process |
| *(parse: reverse)* | — | has_reverse | 4.5W | — | — | ⚠ post-process |

> **Ghi chú:** `parseMah` handle cả prefix "Li-Po" và "Li-Ion". Watch chỉ có wireless charging — `charging_wired_w` = null, `wireless_w` = 10, `has_wireless` = true.

---

## MISC → `gadget_misc`

| GSMArena Label | Crawler key | DB Field | Mobile | Tablet | Watch | Status |
|---|---|---|---|---|---|---|
| Colors | `colors` | colors | ✓ | ✓ | ✓ | ✓ OK |
| Models | `models` | models | ✓ | ✓ | ✓ | ✓ OK |
| SAR | `sar` | sar_us | ✓ | ✓ | N/A | ⚠ alias added (`sar`→`sar_us`) |
| SAR EU | `sar_eu` | sar_eu | ✓ | ✓ | ✓ | ✓ OK |
| Price | `price` | price_usd | ✓ | ✓ | ✓ | ✓ OK |

---

## TESTS (Our Tests) — ~~`gadget_tests`~~ ĐÃ DROP

Section này **không lưu** — table `gadget_tests` đã bị drop.  
GSMArena có test scores (AnTuTu, LUFS, battery hours) nhưng chủ động bỏ qua.

---

## EU LABEL — Không lưu

Section "EU LABEL" không có trong `SECTION_MAP` và **chủ động bỏ qua**.  
Rows (Energy class, Battery endurance, Free fall, Repairability) không được lưu vào DB.

---

## Tóm tắt quyết định

| # | Vấn đề | Quyết định |
|---|---|---|
| 1 | EU LABEL | ❌ Không lưu |
| 2 | Watch Camera = "No" | ✅ Fixed — crawler skip orphan value "No" |
| 3 | Watch body orphan (IP68+ECG+BP) | ✅ Fixed — IP→water_resistance, còn lại→build |
| 4 | TESTS (AnTuTu, LUFS...) | ❌ Drop table, không lưu |
| 5 | Samsung DeX (orphan features) | ❌ Không lưu (không có col) |
| 6 | bt_version parse từ "5.4, A2DP, LE" | ✅ parseFloat lấy số đầu — đúng |

---

## Luồng xử lý tổng thể

```
GSMArena HTML
  │
  ├─ Crawler: .ttl + .nfo → specs[section][key] = value
  │          orphan row (.nfo only, value ≠ "No"):
  │            body section → IP regex → water_resistance; rest → build
  │            other sections → specs[section]['_extra'] += value
  │
  ├─ SPEC_WRITERS: specs[section][specKey] → INSERT INTO table (dbCol)
  │   - Alias keys: 2g_bands/bands_2g, dual/modules, sar/sar_us...
  │   - Last-writer-wins nếu cùng dbCol
  │
  ├─ Post-processing (upsertSpecTables):
  │   - display.type → extract refresh_rate_hz
  │   - display.resolution → extract ppi
  │   - main_camera.dual → extract megapixels_main, aperture_main
  │   - memory.internal → extract storage_type (UFS/eMMC)
  │   - battery.charging → extract wired_w, wireless_w, has_wireless, has_reverse
  │   - sound.loudspeaker → extract has_stereo
  │   - sound.3_5mm_jack → extract has_jack
  │   - comms.nfc → extract has_nfc
  │
  └─ SPEC_READERS: SELECT * FROM table → specs[section][specKey] = formatted value
```

---

*Cập nhật lần cuối: 2026-06-06 — drop gadget_tests, fix Watch orphan, filter "No"*
