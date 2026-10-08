#!/usr/bin/env bash
# Lấy hợp đồng REST từ một tag của b2b-gokit về kit, rồi sinh lại type.
#
# Vì sao vendor chứ không fetch lúc build: kit ở GitHub, CI của kit không với tới
# git.fpt.net. Dev có quyền FPT chạy lệnh này tại máy; CI chỉ kiểm bản đã vendor
# còn khớp với type đã sinh (make contract-verify).
#
# Dùng:  make contract-sync GOKIT_REF=v0.8.7 [GOKIT_DIR=../b2b-gokit]
set -euo pipefail
cd "$(dirname "$0")/.."

GOKIT_DIR="${GOKIT_DIR:-../b2b-gokit}"
GOKIT_REF="${GOKIT_REF:-}"

if [ -z "$GOKIT_REF" ]; then
  echo "Dùng: make contract-sync GOKIT_REF=<tag gokit> [GOKIT_DIR=<clone b2b-gokit>]" >&2
  exit 1
fi
if ! git -C "$GOKIT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  echo "✗ $GOKIT_DIR không phải clone của b2b-gokit — đặt GOKIT_DIR=<đường dẫn>" >&2
  exit 1
fi

commit="$(git -C "$GOKIT_DIR" rev-parse --verify "$GOKIT_REF^{commit}")"
git -C "$GOKIT_DIR" show "$commit:contract/rest-contract.json" > contract/gokit-rest-contract.json
printf '{\n  "ref": "%s",\n  "commit": "%s"\n}\n' "$GOKIT_REF" "$commit" > contract/gokit-source.json

node scripts/gen-contract.js
echo "✓ hợp đồng gokit $GOKIT_REF ($commit) — xem diff rồi chạy make verify"
