#!/usr/bin/env bash
# Nghiệm thu một tag ĐÃ PUSH — cùng vai với scripts/verify-tag.sh của b2b-gokit.
#
# Chạy CLI của chính tag đó (không phải CLI trong cây làm việc), sinh dự án mới, kiểm dự án
# pin ĐÚNG tag, rồi cài kit từ GitHub và build. `make smoke` cài từ tarball ở máy nên không
# bắt được: tag quên bump DEFAULT_KIT_SPEC, tag trỏ nhầm commit, tag chưa push.
#
# Dùng:  make verify-tag VERSION=v0.2.0
set -euo pipefail

VERSION="${1:-${VERSION:-}}"
[[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Dùng: make verify-tag VERSION=vX.Y.Z" >&2; exit 1; }

SPEC="github:bangdinh/fe-kit#$VERSION"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "==> Sinh dự án bằng CLI của $SPEC"
if ! (cd "$tmp" && npx --yes --package="$SPEC" fe-kit new thu-nghiem --platforms web --out "$tmp/thu-nghiem" >/dev/null); then
  echo "✗ FAIL — không chạy được CLI từ $SPEC. Tag đã push lên GitHub chưa? (git ls-remote --tags origin $VERSION)" >&2
  exit 1
fi

pinned="$(node -e "console.log(require('$tmp/thu-nghiem/apps/web/package.json').dependencies['fe-kit'] ?? '')")"
echo "==> Dự án sinh ra pin: ${pinned:-(không thấy)}  (kỳ vọng: $SPEC)"
if [ "$pinned" != "$SPEC" ]; then
  echo "✗ FAIL — pin '$pinned' khác '$SPEC'. Release có bump DEFAULT_KIT_SPEC trong cmd/fe-kit/plan.js không?" >&2
  exit 1
fi

cd "$tmp/thu-nghiem"
echo "==> Cài kit từ GitHub, type-check, build"
npx --yes pnpm@12.4.1 install
npx --yes pnpm@12.4.1 run type-check
npx --yes pnpm@12.4.1 run build

echo
echo "✓ PASS — $VERSION: CLI của tag sinh dự án pin đúng tag, cài từ GitHub, type-check và build qua."
