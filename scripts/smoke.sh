#!/usr/bin/env bash
# Nghiệm thu THẬT: sinh một dự án mới ở thư mục tạm, cài kit TỪ TARBALL (đúng
# cách một dự án bên ngoài sẽ cài), rồi build.
#
# Workspace che mất cả một lớp lỗi: `files` thiếu thư mục, `exports` sai đường
# dẫn, `bin` quên chmod — tất cả đều chạy tốt khi symlink và vỡ khi cài thật.
set -euo pipefail
cd "$(dirname "$0")/.."
root="$PWD"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echo "→ thư mục thử: $tmp"

tarball="$(npm pack --silent --pack-destination "$tmp" | tail -1)"
echo "→ đóng gói: $tarball"

node cmd/fe-kit/index.js new thu-nghiem --platforms web \
  --out "$tmp/thu-nghiem" --kit-spec "file:$tmp/$tarball" >/dev/null

cd "$tmp/thu-nghiem"
npx --yes pnpm@12.4.1 install
npx --yes pnpm@12.4.1 run type-check
npx --yes pnpm@12.4.1 run build

echo
echo "✓ smoke xanh: dự án mới cài kit từ tarball, type-check và build đều qua"
cd "$root"
