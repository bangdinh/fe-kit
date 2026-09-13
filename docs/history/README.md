# Hồ sơ giai đoạn 1 — chuẩn hoá `camera-ai-platform`

Thư mục này là **bản sao nguyên trạng** của `camera-ai-platform/docs/fe-kit/` tại thời
điểm tách repo (2026-09-13). Nó ghi giai đoạn 1: đưa camera-ai-platform về mô hình
`b2b-gokit` (file nạp-mọi-prompt thì mỏng, chi tiết ở `docs/`, luật hành động ở
`.claude/skills/`), và những phép đo mà kit này dựa vào.

Quyết định D-004 của giai đoạn đó ghi: *"Khi kit tách repo riêng thì bê nguyên folder."*
Đây là việc đó.

**Đọc để biết vì sao, không đọc để làm theo.** Nội dung ở đây nói về
`camera-ai-platform`, không nói về kit. Quyết định còn hiệu lực của kit nằm ở
[../decisions.md](../decisions.md) và [../adr/](../adr/).

Ba phép đo từ đây mà kit dựa vào trực tiếp:

| Phép đo | Ở đâu | Kit dùng để |
|---|---|---|
| `@cap/core` thực chất là engine phân quyền, 2/13 feature dùng use-case | `decisions.md` D-003 | bỏ tầng port/use-case, chỉ giữ engine `access` |
| 5 phương ngữ API chạy song song | `progress.md` (S2) | thiết kế `Dialect` thay vì ép một envelope |
| Hợp đồng REST của gokit | `notes/gokit-contract.md` | `gokitDialect`, `Page`, 15 mã lỗi |
