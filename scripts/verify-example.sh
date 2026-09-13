#!/usr/bin/env bash
# `example/` phải LUÔN bằng đúng thứ scaffold sinh ra từ templates.
#
# Vì sao cần: example là bằng chứng duy nhất cho thấy template còn dựng được
# app chạy. Sửa tay vào example mà quên sửa template thì bằng chứng đó nói dối
# — CI xanh trong khi dự án mới sinh ra lại vỡ.
set -euo pipefail
cd "$(dirname "$0")/.."

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

node cmd/fe-kit/index.js new example --platforms web,mobile,desktop \
  --out "$tmp/example" --kit-spec 'workspace:*' >/dev/null

# So NỘI DUNG, bỏ qua thứ sinh ra lúc chạy.
#
# `next-env.d.ts` nằm trong danh sách vì Next GHI ĐÈ nó mỗi lần build (nó trỏ
# vào `.next/types/*`) — so nó thì mỗi lần build xong là báo lệch giả.
if diff -r -q \
     --exclude=node_modules --exclude=.next --exclude=dist --exclude=.turbo \
     --exclude=.expo --exclude='*.log' --exclude=next-env.d.ts \
     example "$tmp/example"; then
  echo "✓ example/ khớp template"
else
  cat <<'MSG'

✗ example/ đã lệch khỏi template.
  Sửa ở cmd/fe-kit/templates/ (nguồn), rồi chạy: make example
MSG
  exit 1
fi
