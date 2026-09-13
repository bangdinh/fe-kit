// Dựng query string. Một chỗ, vì đây là nơi rò rỉ dữ liệu thầm lặng hay xảy ra
// nhất: `undefined` nối thành chuỗi "undefined" và backend lọc theo đúng chữ đó.
import type { ListQuery } from '../types/wire';

export type QueryValue = string | number | boolean | Date | null | undefined | readonly (string | number | boolean)[];
export type QueryParams = Record<string, QueryValue>;

/**
 * `{a: 1, b: undefined, c: ['x','y']}` → `?a=1&c=x&c=y`.
 *
 * Bỏ `undefined`, `null` và chuỗi rỗng — ba thứ đều nghĩa là "không lọc theo
 * khoá này". Giữ `false` và `0`: chúng là giá trị thật.
 * `Date` → ISO 8601. Mảng → lặp khoá, KHÔNG nối bằng dấu phẩy.
 */
export function buildQuery(params?: QueryParams): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v === undefined || v === null || v === '') continue;
        sp.append(key, String(v));
      }
      continue;
    }
    sp.append(key, value instanceof Date ? value.toISOString() : String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** Nối query vào path, giữ nguyên phần query đã có sẵn trong path. */
export function withQuery(path: string, params?: QueryParams): string {
  const qs = buildQuery(params);
  if (!qs) return path;
  return path.includes('?') ? `${path}&${qs.slice(1)}` : `${path}${qs}`;
}

/** Tham số phân trang chuẩn gokit + filter tự do của sản phẩm. */
export type ListParams = ListQuery & QueryParams;
