# Giai đoạn 1 — Kế hoạch chuẩn hoá skill cho camera-ai-platform

Trạng thái: **XONG 11/11** (2026-09-03) · chi tiết từng bước ở `progress.md`

## Vấn đề đo được

| | b2b-gokit | camera-ai-platform |
|---|---|---|
| File nạp mọi prompt | `CLAUDE.md` 105 dòng | `AGENTS.md` **777 dòng** (qua `CLAUDE.md` 5 dòng) |
| Chi tiết | `docs/` 21 file / 3769 dòng | `docs/` chủ yếu là plan & spec cũ |
| Skill hành động | 2 (`api-standard`, `git-flow`) | 5 nhưng **toàn bộ về Figma** |
| Quick reference | (không có, dùng skill) | `SKILL.md` 246 dòng ở gốc, KHÔNG đúng format skill |

Ba hệ quả thấy được ngay trong repo:

- **AGENTS.md có chỗ sai mà không ai phát hiện** — đã sửa 2026-09-03: mô tả "chưa có backend"
  và bảng "Who imports what (verified against package.json)" thiếu 4 package (`auth`, `brm`,
  `config`, `logger`) — đúng 4 package gánh toàn bộ SSO + IAM. Tài liệu càng dài càng khó soi.
- **`SKILL.md` dạy đường đã chết** — công thức "Thêm data domain mới" bảo đi qua
  `ports/` + `use-cases/`, trong khi đo được chỉ 2/13 feature còn đi đường đó
  (`camera`, `devices`); 11 feature còn lại đi `actions.ts` → client trong `libs/`.
- **Không có skill nào cho việc hằng ngày** — kiến trúc, hợp đồng API, phân quyền, git.
  Agent phải đọc 777 dòng rồi tự đoán.

## Nguyên tắc (mượn thẳng từ gokit)

1. File nạp-mọi-prompt phải **mỏng**: chỉ fact chống-đoán-sai. Chi tiết xuống `docs/`.
2. Skill = **checklist để hành động đúng ngay**, không phải bài giảng. Mỗi skill trỏ về một
   nguồn chân lý đầy đủ trong `docs/`.
3. `description` của skill phải ghi rõ **khi nào kích hoạt** (câu/từ khoá thật mà người dùng gõ),
   vì đó là thứ quyết định skill có được nạp hay không.
4. Skill chỉ nói **thứ đo được từ source**. Không nói "nên", nói "repo này làm thế này, ở file này".

## Skill đề xuất

Sáu skill, đánh số theo thứ tự làm. Cột "nguồn" = nội dung lấy từ đâu (số dòng theo AGENTS.md hiện tại).

| # | Skill | Kích hoạt khi | Nguồn | Ưu tiên |
|---|---|---|---|---|
| S1 | `fe-architecture` | "thêm feature", "để code này ở đâu", "import package nào", "tách file", bất kỳ việc thêm code nào | AGENTS.md 22–99 (kiến trúc, dependency rules, luồng dữ liệu), 432–487 (đặt code ở đâu, key files), + kết quả đo đường-thật-vs-đường-giấy | **P0** |
| S2 | `api-contract` | "gọi API", "endpoint mới", "envelope", "lỗi 4xx", "phân trang", "map dữ liệu BE" | `notes/gokit-contract.md` + `packages/config/src/environments.ts` + bảng 3 phương ngữ legacy | **P0** |
| S3 | `access-control` | "phân quyền", "gác trang", "ẩn nút", "role", "scope", "license" | AGENTS.md 121–213 | **P0** |
| S4 | `git-flow` | "tạo nhánh", "commit", "MR", "release" | Port từ `b2b-gokit/.claude/skills/git-flow` + convention thật của repo (nhánh `development`, commit `feat(iam): …`, Jira RPA) | P1 |
| S5 | `ui-antd` | "dựng component", "màu", "spacing", "modal", "table", "kéo thả" | AGENTS.md 229–384 | P1 |
| S6 | `livestream` | "live", "playback", "WebRTC", "HLS", "ô lưới", "PTZ" | AGENTS.md 606–776 (RDM traps, lõi player, WebRTC qua MQTT, phiên không thuộc ô lưới) | P2 |

Đã có, giữ nguyên: 5 skill `figma-*`. S5 phải trỏ sang `figma-build` chứ không lặp lại nội dung.

## Việc kèm theo (không phải skill nhưng cùng gói)

| # | Việc | Chi tiết |
|---|---|---|
| W1 | **Ép `AGENTS.md` xuống ≈150 dòng** | Giữ: trạng thái dự án, sơ đồ kiến trúc, dependency rules, bảng "đi đâu tìm gì", lệnh, danh sách skill. Chuyển phần còn lại vào skill (S1–S6) hoặc `docs/`. Mục tiêu là số dòng, vì đây là chi phí trả mỗi prompt. |
| W2 | **Xoá hoặc viết lại `SKILL.md` gốc** | Nó không đúng format skill và dạy đường đã chết. Đề xuất: xoá, nội dung còn giá trị (lệnh nhanh, package→folder) nhập vào AGENTS.md; công thức "thêm domain" viết lại trong S1 theo đường thật. |
| W3 | **`docs/architecture.md`** | Nguồn chân lý đầy đủ cho S1 — chỗ chứa phần chi tiết bị cắt khỏi AGENTS.md, giống `b2b-gokit/docs/`. |
| W4 | **`CONTRIBUTING.md`** | Repo chưa có. S4 cần một nguồn chân lý để trỏ về, như gokit. |

## Thứ tự triển khai

```
W3 (docs/architecture.md)  →  S1  →  W1 (ép AGENTS.md)  →  W2 (xử lý SKILL.md)
S2  →  S3                     (song song được với nhánh trên, không đụng cùng file)
S4 + W4  →  S5  →  S6
```

Lý do: S1 và W1 đụng cùng nội dung nên phải đi liền; S2/S3 độc lập file nên làm song song được.

## Tiêu chí done cho mỗi skill

- [ ] Có frontmatter `name` + `description` nêu rõ trigger bằng từ khoá người dùng thật gõ.
- [ ] ≤ 120 dòng. Dài hơn = phải tách phần tham chiếu ra `references/`.
- [ ] Mọi khẳng định về code kiểm được: có đường dẫn file, hoặc lệnh grep tái lập được.
- [ ] Có mục "Không bao giờ" — cấm đoán, giống `git-flow` của gokit.
- [ ] Không lặp nội dung skill khác; chỗ giao nhau thì trỏ tên skill kia.
- [ ] Thử thật: hỏi một câu điển hình trong phiên mới, xem skill có được nạp và có đủ để làm đúng không.

## Câu cần chốt trước khi code

1. **Ngôn ngữ skill**: gokit dùng tiếng Anh cho `api-standard`, tiếng Việt cho `git-flow`.
   Repo này AGENTS.md tiếng Việt. Đề xuất: **tiếng Việt toàn bộ**, giữ nguyên thuật ngữ Anh.
2. **`SKILL.md` gốc**: xoá hẳn hay giữ làm index trỏ tới các skill? Đề xuất: **xoá**.
3. **Phạm vi S2**: chỉ mô tả hợp đồng (đọc-hiểu), hay kèm luôn khuôn mẫu code của FE kit
   (`unwrapData`, `ApiError`…)? Đề xuất: **giai đoạn 1 chỉ hợp đồng**; khuôn mẫu code chờ
   giai đoạn 2 khi kit có hình hài, tránh viết skill cho thứ chưa tồn tại.
