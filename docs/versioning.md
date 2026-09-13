# Versioning

## Luật số

Pre-1.0: **`v0.MINOR` là breaking, `v0.x.PATCH` là tương thích ngược.** Giống `b2b-gokit`.

Breaking gồm: đổi/xoá một export, đổi hình dạng option, đổi hành vi mặc định (ví dụ luật
thử lại), nâng một peer dependency lên major mới.

## Cắt release

```bash
make release VERSION=v0.2.0 DRY=1   # xem trước
make release VERSION=v0.2.0
```

Script sẽ: chặn nếu cây làm việc bẩn hoặc tag đã có hoặc CHANGELOG chưa có mục →
`make verify` → cập nhật `package.json` → cập nhật `DEFAULT_KIT_SPEC` trong `plan.js`
(để dự án sinh ra pin đúng tag vừa cắt) → commit → tag.

**Không push.** Script in ra hai lệnh để dev tự chạy.

## Dự án tiêu thụ pin thế nào

```jsonc
"dependencies": {
  "fe-kit": "git+ssh://git@git.fpt.net/fli-backend/b2b-v2/fe-kit.git#v0.1.0"
}
```

Tag chính xác, không bao giờ là nhánh. Nâng cấp:

```bash
pnpm up fe-kit@<tag-mới> -r
pnpm type-check     # kit đổi API thì typecheck bắt ngay
pnpm build          # type-check không thay được build
```

Đọc `CHANGELOG.md` trước khi nâng **minor**.

## Khi publish lên registry

`exports`, `files` đã sẵn. Lúc đó đổi pin thành range (`"fe-kit": "^0.2.0"`) và sửa
`DEFAULT_KIT_SPEC` trong `plan.js`. Không có thay đổi nào khác trong source.
