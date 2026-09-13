# ADR 0003 — Ba nền tảng, một lõi; và kit không xuất component

**Ngày:** 2026-09-13 · **Trạng thái:** chấp nhận

## Bối cảnh

Kit phục vụ web (Next), mobile (Expo) và desktop (Electron). Cám dỗ hiển nhiên là ship
một bộ component dùng chung để "ba app trông như nhau".

Đo được ở `camera-ai-platform`: `packages/ui` có **5.385 dòng** và **không xuất component
nào** — chỉ token và theme antd. Cấm `apps/mobile → @cap/ui` là một trong sáu điều cấm
tuyệt đối của repo đó, vì React Native không phải React DOM.

## Quyết định

1. **Lõi đa nền tảng**: `http` · `auth` · `access` · `logger` · `config` · `types` ·
   `tokens` — chạy ở mọi nơi, không import `react`/`antd`/`next`.
2. **Hai vùng có ràng buộc**: `fe-kit/server` (Next server) và `fe-kit/ui` (web).
3. **Kit không xuất component nào.**

## Vì sao không xuất component

Component dùng chung chỉ đứng vững khi hai sản phẩm cần **y hệt** nhau. Với màn hình
nghiệp vụ điều đó gần như không xảy ra: khác nhau ở cột bảng, ở luật hiển thị, ở copy.
Cái xảy ra tiếp theo là prop thứ 12 tên `variant`, rồi `variant` thứ năm — và kit trở
thành thứ không ai dám sửa.

Thứ **thật sự** dùng chung được là bảng token và cách nối nó vào thư viện UI. Đó là
`defineTokens` + `createAntdTheme` + `cssVariables`, và nó dừng ở đó.

## Hệ quả kiểm được

`scripts/check-layers.sh` fail nếu `react`/`antd`/`next` xuất hiện ngoài vùng cho phép.
React Native dùng `fe-kit/tokens` (bảng thuần), không dùng `fe-kit/ui`.
