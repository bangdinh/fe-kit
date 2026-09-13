// Pattern log HTTP thống nhất — BaseUrl / Request / Response.
// Client (api-client, brm) chỉ truyền dữ liệu; prettySink in block dễ đọc.

import type { LogContext } from './types';

/** Định danh đích gọi — in đầu block (nhãn BaseUrl). */
export interface HttpTarget {
  /** Tên service ngắn: 'brm' | 'gateway' | 'iam' … */
  service: string;
  method: string;
  /** Origin/base không trailing slash. */
  baseUri: string;
  /** Path bắt đầu bằng '/'. */
  path: string;
  /**
   * ID nghiệp vụ của lời gọi — in thành dòng phụ dưới BaseUrl.
   *
   * Là một map mở, KHÔNG phải danh sách khoá cố định: khoá nào có nghĩa là
   * chuyện của sản phẩm (`companyId`, `orderId`, `deviceSerial`…), và kit mà
   * liệt kê sẵn thì mỗi sản phẩm mới lại phải sửa kit.
   */
  ids?: Record<string, string | undefined>;
}

export interface HttpRequestLog {
  /** JWT / access token đầy đủ (dev). Prod vẫn bị redact ở logger.http. */
  token?: string | null;
  /** Header gửi đi — đủ bộ, gồm Authorization. */
  headers?: Record<string, unknown>;
  body?: unknown;
}

export interface HttpResponseLog {
  status: number;
  body?: unknown;
  ok?: boolean;
}

/**
 * Bản ghi HTTP đầy đủ. `kind: 'http'` để prettySink nhận diện và in block.
 * Gọi 1 lần SAU khi có response (hoặc khi lỗi) — Request + Response cùng chỗ.
 */
export interface HttpLogEntry {
  kind: 'http';
  target: HttpTarget;
  request?: HttpRequestLog;
  response?: HttpResponseLog;
  /** ms từ lúc bắt đầu fetch → nhận body. */
  durationMs?: number;
  error?: unknown;
}

export function isHttpLog(context: LogContext | undefined): context is HttpLogEntry & LogContext {
  return !!context && context.kind === 'http' && typeof context.target === 'object';
}

/** URL đầy đủ = baseUri + path (không double-slash). */
export function httpUrl(target: Pick<HttpTarget, 'baseUri' | 'path'>): string {
  const base = target.baseUri.replace(/\/+$/, '');
  const path = target.path.startsWith('/') ? target.path : `/${target.path}`;
  return `${base}${path}`;
}

/** Các id có giá trị — dùng cho dòng phụ dưới BaseUrl. */
export function httpIds(target: HttpTarget): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(target.ids ?? {})) {
    if (v) out[k] = v;
  }
  return out;
}

/**
 * Dựng context sẵn sàng đưa vào emit (chưa sanitize — logger sẽ sanitize).
 * Dùng khi muốn tự `log.debug('HTTP', httpContext(...))` thay vì `log.http`.
 */
export function httpContext(entry: Omit<HttpLogEntry, 'kind'>): HttpLogEntry {
  return { kind: 'http', ...entry };
}

/**
 * Lệnh curl copy-paste được từ bản ghi HTTP (sau sanitize → token có thể đã mask).
 * In dưới block log để replay request trên terminal.
 */
export function formatCurl(entry: Pick<HttpLogEntry, 'target' | 'request'>): string {
  const url = httpUrl(entry.target);
  const method = (entry.target.method || 'GET').toUpperCase();
  const parts: string[] = [`curl -X ${method} '${escapeShell(url)}'`];

  const headers = entry.request?.headers ?? {};
  for (const [k, v] of Object.entries(headers)) {
    if (v === undefined || v === null) continue;
    parts.push(`  -H '${escapeShell(`${k}: ${String(v)}`)}'`);
  }

  // Body: ưu tiên request.body; nếu thiếu mà còn token-only GET thì không thêm -d.
  if (entry.request?.body !== undefined) {
    const raw = typeof entry.request.body === 'string'
      ? entry.request.body
      : JSON.stringify(entry.request.body);
    parts.push(`  -d '${escapeShell(raw)}'`);
  }

  return parts.join(' \\\n');
}

function escapeShell(s: string): string {
  // Single-quote shell string: 'foo'bar' → 'foo'\''bar'
  return s.replace(/'/g, `'\\''`);
}
