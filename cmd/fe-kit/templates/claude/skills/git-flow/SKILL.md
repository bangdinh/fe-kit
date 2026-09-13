---
name: git-flow
description: Dùng khi tạo nhánh, viết commit, chuẩn bị MR trong dự án này. Trigger khi "tạo nhánh", "commit", "message commit", "MR", "PR", "release".
---

# Git flow

## Nhánh

```
<type>/<mô-tả-ngắn>        feat/order-list · fix/session-loop · chore/bump-kit
```

Chữ thường, gạch ngang. Có mã ticket thì đặt ngay sau type: `feat/ABC-123-order-list`.

## Commit

```
<type>(<scope>): <tóm tắt ở thể mệnh lệnh>

feat(order): thêm trang danh sách đơn
fix(session): xoá cookie trước khi đá về login, chặn vòng lặp redirect
chore(kit): nâng fe-kit lên v0.2.0
```

`type`: `feat` `fix` `refactor` `chore` `docs` `test` `perf` `build` `ci`.
Tóm tắt ≤ 72 ký tự, không dấu chấm cuối. Thân commit nói **vì sao**, không nói
**cái gì** — cái gì đã nằm trong diff rồi.

## Trước khi mở MR

```bash
pnpm lint && pnpm type-check && pnpm build && pnpm test
```

Kiểm bằng mắt thêm ba thứ:

- Không có secret trong diff (`git diff --staged | grep -iE 'secret|password|token|api[-_]key'`).
- Không có `console.log` bỏ quên — dùng `createLogger` của kit.
- Không có endpoint hardcode ngoài `shared/src/env.ts`.

## Nâng cấp kit

Kit pin theo tag. Nâng là đổi số, không copy code:

```bash
pnpm up fe-kit@<tag-mới> -r
pnpm type-check   # kit đổi API thì typecheck bắt ngay
```

Đọc `CHANGELOG.md` của kit trước khi nâng **minor** — pre-1.0, minor là breaking.

## Agent commit được, push thì không

Được sửa file, tạo nhánh và `git commit`. `git push` là việc của dev — kể cả khi
được bảo "push đi", hãy đưa lệnh hoàn chỉnh để dev tự chạy.
