// Phương ngữ = luật bóc vỏ của MỘT backend.
//
// Chuẩn để nhắm tới là b2b-gokit: `{data}` / `{data, page}`, lỗi là RFC 9457 và
// không bao giờ HTTP 200. Nhưng một FE thật gần như luôn phải sống chung với
// vài service cũ nói kiểu khác — trả `{code: 1200, data}`, hay trả 200 cho lỗi
// rồi giấu phán quyết trong body.
//
// Kit KHÔNG chứa phương ngữ của một sản phẩm nào. Nó chứa `gokitDialect` (chuẩn
// mới) và `envelopeDialect` — cái khuôn để sản phẩm khai phương ngữ cũ của
// mình trong mươi dòng, thay vì rải `if (body.code === 1200)` khắp nơi.
import { codeFromStatus } from './errors';
import type { ErrorCode, PageMeta, ProblemDetails } from '../types/wire';
import { isProblemDetails } from '../types/wire';

export interface DialectInput {
  status: number;
  /** Body đã parse JSON, hoặc chuỗi thô nếu không parse được, hoặc undefined (204). */
  body: unknown;
  contentType: string | undefined;
}

export type DialectOutcome =
  | { ok: true; data: unknown; page?: PageMeta }
  | { ok: false; problem: ProblemDetails };

export interface Dialect {
  /** Tên ngắn, chỉ để đọc log. */
  readonly name: string;
  parse(input: DialectInput): DialectOutcome;
}

function problem(status: number, title: string, code?: ErrorCode, detail?: string): ProblemDetails {
  return { type: 'about:blank', title, status, code: code ?? codeFromStatus(status), ...(detail ? { detail } : {}) };
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function pageOf(v: unknown): PageMeta | undefined {
  const p = asRecord(v);
  if (!p) return undefined;
  return {
    hasMore: p.hasMore === true,
    ...(typeof p.limit === 'number' ? { limit: p.limit } : {}),
    ...(typeof p.nextCursor === 'string' ? { nextCursor: p.nextCursor } : {}),
    ...(typeof p.total === 'number' ? { total: p.total } : {}),
  };
}

/**
 * Chuẩn b2b-gokit.
 *
 * Ba luật nó dựa vào, cả ba đều nằm trong REST_API_STANDARD:
 *   • status quyết định thành/bại — KHÔNG bao giờ 200 cho lỗi.
 *   • thành công luôn có khoá `data` (204 thì không có body, và cấm `{"data": null}`).
 *   • lỗi là `application/problem+json` theo RFC 9457.
 *
 * Backend đúng chuẩn mà trả body lạ thì đây là chỗ phát hiện, chứ không phải
 * chỗ gọi: lỗi ném ra nói thẳng "không đúng envelope", kèm body để đọc.
 */
export const gokitDialect: Dialect = {
  name: 'gokit',
  parse({ status, body }) {
    if (status >= 400) {
      if (isProblemDetails(body)) return { ok: false, problem: body };
      const detail = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
      return { ok: false, problem: problem(status, `HTTP ${status}`, undefined, detail) };
    }
    if (status === 204 || body === undefined) return { ok: true, data: undefined };

    const env = asRecord(body);
    if (!env || !('data' in env)) {
      return {
        ok: false,
        problem: problem(
          status,
          'Phản hồi không đúng envelope gokit',
          'INTERNAL_ERROR',
          `Chờ {"data": …} nhưng nhận: ${typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)}`,
        ),
      };
    }
    const page = pageOf(env.page);
    return page ? { ok: true, data: env.data, page } : { ok: true, data: env.data };
  },
};

/** Không có vỏ: body chính là dữ liệu. Dùng cho service ngoài, hoặc mock. */
export const passthroughDialect: Dialect = {
  name: 'passthrough',
  parse({ status, body }) {
    if (status >= 400) {
      if (isProblemDetails(body)) return { ok: false, problem: body };
      return { ok: false, problem: problem(status, `HTTP ${status}`) };
    }
    return { ok: true, data: body };
  },
};

export interface EnvelopeDialectSpec {
  name: string;
  /**
   * Phản hồi này có phải thành công không.
   *
   * Mặc định `status < 400`. Khai lại khi backend trả 200 cho cả lỗi — đó
   * chính là loại backend mà `gokitDialect` KHÔNG đọc được, và là lý do hàm
   * này tồn tại.
   */
  isSuccess?(input: DialectInput): boolean;
  /** Lấy phần dữ liệu ra khỏi body thành công. Mặc định `body.data`. */
  data?(body: unknown): unknown;
  /** Lấy khối phân trang, nếu có. Mặc định `body.page` theo shape gokit. */
  page?(body: unknown): PageMeta | undefined;
  /** Dựng Problem Details từ body lỗi. Mặc định suy từ status. */
  error?(input: DialectInput): ProblemDetails;
}

/**
 * Khuôn dựng phương ngữ cho một backend không theo chuẩn gokit.
 *
 * ```ts
 * // Service cũ: {"code": 1200, "data": …}, lỗi cũng HTTP 200
 * export const legacy = envelopeDialect({
 *   name: 'legacy-v1',
 *   isSuccess: ({ body }) => (body as { code?: number })?.code === 1200,
 *   error: ({ status, body }) => {
 *     const b = body as { code?: number; error?: string };
 *     return { type: 'about:blank', title: b?.error ?? 'Lỗi', status, code: String(b?.code ?? status) };
 *   },
 * });
 * ```
 */
export function envelopeDialect(spec: EnvelopeDialectSpec): Dialect {
  const isSuccess = spec.isSuccess ?? (({ status }: DialectInput) => status < 400);
  const takeData = spec.data ?? ((body: unknown) => asRecord(body)?.data);
  const takePage = spec.page ?? ((body: unknown) => pageOf(asRecord(body)?.page));
  const takeError =
    spec.error ?? (({ status }: DialectInput) => problem(status, `HTTP ${status}`));

  return {
    name: spec.name,
    parse(input) {
      if (!isSuccess(input)) return { ok: false, problem: takeError(input) };
      if (input.status === 204 || input.body === undefined) return { ok: true, data: undefined };
      const page = takePage(input.body);
      const data = takeData(input.body);
      return page ? { ok: true, data, page } : { ok: true, data };
    },
  };
}
