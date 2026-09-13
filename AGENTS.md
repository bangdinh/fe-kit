# fe-kit — Engineering Guide

> Nạp vào MỌI prompt → giữ mỏng. Chi tiết theo chủ đề ở `docs/`; luật để hành động ở
> `.claude/skills/` (skill tự kích hoạt, body chỉ nạp khi dùng).

## Năm fact chống-đoán-sai

1. **Đây là KIT, không phải app.** Nó không có màn hình nào, không biết endpoint nào,
   không biết action code nào. Thêm bất cứ thứ gì mang tên một sản phẩm là sai chỗ.
2. **`example/` được SINH RA** từ `cmd/fe-kit/templates/` bằng `make example`. Sửa tay ở
   `example/` sẽ mất, và pre-commit hook chặn.
3. **Kit ship SOURCE TypeScript, không ship `dist`.** Hệ quả: kit được type-check bằng
   tsconfig của **dự án tiêu thụ** — nên `src/` không được dùng `@types/node`
   (viết `process`) hay kiểu của `lib: ["DOM"]` (`RequestCache`, `Crypto`).
4. **Lõi chạy trên React Native.** Chỉ `src/server` (Next) và `src/ui` (React DOM + antd)
   được miễn. `make check-layers` kiểm bằng lệnh.
5. **Next 16 gọi `middleware.ts` là `proxy.ts`.** Kit dùng tên `createSessionProxy`.

## Chín subpath

```
types      Envelope · Page · ProblemDetails · 15 mã lỗi gokit      lá
config     defineEnvironments · env readers · timeout             lá
logger     createLogger · sink · redact                           lá — nơi DUY NHẤT gọi console.*
http       createHttpClient · Dialect · HttpError                 lõi
access     can/canOn/buildAccessProfile/indexFromTree             lõi — generic theo action code
auth       OIDC PKCE · JWKS · refresh chống đua · SLO             lõi
tokens     bảng design token thuần                                 lá
server     cookie phiên · createSessionProxy                      CHỈ Next server
ui         token → ThemeConfig antd · cssVariables                CHỈ web. KHÔNG xuất component.
```

## Cấm tuyệt đối

```
✗ URL tuyệt đối trong src/            ✗ react / antd / next ngoài src/ui, src/server
✗ console.* ngoài logger/sinks.ts     ✗ lõi import ngược từ server/ui
✗ rẽ nhánh theo tên sản phẩm          ✗ sửa example/ thay vì sửa template
✗ viết chữ `process` trong src/       ✗ cú pháp {{#if}} trong template
```

## Lệnh

```bash
make verify   # lint → typecheck → test → check-layers → verify-example → build 3 app mẫu
make smoke    # cài từ tarball, bắt lỗi files/exports/bin mà workspace che mất
make example  # sinh lại example/ sau khi sửa template
```

## Ba luật không được quên

1. **Đo trước khi khẳng định — và kiểm lại chính phép đo.** Nghi ngờ thì `grep`, đừng
   trích tài liệu. Bug thật thì tái lập được VÀ giải thích được bằng source.
   (Hai lần kết luận sai vì đo hỏng: `docs/history/decisions.md` D-008.)
2. **Không quyết định nào chỉ tồn tại trong chat.** Chốt xong ghi `docs/decisions.md`;
   khó lùi thì thêm ADR vào `docs/adr/`.
3. **Agent commit được, push thì không.** Được sửa file, tạo nhánh và `git commit` theo
   quy ước repo. `git push` là việc của dev — kể cả khi được bảo "push đi", hãy đưa lệnh
   hoàn chỉnh để dev chạy.
