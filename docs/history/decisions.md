# Quyết định

Ghi theo thứ tự thời gian. Mỗi mục: bối cảnh → chốt gì → vì sao.

## D-001 · Tài liệu repo đã từng lệch thực tế (2026-09-03)

`AGENTS.md` mô tả "Chưa có backend — data layer là giả định" trong khi repo đã gọi thật
BRM-V2 / IAM-V2 / CMI / media-manager ở beta; bảng "Who imports what (**verified against
package.json**)" thiếu `@cap/auth`, `@cap/brm`, `@cap/config`, `@cap/logger` ở `apps/web`.

→ Đã sửa cả hai. Rút ra: **nhãn "verified" không thay được việc đo lại**. Mọi skill viết ra
phải kèm cách kiểm chứng, và phải rà lại theo định kỳ.

## D-002 · Backend không nằm trong repo này (2026-09-03)

BE là source riêng (Go, base `b2b-gokit`), sau b2b api-gateway. Tầng Node của web
(route handler, Server Action, middleware) là **BFF**: giữ `client_secret` OIDC, quản cookie
phiên, map payload → view-model. Không có state nghiệp vụ.

→ FE kit thiết kế theo hợp đồng REST của gokit, không tự định nghĩa hợp đồng riêng.

## D-003 · Kiến trúc thật khác kiến trúc trên giấy (2026-09-03)

Đo được: `@cap/hooks` và React Query **0 dòng** trong `apps/web`; 2/13 feature dùng use-case
của `@cap/core` (`camera`, `devices`). Con số "11/13 đi thẳng client" ghi ngày 09-03 là **SAI**
— đo lại 09-04 theo từng feature: **8** gọi client backend (access company devices events iam
places playback video), auth fetch tay tới iam-v2, còn alerts/live/search chưa nối BE;
~12/15 import từ core là access-related.

→ `@cap/core` trên thực tế là **engine phân quyền dùng chung**, không phải domain layer đầy đủ.
Phần `ports/` + use-case passthrough là di tích. Chưa chốt xử lý (hướng A/B/C) — xem
`01-plan-skills.md` không bao gồm việc này; sẽ quyết ở giai đoạn 2.

## D-004 · Folder làm việc (2026-09-03)

Chọn `docs/fe-kit/` trong chính repo camera-ai-platform, không phải folder ngoài repo, để
kế hoạch được version cùng source và review cùng MR. Khi kit tách repo riêng thì bê nguyên folder.

## D-005 · `CLAUDE.md` chưa bao giờ nạp được `AGENTS.md` (2026-09-03)

Tài liệu chính thức: *"Claude Code reads `CLAUDE.md`, not `AGENTS.md`."*
(https://code.claude.com/docs/en/memory §AGENTS.md)

`CLAUDE.md` cũ viết `[AGENTS.md](AGENTS.md)` — đó là **markdown link**, không phải cú pháp
import `@AGENTS.md`. Cộng với việc Claude Code không đọc `AGENTS.md` native ⇒ 777 dòng
hướng dẫn **chưa bao giờ vào context tự động** trong Claude Code; agent chỉ thấy nếu tự
`Read`. Cursor/Codex thì có đọc `AGENTS.md` native nên với hai tool đó nó vẫn hoạt động.

→ Chọn **import `@AGENTS.md`** thay vì symlink. Tài liệu nêu cả hai cách và ghi rõ:
*"On Windows, creating a symlink requires Administrator privileges or Developer Mode, so use
the `@AGENTS.md` import instead."* Repo có người dùng Windows ⇒ import an toàn hơn, lại cho
phép thêm phần riêng cho Claude bên dưới.

**ĐÃ TEST A/B 2026-09-03** trên Claude Code 2.1.197, Opus 4.8 (1M ctx). Hai phiên riêng,
chỉ khác nội dung `CLAUDE.md`, đọc `/context` → mục **Memory files**:

| `CLAUDE.md` chứa | Memory files |
|---|---|
| `[AGENTS.md](AGENTS.md)` (markdown link, bản gốc) | `CLAUDE.md: 133 tokens` — **KHÔNG có AGENTS.md** |
| `@AGENTS.md` (import) | `CLAUDE.md: 159 tokens` + **`AGENTS.md: 1.8k tokens`** |

Lặp lại 4 phiên để loại nhiễu (thứ tự: import → gốc → gốc → import), kết quả nhất quán tuyệt
đối. Lần cuối chạy trên Opus 5 (1M ctx) cho đúng con số `CLAUDE.md: 159` + `AGENTS.md: 1.8k`.

Kết luận đo được, không phải suy từ tài liệu: markdown link KHÔNG nạp gì, `@` import thì nạp.
Chốt dùng import.

⚠ Khi test lại: `/context` phản ánh trạng thái **lúc phiên khởi động**. Sửa `CLAUDE.md` rồi gõ
`/context` trong phiên đang chạy sẽ ra số cũ — phải thoát và mở phiên mới.

## D-006 · Skill listing có budget ký tự — 12 skill đã vượt (2026-09-03)

Tài liệu: *"Claude Code loads a listing of skill names and descriptions into context… if you
have many skills, Claude Code shortens descriptions to fit the listing's character budget…
The budget scales at 1% of the model's context window. When the listing overflows, Claude Code
drops descriptions starting with the skills you invoke least."*

Đo: 12 description = **4.101 ký tự**. Budget 1% của ctx 200k = 2.000 ⇒ vượt hơn gấp đôi
**NẾU** chạy model ctx 200k.
Nguy hiểm ở chỗ nó bỏ description của skill **ít được gọi nhất** — tức đúng 7 skill vừa tạo
(chưa ai gọi) sẽ mất description và **không tự kích hoạt được nữa**.

Đây là bản sửa cho khẳng định sai trước đó ("12 skill là còn thoải mái"): chi phí thật của
nhiều skill KHÔNG phải token tổng, mà là **budget của listing**.

→ Làm hai việc: cắt description 7 skill mới (2.829 → 1.558 ký tự, tổng 12 cái còn 2.830),
và đặt `skillListingBudgetFraction: 0.02` trong `.claude/settings.json` (mới).

### ⚠ ĐO THẬT 2026-09-03 — không hề vượt trên máy hiện tại

`/context` trên máy user: **Opus 4.8, ctx 1M** ⇒ budget 1% = **10.000 ký tự**, ta ở 2.830.
Hàng Skills báo **2,6k token** (12 project skill ~70–110 token mỗi cái = ~1,03k; 15 built-in
skill = ~1,6k). **Không có overflow.**

Nên phần "đã vượt gấp đôi" ở trên chỉ đúng với model ctx 200k, không đúng với setup đang chạy.
Hai việc đã làm vẫn giữ, nhưng lý do đổi:
- **Cắt description**: không phải sửa lỗi overflow, chỉ là giảm listing + trigger gọn hơn.
- **`skillListingBudgetFraction: 0.02`**: giữ như **lưới an toàn cho đồng đội** chạy model
  ctx 200k (ở đó 2.830 > 2.000 sẽ overflow, và skill ít gọi nhất — tức 7 skill mới — mất
  description trước). Trên ctx 1M nó là no-op.

Bài học: budget là **1% của context window của model đang chạy**, nên kết luận "vượt/không
vượt" phải kèm model. Đừng lấy 200k làm mặc định.

## D-007 · Cắt gì khỏi AGENTS.md — theo tiêu chí của `/doctor` (2026-09-03)

Tài liệu mô tả tiêu chí trim của `/doctor`: *"cuts content Claude can derive from the codebase,
such as directory layouts, dependency lists, and architecture overviews, and keeps pitfalls,
rationale, and conventions that differ from tool defaults."*

Theo đúng tiêu chí đó: bỏ cây thư mục ASCII, bảng "who imports what", 5 dòng ✓ dependency;
giữ 5 fact chống-đoán-sai, 6 điều cấm, bẫy `type-check` ≠ `build`, ba luật.
Giữ lại **bảng 10 package dạng nén** (12 dòng) vì nó chặn lỗi tốn nhất: dựng lại thứ đã có
(`logger`, `api-client`) do không biết package tồn tại — bảng "thêm gì đặt đâu" của skill chỉ
nêu 6/10 package.

AGENTS.md: 149 → **76 dòng** (7.505 → 3.534 ký tự). Mục tiêu tài liệu nêu là <200 dòng.

## D-008 · Hai lần kết luận "có bug" từ phép đo hỏng (2026-09-03)

Trong một phiên, hai lần khẳng định sai vì đo sai chứ không phải code sai:

| Kết luận sai | Nguyên nhân | Sự thật |
|---|---|---|
| "Message tiếng Việt dài 84 ký tự" | `${#SUBJECT}` của bash đếm **byte**; tiếng Việt 2–3 byte/chữ | 72 ký tự. Ngưỡng hook và số đo p50/p90 đều phải tính lại (p50 69, không phải 71) |
| "`jira.sh transition` báo lỗi mà trả rc=0" | chạy `cmd \| head` nên `$?` là của `head` | rc=1, đúng. Không có bug, không sửa gì |

Đối chiếu với **bug thật** (`jira.sh key` im lặng exit 1): nó tái lập được nhất quán VÀ giải
thích được bằng source (`set -e` + `pipefail` cắt trước nhánh `else`). Đó là hai điều kiện để
gọi là bug.

→ Bổ sung vào `AGENTS.md` luật 1: đo xong phải kiểm lại chính phép đo trước khi kết luận.
