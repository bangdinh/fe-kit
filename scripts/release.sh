#!/usr/bin/env bash
# Cắt release MỘT phát, cùng khuôn với scripts/release.sh của b2b-gokit:
#   mục CHANGELOG → bump version → commit → annotated tag mang release notes.
# KHÔNG push — in lệnh push + verify-tag để dev chạy.
#
# Dùng:  make release VERSION=v0.2.0 DRY=1   # chỉ xem trước mục CHANGELOG, không đụng gì
#        make release VERSION=v0.2.0         # làm thật
#
# Mục CHANGELOG: [Unreleased] có nội dung thì dùng nguyên văn; rỗng thì sinh từ
# conventional commit kể từ tag trước (scripts/release-notes.js nói vì sao khác gokit).
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="${1:-${VERSION:-}}"
DRY="${DRY:-}"

if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Dùng: make release VERSION=vX.Y.Z [DRY=1]" >&2
  exit 1
fi
BARE="${VERSION#v}"

if [ -n "$DRY" ]; then
  echo "===== Mục CHANGELOG (DRY — chưa ghi, chưa commit, chưa tag) ====="
  node scripts/release-notes.js "$VERSION"
  echo "================================================================"
  echo "Làm thật sẽ thêm: package.json → $BARE · DEFAULT_KIT_SPEC và ví dụ pin trong"
  echo "README.md, docs/getting-started.md, docs/versioning.md → #$VERSION · sinh lại example/ · commit · tag."
  echo "Chạy thật: make release VERSION=$VERSION"
  exit 0
fi

# --- guards ---
[ "$(git branch --show-current)" = "main" ] || { echo "✗ Phải đứng ở nhánh main." >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "✗ Cây làm việc chưa sạch — commit hết trước." >&2; exit 1; }
git rev-parse "$VERSION" >/dev/null 2>&1 && { echo "✗ Tag $VERSION đã tồn tại." >&2; exit 1; }
# Kiểm mục CHANGELOG TRƯỚC khi chạy verify dài: rỗng thì dừng ngay.
node scripts/release-notes.js "$VERSION" >/dev/null

echo "→ verify"
make verify

# --- bump version ---
# Thay đúng dòng "version" — JSON.stringify cả file sẽ gỡ escape (\u2014 → —) và làm bẩn diff.
sed -i '' -E "1,/\"version\": \"[^\"]*\"/s/(\"version\": \")[^\"]*\"/\1$BARE\"/" package.json
node -e "if(require('./package.json').version!=='$BARE'){console.error('✗ không bump được version trong package.json');process.exit(1)}"
# Dự án sinh ra phải pin ĐÚNG tag vừa cắt — nếu không, người dùng kit nhận bản cũ.
# README, getting-started.md và versioning.md có ví dụ pin; để cũ thì người đọc chép về tag cũ.
sed -i '' -E "s|(fe-kit#)v[0-9]+\.[0-9]+\.[0-9]+|\1$VERSION|g" cmd/fe-kit/plan.js README.md docs/getting-started.md docs/versioning.md

# --- sinh lại example/ ---
# Template in version của kit (README, layout, page) đọc từ package.json; không sinh lại
# thì verify-example đỏ ngay trên main sau release.
echo "→ sinh lại example/ theo version mới"
make example >/dev/null
make verify-example

# --- CHANGELOG + commit + tag ---
entry="$(node scripts/release-notes.js "$VERSION" --write)"
git add package.json cmd/fe-kit/plan.js README.md docs/getting-started.md docs/versioning.md CHANGELOG.md example
git add pnpm-lock.yaml 2>/dev/null || true
# Hook pre-commit chặn commit example/ không kèm template (chống sửa tay). Ở đây example/
# do chính generator sinh ra, nên báo cho hook biết đây là commit release.
FEKIT_RELEASE=1 git commit -q -m "chore(release): $VERSION"
# Annotated tag mang release notes (= mục CHANGELOG) → GitHub hiện notes ở tag.
# --cleanup=verbatim: giữ heading markdown; mặc định git coi dòng '#' là comment và xoá.
printf '%s\n' "$entry" | git tag -a "$VERSION" -F - --cleanup=verbatim

cat <<MSG

✓ $VERSION: CHANGELOG + commit + annotated tag (kèm release notes) tạo xong. CHƯA push.

  Push:    git push origin main && git push origin $VERSION
  Verify:  make verify-tag VERSION=$VERSION    # sau khi push: cài kit từ GitHub đúng tag này
MSG
