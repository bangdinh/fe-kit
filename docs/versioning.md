# Versioning

## Luật số

Pre-1.0: **`v0.MINOR` là breaking, `v0.x.PATCH` là tương thích ngược.** Giống `b2b-gokit`.

Breaking gồm: đổi/xoá một export, đổi hình dạng option, đổi hành vi mặc định (ví dụ luật
thử lại), nâng một peer dependency lên major mới.

## Cắt release

Cùng khuôn với `make release` của b2b-gokit.

```bash
make release VERSION=v0.2.0 DRY=1   # chỉ in mục CHANGELOG sẽ ghi, không đụng gì
make release VERSION=v0.2.0         # làm thật, đứng ở main
git push origin main && git push origin v0.2.0
make verify-tag VERSION=v0.2.0      # sau khi push
```

`make release`:

1. Chặn nếu không ở `main`, cây bẩn, tag đã có, hoặc không có gì để release.
2. `make verify`.
3. Bump `package.json`, `DEFAULT_KIT_SPEC` trong `plan.js` (dự án sinh ra pin đúng tag vừa
   cắt), và ví dụ pin trong `README.md`, `docs/versioning.md`.
4. Sinh lại `example/` — template in version của kit, không sinh lại thì `verify-example`
   đỏ ngay trên `main`.
5. Ghi mục CHANGELOG, commit `chore(release): vX.Y.Z`, annotated tag mang release notes.

**Mục CHANGELOG** — khác gokit một điểm: mục `[Unreleased]` viết tay thì dùng nguyên văn
(vì mục `### Phá vỡ` phải có cách sửa, thứ commit message không chứa); `[Unreleased]` rỗng
thì sinh từ conventional commit kể từ tag trước, như gokit.

**Không push.** Script in lệnh push để dev tự chạy.

`make verify-tag` chạy CLI của chính tag đã push (`npx github:bangdinh/fe-kit#vX.Y.Z`), sinh
dự án, kiểm dự án pin đúng tag, cài kit từ GitHub rồi build. `make smoke` cài từ tarball ở
máy nên không bắt được tag quên bump `DEFAULT_KIT_SPEC` hay tag chưa push.

## Dự án tiêu thụ pin thế nào

```jsonc
"dependencies": {
  "fe-kit": "github:bangdinh/fe-kit#v0.1.0"
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
