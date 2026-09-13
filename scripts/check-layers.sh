#!/usr/bin/env bash
# Luật ranh giới của kit — kiểm được bằng lệnh, không bằng lời hứa trong tài liệu.
#
# Chạy trước mỗi lần merge. In ra dòng nào là vi phạm dòng đó.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
report() { # <mô tả> <kết quả grep>
  if [ -n "$2" ]; then
    printf '\n✗ %s\n%s\n' "$1" "$2"
    fail=1
  else
    printf '✓ %s\n' "$1"
  fi
}

# ── 1. Kit không được biết một sản phẩm nào ────────────────────────────────
# Endpoint là tri thức của sản phẩm. Một URL tuyệt đối trong `src/` nghĩa là
# kit đã ghim một môi trường của ai đó vào mọi dự án cài nó về.
#
# Bỏ dòng chú thích trước khi so: ví dụ trong JSDoc có URL là chuyện bình
# thường, và một phép đo báo động vì chú thích thì sẽ bị tắt sau đúng hai lần.
no_comments() { grep -vE ':[0-9]+:[[:space:]]*(\*|//|/\*)'; }
report "src/ không chứa URL tuyệt đối trong chuỗi (bỏ qua chú thích)" \
  "$(grep -rnE "['\"\`]https?://" src --include='*.ts' | grep -v '\.test\.ts' | no_comments || true)"

# ── 2. Lõi đa nền tảng không được kéo theo thứ chỉ có ở web ───────────────
# `src/server` (Next) và `src/ui` (React DOM + antd) là hai vùng CÓ PHÉP; mọi
# nơi khác phải chạy được trên React Native và trong Edge runtime.
core_imports() { # <mẫu>
  grep -rnE "from '$1" src --include='*.ts' \
    | grep -vE '^src/(server|ui)/' | grep -v '\.test\.ts' || true
}
report "ngoài src/server không import next/*"  "$(core_imports 'next(/|\x27)')"
report "ngoài src/ui không import antd"        "$(core_imports 'antd\x27')"
report "ngoài src/ui không import react"       "$(core_imports 'react(-dom)?\x27')"

# ── 3. Phụ thuộc chảy MỘT chiều: lõi không được biết tới tầng trên ────────
report "lõi không import ngược từ src/server hoặc src/ui" \
  "$(grep -rnE "from '\.\./(server|ui)/" src --include='*.ts' \
      | grep -vE '^src/(server|ui)/' || true)"

# ── 4. console.* chỉ được ở đúng một chỗ ─────────────────────────────────
# Đổi được đích log (Sentry/OTel) bằng một `configureLogger` là nhờ luật này.
report "console.* chỉ nằm ở sink của logger (và chỗ cảnh báo của access)" \
  "$(grep -rn 'console\.' src --include='*.ts' \
      | grep -vE '^src/logger/sinks\.ts:' \
      | grep -vE '^src/access/profile\.ts:' \
      | grep -v '\.test\.ts' || true)"

# ── 5. Template phải là file hợp lệ, không có điều kiện nhúng trong nội dung ─
report "template không dùng cú pháp điều kiện (chọn file theo nền tảng ở plan.js)" \
  "$(grep -rn '{{#' cmd/fe-kit/templates || true)"

exit $fail
