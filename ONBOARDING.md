# Vào repo này — 5 phút

## fe-kit đứng ở đâu

```
b2b-gokit        backend Go        → định nghĩa HỢP ĐỒNG REST
   │
   ▼  (fe-kit nói đúng hợp đồng đó)
fe-kit           thư viện FE       → repo NÀY
   │
   ├──► dự án web-first mới        → sinh bằng `fe-kit new`
   └──► camera-ai-platform         → nguồn của kit; sẽ migrate dần, KHÔNG big-bang

qc-kit           kit QC            → repo anh em, cùng mô hình (1 package + subpath + scaffold)
flutter-kit      kit Flutter       → cùng mô hình, khác ngôn ngữ
```

Kit này **ra đời từ** `camera-ai-platform`: phần dùng chung được bóc ra, phần dính sản
phẩm để lại. Hồ sơ giai đoạn đó ở [docs/history/](docs/history/).

## Bốn thứ phải biết trước khi sửa gì

1. **`example/` là thứ SINH RA.** Nguồn là `cmd/fe-kit/templates/`. Sửa tay ở `example/`
   sẽ mất ở lần `make example` sau, và pre-commit hook sẽ chặn.

2. **Kit không được biết một sản phẩm nào.** Không URL, không tên công ty, không action
   code cụ thể. `make check-layers` kiểm điều đó bằng lệnh.

3. **Lõi phải chạy được trên React Native.** Nghĩa là: không viết chữ `process` (đọc qua
   `globalThis`), không dùng kiểu của `lib: ["DOM"]`, không import `react`/`antd`/`next`.
   Chỉ `src/server` và `src/ui` được miễn.

4. **`make verify` là cổng duy nhất.** Nó chạy lint → typecheck → test → check-layers →
   verify-example → build cả ba app mẫu. Đỏ ở bước nào thì sửa bước đó, đừng bỏ qua.

## Chạy thử ngay

```bash
make install
make verify          # ~1 phút
make new NAME=thu-nghiem OUT=/tmp/thu-nghiem PLATFORMS=web
```

## Đọc tiếp theo thứ tự

1. [README.md](README.md) — dùng kit
2. [STRUCTURE.md](STRUCTURE.md) — vì sao code có hình dạng đó
3. [docs/architecture.md](docs/architecture.md) — code thuộc kit hay thuộc sản phẩm
4. [docs/adr/](docs/adr/) — năm quyết định khó lùi
5. [CONTRIBUTING.md](CONTRIBUTING.md) — nhánh, commit, release

## Ba luật văn hoá (bê từ giai đoạn 1)

1. **Đo trước khi khẳng định — và kiểm lại chính phép đo.** `grep` chứ đừng trích tài
   liệu. Bug thật thì tái lập được VÀ giải thích được bằng source.
2. **Không quyết định nào chỉ tồn tại trong chat.** Chốt xong ghi `docs/decisions.md`;
   khó lùi thì thêm ADR.
3. **Agent commit được, push thì không.** `git push` là việc của dev.
