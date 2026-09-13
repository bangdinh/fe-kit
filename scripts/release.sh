#!/usr/bin/env bash
# Cắt một release: verify → cập nhật version + CHANGELOG → commit → tag.
# KHÔNG push. Push là việc của dev.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:-}"
DRY="${DRY:-}"

if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Dùng: make release VERSION=vX.Y.Z [DRY=1]" >&2
  exit 1
fi
BARE="${VERSION#v}"

if [ -n "$(git status --porcelain)" ]; then
  echo "✗ Cây làm việc còn thay đổi chưa commit. Dọn trước khi cắt release." >&2
  exit 1
fi
if git rev-parse "$VERSION" >/dev/null 2>&1; then
  echo "✗ Tag $VERSION đã tồn tại." >&2
  exit 1
fi
if ! grep -q "^## \[$BARE\]" CHANGELOG.md; then
  echo "✗ CHANGELOG.md chưa có mục '## [$BARE]'. Viết trước, rồi cắt tag." >&2
  exit 1
fi

echo "→ verify"
make verify

if [ -n "$DRY" ]; then
  echo
  echo "DRY=1 — sẽ làm:"
  echo "  package.json version → $BARE"
  echo "  cmd/fe-kit/plan.js DEFAULT_KIT_SPEC → #$VERSION"
  echo "  git commit -m 'chore(release): $VERSION'"
  echo "  git tag -a $VERSION"
  exit 0
fi

node -e "const f='package.json',fs=require('fs');const d=JSON.parse(fs.readFileSync(f));d.version='$BARE';fs.writeFileSync(f,JSON.stringify(d,null,2)+'\n')"
# Dự án sinh ra phải pin ĐÚNG tag vừa cắt — nếu không, người dùng kit nhận bản cũ.
sed -i '' -E "s|(fe-kit#)v[0-9]+\.[0-9]+\.[0-9]+|\1$VERSION|" cmd/fe-kit/plan.js

git add package.json cmd/fe-kit/plan.js CHANGELOG.md
git commit -m "chore(release): $VERSION"
git tag -a "$VERSION" -m "fe-kit $VERSION"

cat <<MSG

✓ Đã cắt $VERSION tại chỗ. Chưa push.

Chạy hai lệnh sau để đưa lên remote:

  git push origin HEAD
  git push origin $VERSION
MSG
