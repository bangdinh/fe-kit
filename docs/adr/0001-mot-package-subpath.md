# ADR 0001 — Một package với subpath exports, không phải monorepo nhiều package

**Ngày:** 2026-09-13 · **Trạng thái:** chấp nhận

## Bối cảnh

`camera-ai-platform` tách 10 package (`@cap/types`, `@cap/core`, …) trong một monorepo
pnpm. Cách đó ổn **bên trong** một repo, nhưng kit phải được tiêu thụ **từ repo khác**.

Đo được: tổ chức chưa có npm registry nội bộ (`qc-kit` ghi rõ "kit CHƯA publish lên
registry nên pin theo tag git"; `.npmrc` của camera không có dòng registry nào). Mà npm
và pnpm **không cài được một package nằm trong subdirectory của git repo** — không có
cú pháp cho việc đó.

## Quyết định

Một package `fe-kit`, chia mặt bằng `exports` subpath (`fe-kit/http`, `fe-kit/auth`, …).

## Vì sao

- Cài được ngay hôm nay bằng tag git, không chờ dựng registry.
- Ranh giới vẫn còn: subpath là hợp đồng công khai, và `scripts/check-layers.sh` ép chiều
  phụ thuộc bằng lệnh chứ không bằng lời hứa.
- Đây đúng mô hình `qc-kit` đang chạy trong tổ chức — một cách làm đã có người vận hành.

## Đánh đổi chấp nhận

Consumer cài **cả** kit dù chỉ dùng một subpath. Với FE thì bundler tree-shake phần không
import, nên chi phí là dung lượng `node_modules` chứ không phải dung lượng bundle.

## Đổi ý khi nào

Có registry nội bộ **và** có ≥ 3 dự án thật chỉ dùng một phần kit. Lúc đó tách package
là việc cơ học: subpath đã là ranh giới sẵn.
