@AGENTS.md

## Claude Code

Chi tiết theo chủ đề ở `docs/`; luật để hành động ở `.claude/skills/` (skill tự kích hoạt
theo việc, body chỉ nạp khi dùng). `AGENTS.md` ở trên là nội dung dùng chung cho mọi agent
(Cursor, Codex, Copilot) — sửa ở đó, đừng nhân bản vào đây.

`@AGENTS.md` là cú pháp **import**, không phải markdown link. Đo được ở giai đoạn 1
(`docs/history/decisions.md` D-005): viết `[AGENTS.md](AGENTS.md)` thì Claude Code **không
nạp gì cả** — 777 dòng hướng dẫn chưa bao giờ vào context. Đừng đổi dòng trên thành link.
