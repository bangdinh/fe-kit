# Tiến độ

## 2026-09-03

Xong:
- Đọc và trích hợp đồng REST b2b-gokit → `notes/gokit-contract.md`
- Đo kiến trúc thật của camera-ai-platform (xem `decisions.md` D-003)
- Sửa 2 chỗ lỗi thời trong `AGENTS.md` (mô tả backend, bảng who-imports-what) — chưa commit
- Lập kế hoạch giai đoạn 1 → `01-plan-skills.md` — **chờ duyệt**

Kế tiếp: chốt 3 câu hỏi cuối `01-plan-skills.md`, rồi làm W3 → S1.

## 2026-09-03 (tiếp)

Chốt:
- Q1 ngôn ngữ skill: **tiếng Việt** ✓
- Q2 `SKILL.md` gốc: đo được 3 chỗ trỏ tới (`README.md:131`, `AGENTS.md:4`,
  `packages/ui/src/tokens/motion.ts:33` — chỗ này đã hỏng sẵn, bảng thật ở
  `figma-build/references/chuyen-dong.md`). Không ai phụ thuộc nội dung → xoá được,
  sửa 3 dòng trỏ. **Chưa thực hiện**, chờ làm cùng W1/W2.
- Q3 phạm vi `api-contract`: chưa chốt, để lại sau.

Xong:
- **Skill `jira`** — `.claude/skills/jira/{SKILL.md,jira.sh}`, port từ b2b-gokit,
  chỉnh theo repo: project RPA, cảnh báo nhánh không có key, chữ ký description
  `*Service:* camera-ai-platform`, trỏ tới kế hoạch S4 cho phần git-flow.
- Thêm `.jira.env` vào `.gitignore` (script đọc `./.jira.env`, trước đó chưa được ignore).

Kế tiếp: W3 (`docs/architecture.md`) → S1 (`fe-architecture`).

## 2026-09-03 (W3 + S1)

Xong:
- **W3** `docs/architecture.md` (178 dòng) — nguồn chân lý đầy đủ: cây package + chiều phụ
  thuộc đo được, hai đường dữ liệu A/B, ranh giới server/client, quy ước `features/`, vai trò
  từng file `libs/`, cấu hình môi trường, lệnh + CI, quy ước hạ tầng dễ vấp, danh sách đã gỡ.
- **S1** `.claude/skills/fe-architecture/SKILL.md` (122 dòng) — bảng "thêm gì → đặt đâu",
  thứ tự dựng feature, luật import, mục "Không bao giờ", lệnh trước khi báo xong.

Bắt được một lỗi khi tự kiểm: bản nháp S1 ghi "`actions.ts` là cửa duy nhất ra network" —
SAI. Đo lại: 4 page IAM (`groups`, `permissions`, `roles`, `structure`) fetch thẳng trong
RSC page; 3 page qua actions. Ranh giới thật: client component không import được `libs/*`
nên thứ gì client kích hoạt mới bắt buộc `'use server'`. Đã sửa cả hai file.

Kế tiếp: W1 (ép AGENTS.md xuống ~150 dòng) + W2 (xử lý SKILL.md gốc), rồi S2/S3.

## 2026-09-03 (W1 + W2)

**W1 — ép AGENTS.md 777 → 147 dòng.** Không xoá nội dung, chỉ chuyển chỗ:

| Phần cũ | Đi đâu |
|---|---|
| `@cap/core` + 3 mục phân quyền | `docs/access-control.md` (94 dòng) |
| Web rules + token antd + dnd-kit | `docs/ui-antd.md` (164) — phần "Web rules" gộp vào architecture §4 |
| Auth SSO + state machine | `docs/auth-sso.md` (48) |
| Nợ kỹ thuật + Roadmap | `docs/tech-debt.md` (80) |
| RDM Bruno sai + ba luật | `docs/device-rdm.md` (83) |
| Lõi player + WebRTC/MQTT + phiên ≠ ô lưới | `docs/livestream.md` (96) |
| Thêm code ở đâu / Key files / Quy ước | skill `fe-architecture` + `docs/architecture.md` |
| State management React Query | bỏ — đã nêu trong architecture §3 (web dùng 0 dòng) |

AGENTS.md còn: trạng thái dự án, cây package, dependency rules, luồng dữ liệu (bản đúng),
lệnh + CI, đã-gỡ, bảng "đi đâu tìm gì", ba luật không quên.

Sửa thêm 2 chỗ lỗi thời phát hiện khi chuyển:
- `kc_idp_hint = mã công ty` → sai model, mã công ty CHÍNH LÀ realm (login route đã ghi rõ).
- Bộ cookie phiên thiếu `auth_realm` (thực tế `COOKIE` có 5 khoá).

**W2 — xoá `SKILL.md` gốc**, sửa 3 chỗ trỏ:
- `README.md` → bảng tài liệu mới (architecture + 6 doc + thư mục skills)
- `AGENTS.md` → bảng "đi đâu tìm gì"
- `packages/ui/src/tokens/motion.ts:33` → trỏ về bảng THẬT ở
  `figma-build/references/chuyen-dong.md` (chỗ cũ đã hỏng từ trước)

⚠ Chưa chạy được `pnpm lint` / `type-check`: repo chưa có `node_modules`. Thay đổi code duy
nhất là một dòng comment trong `motion.ts`.

Kế tiếp: S3 `access-control` và S2 `api-contract` (nguồn đã sẵn ở `docs/`).

## 2026-09-03 (S3 + S2)

- **S3** `.claude/skills/access-control/SKILL.md` (106 dòng) — 4 sự thật nền (server là nguồn
  sự thật · ∧ nằm trong ∃ · gác UI ≠ bảo mật · AccessProfile dừng ở server), bảng chọn
  `can`/`canOn`/`requireRoute`/`requireActionOn`, 2 bước thêm trang, hai tầng UI lọc-vs-disable,
  bẫy (`access:"path"` không phải chỗ được cấp, cây đệ quy, membership cấp công ty).
- **S2** `.claude/skills/api-contract/SKILL.md` (100 dòng) — bảng **5 phương ngữ** đang tồn tại
  song song (gokit chuẩn mới + 4 legacy), chuẩn gokit để nhắm tới, bảng chọn client theo service,
  4 bước thêm endpoint, bẫy (payload biến thể null, 401 token mới, timeout bắt buộc).
  Theo D-Q3: **chỉ mô tả hợp đồng**, không bịa khuôn mẫu code của kit chưa tồn tại.
- Thêm 2 dòng vào bảng "đi đâu tìm gì" của AGENTS.md.

Còn lại: S4 `git-flow` + W4 `CONTRIBUTING.md`, S5 `ui-antd`, S6 `livestream`.

## 2026-09-03 (S4 + W4)

Đo trước khi viết — repo KHÔNG theo mô hình gokit:

| Đo | Kết quả |
|---|---|
| `git rev-list --count origin/master..origin/development` | **401** — `master` đứng yên từ 2026-07-14 |
| `develop` (không `-ment`) | bản trùng đã chết 2026-08-06 |
| merge target 19 merge gần nhất | 19/19 vào `development` |
| `git tag` | **rỗng** — không có release/SemVer ở repo này |
| commit có `[RPA-xxxx]` | 8/60 — dạng đa số là `type(scope): …` (52/60) |
| nhánh lệch chuẩn trên remote | `feature/RPA-3896-Update-API-BRM-(Member)`, `tuannva4/task`, `bugfix/uat-iam-webfirst-02092026` |

- **W4** `CONTRIBUTING.md` (112 dòng) — mô hình branch thực tế, đặt tên nhánh (kèm ví dụ ❌ lấy
  từ chính remote), commit message, checklist trước MR, bảng "đổi gì thì cập nhật doc nào",
  và §6 **Chưa thống nhất** liệt kê 3 điểm cần chốt.
- **S4** `.claude/skills/git-flow/SKILL.md` (87 dòng) — mở đầu bằng bảng so sánh gokit vs repo
  này để chặn việc bê nhầm quy trình; luật không-tự-commit; nhắc `type-check` ≠ `build`;
  gặp câu hỏi release thì nói thẳng là chưa có quy trình thay vì bịa.
- Thêm dòng git-flow vào bảng "đi đâu tìm gì" (AGENTS.md) và mục Tài liệu (README.md).

**3 điểm cần user chốt** (CONTRIBUTING §6): `master`/`develop` để làm gì · `[RPA-xxxx]` bắt
buộc hay tuỳ · ai deploy, từ nhánh nào, đánh dấu ở đâu.

Còn lại: S5 `ui-antd` (P1), S6 `livestream` (P2).

## 2026-09-03 (S5 + S6) — HOÀN TẤT GIAI ĐOẠN 1

- **S5** `.claude/skills/ui-antd/SKILL.md` (110 dòng) — thủ tục 3 bước bắt buộc trước khi dựng
  tay control, 3 thứ antd v6 không có (dựng tay là đúng), 3 bẫy đã dính (Toggle dựng tay thừa,
  sai mode biến Figma Medium/Large, ghi đè có bằng chứng thì ghi tại chỗ dùng), luật chuyển
  động, dnd-kit + 5 bẫy kéo-thả.
- **S6** `.claude/skills/livestream/SKILL.md` (110 dòng) — 4 luật lõi: mọi chỗ xem camera đi qua
  `useCameraStream` · hai cổng quyền/khả năng, thứ tự quyền→khả năng→trạng thái · chọn transport
  theo `gatewayId` chứ không theo cờ · phiên thuộc pool chứ không thuộc ô lưới.
- Cập nhật bảng trỏ ở `AGENTS.md` + `README.md`. Kiểm frontmatter cả 12 skill: hợp lệ.

**Giai đoạn 1 xong 11/11.** Repo giờ có 12 skill (7 mới + 5 figma), `AGENTS.md` 148 dòng
(từ 777), 7 doc chi tiết trong `docs/`, `CONTRIBUTING.md`.

Chưa làm / chờ user:
- 3 câu ở `CONTRIBUTING.md` §6 (`master`/`develop`, `[RPA-xxxx]`, release).
- Chưa chạy được `pnpm lint`/`type-check` (repo chưa có `node_modules`).
- Chưa commit.
- Thử skill trong phiên mới xem có nạp đúng không (tiêu chí done cuối của `01-plan-skills.md`).

Kế tiếp: **giai đoạn 2 — FE kit**.

## 2026-09-03 (tối ưu context — có tra tài liệu chính thức)

Tra https://code.claude.com/docs/en/memory và /docs/en/skills trước khi quyết. Ba phát hiện
lật giả định (chi tiết + trích dẫn ở `decisions.md` D-005..D-007):

1. **Claude Code không đọc `AGENTS.md`**, và `[AGENTS.md](AGENTS.md)` không phải import ⇒
   hướng dẫn chưa bao giờ tự nạp. Đã sửa `CLAUDE.md` thành `@AGENTS.md` + phần riêng cho Claude.
2. **Skill listing có budget ký tự** (1% ctx), 12 description = 4.101 vượt 2.000; khi vượt nó
   bỏ description của skill ít gọi nhất = đúng 7 skill mới. Đã cắt description (còn 2.830 tổng)
   và đặt `skillListingBudgetFraction: 0.02` ở `.claude/settings.json` (mới).
3. **AGENTS.md 149 → 76 dòng** theo đúng tiêu chí trim của `/doctor`; giữ bảng 10 package nén.

Cần kiểm trong phiên mới: `/context` (CLAUDE.md dưới Memory files, hàng Skills) và `/doctor`.

Repo đã được di chuyển sang `01.webfirst/camera-ai-platform`; toàn bộ file còn nguyên và đang staged.

## 2026-09-03 (kiểm chứng bằng /context + /doctor)

**Import hoạt động.** `/context` → Memory files: `CLAUDE.md: 159 tokens`, `AGENTS.md: 1.8k tokens`.
Trước bản sửa, `AGENTS.md` không xuất hiện ở đây (markdown link không phải import).

**Skill listing KHÔNG overflow** — máy chạy Opus 4.8 ctx **1M** ⇒ budget 1% = 10.000 ký tự,
ta ở 2.830. Hàng Skills = 2,6k token: 12 project skill ~1,03k (70–110 token/cái) + 15 built-in
skill ~1,6k. Kết luận "vượt gấp đôi" trước đó chỉ đúng nếu chạy model ctx 200k → đã sửa D-006.

**Chi phí thật của cả đợt tối ưu**: Memory 2k + Skills 2,6k trên tổng 23,7k/1M (2%). Nghĩa là
phần thắng về token là nhỏ; phần thắng thật là **sửa bug import** (777 dòng hướng dẫn trước đây
không vào context) và cấu trúc lại doc cho người + Cursor/Codex đọc.

**Claude Code đang là 2.1.197**, stable 2.1.236, latest 2.1.259. Tính năng `/doctor` đề xuất
trim CLAUDE.md cần **≥ 2.1.206** nên chưa có ở bản này — nâng version sẽ có.

## 2026-09-03 (chốt A/B import)

4 phiên, thứ tự import → gốc → gốc → import, kết quả nhất quán: markdown link không nạp
`AGENTS.md`, `@AGENTS.md` thì nạp (`CLAUDE.md: 159` + `AGENTS.md: 1.8k`). Chi tiết ở D-005.

Hiệu chỉnh đơn vị đo: `/context` cho AGENTS.md 3.534 ký tự = 1.8k token ⇒ **~1,96 ký tự/token**
với văn bản tiếng Việt có dấu, không phải ~3,5 như đã ước trong các tính toán trước. Nghĩa là
bản AGENTS.md 777 dòng (55.838 ký tự) tốn ~28k token — với Claude Code thì bằng 0 vì không nạp
được, nhưng với Cursor/Codex (đọc AGENTS.md native) thì họ đã trả 28k mỗi prompt, giờ còn 1,8k.

## 2026-09-03 (test skill jira + siết luật đo)

Test toàn bộ lệnh `jira.sh` trên dữ liệu thật: `me` `whoami` `key` `view` `sprints`
`transitions` `story` `subtask` `sprint` `describe` `comment` `transition` `summary` `point`
— chạy đúng. Chưa test `worklog` (cần giờ thật của user) và `task` (sẽ đẻ ticket rác).
Audit mã thoát: 7 đường lỗi đều rc≠0 kèm thông báo đọc được, 3 đường thành công rc=0.

Phát hiện: workflow project đặt tên transition **tiếng Việt** (`Bắt đầu task`,
`SubTask hoàn thành`, `SubBug chờ review`, `Pending -> change`) — KHÔNG có
`In Progress`/`In Review`, và danh sách đổi theo trạng thái hiện tại. Đã sửa 6 chỗ trong
skill `jira`, skill `git-flow`, `CONTRIBUTING.md`; thêm mục "Tên transition — ĐỌC, đừng đoán".

Hai lần tự kết luận sai vì đo hỏng → xem D-008; đã siết luật 1 của `AGENTS.md`.

Sửa bug `jira.sh key` im lặng ở **b2b-gokit**: cả bản repo lẫn bản template scaffold
(`cmd/scaffold/templates/...`), đã `go build` + `go test ./cmd/scaffold/` xanh. Chưa commit.

## 2026-09-04 — rà soát tổng thể agents/skills (workflow 7 góc)

Workflow `review-agents-skills`: 7 reviewer độc lập trên 49 file → 115 phát hiện.
**272 agent phản biện + tổng hợp chết vì hết session limit** ⇒ `confirmed: 0` là artifact.
Tự kiểm lại bằng lệnh, áp **15 lỗi** (commit `90e3e47`, 17 file).

Nặng nhất là 4 lỗi "hàng rào tưởng chặt": cổng `figma-build` luôn trả rỗng vì `awk NR==FNR`;
hook khuyên `--amend` khiến nhét file vào commit TRƯỚC; luật ≥10 ký tự đổi nghĩa theo locale;
`jira.sh worklog` không comment chết im lặng. Chi tiết + 73 phát hiện chưa xử lý:
`handoff-2026-09-04.md` · dữ liệu thô: `notes/review-2026-09-04-findings.json`.

3 finding của reviewer bị mình kiểm ra là SAI (fail-open python3, link AUDIT chết,
`transition` rc=0) — ghi lại trong handoff §2 để không ai "sửa" lại.
