---
name: git-flow
description: Dùng khi tạo nhánh, viết commit, chuẩn bị MR hoặc cắt release trong repo fe-kit. Trigger khi "tạo nhánh", "commit", "message commit", "MR", "PR", "release", "tag".
---

# Git flow

## Nhánh

```
<type>/<mô-tả-ngắn>        feat/http-retry-policy · fix/cookie-offline-token · docs/adr-0006
```

Chữ thường, gạch ngang. Có mã ticket thì đặt ngay sau type: `feat/ABC-123-order-list`.

## Commit

```
<type>(<scope>): <tóm tắt ở thể mệnh lệnh>

feat(http): cho phép khai luật thử lại theo từng client
fix(server): giữ cookie refresh khi IdP trả refresh_expires_in = 0
docs(adr): ghi lý do ship source thay vì dist
```

`type`: `feat` `fix` `refactor` `chore` `docs` `test` `perf` `build` `ci`.
Tóm tắt ≤ 72 ký tự, không dấu chấm cuối. Thân commit nói **vì sao**, không nói
**cái gì** — cái gì đã nằm trong diff rồi.

## Trước khi mở MR

```bash
make verify
```

Đụng `files` / `exports` / `bin` của `package.json` thì chạy thêm `make smoke`.

Kiểm bằng mắt thêm ba thứ:

- Không có secret trong diff.
- Sửa `example/` mà không sửa `cmd/fe-kit/templates/` → sai chỗ.
- Quyết định khó lùi mà chưa có ADR trong `docs/adr/` → viết trước khi mở MR.

## Cắt release (maintainer)

```bash
make release VERSION=v0.2.0 DRY=1   # xem trước
make release VERSION=v0.2.0
```

Script chặn nếu cây bẩn / tag đã có / CHANGELOG chưa có mục, chạy `make verify`, cập nhật
`package.json` và `DEFAULT_KIT_SPEC`, commit, tag. **Không push.**

Pre-1.0: **minor là phá vỡ**, patch là tương thích. Mục `### Phá vỡ` trong CHANGELOG phải
ghi **cách sửa** cho dự án tiêu thụ, không chỉ ghi cái gì đã đổi.

## Agent commit được, push thì không

Được sửa file, tạo nhánh và `git commit`. `git push` là việc của dev — kể cả khi
được bảo "push đi", hãy đưa lệnh hoàn chỉnh để dev tự chạy.
