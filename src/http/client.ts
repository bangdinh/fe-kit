// Client HTTP của kit. Một điểm vào cho mọi lời gọi backend.
//
// Nó gom đúng những thứ mà mỗi dự án nếu tự viết sẽ quên đúng một cái, và cái
// bị quên luôn là cái làm hỏng production:
//   • hạn chờ — thiếu nó thì backend treo làm treo cả RSC, không ai thấy lỗi;
//   • đọc body bằng text() rồi mới parse — res.json() nuốt mất nội dung khi lỗi;
//   • bóc vỏ theo ĐÚNG phương ngữ của backend đó (xem dialect.ts);
//   • một kiểu lỗi duy nhất (HttpError) cho cả timeout, đứt mạng và 4xx/5xx;
//   • X-Request-Id — chuẩn gokit bắt buộc, và là thứ dán vào ticket cho BE tra;
//   • interceptor 401 đúng một lần, có khoá chống bão refresh.
import { isTimeoutError, timeoutMs as readTimeoutMs, timeoutSignal } from '../config/timeout';
import { createLogger } from '../logger/logger';
import type { Logger } from '../logger/types';
import type { Page, PageMeta } from '../types/wire';
import { gokitDialect, type Dialect } from './dialect';
import { codeFromStatus, HttpError } from './errors';
import { withQuery, type QueryParams } from './query';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Kết quả một lời gọi đã bóc vỏ: dữ liệu, và khối phân trang nếu envelope có.
 *
 * `page` phải đi kèm ngay từ đây chứ không bóc lại ở `list()`: envelope gokit
 * để `data` và `page` NGANG HÀNG, nên hàm nào chỉ trả `data` là đã vứt con trỏ
 * trang đi — và `list()` không có đường nào lấy lại.
 */
interface Sent<T> {
  data: T;
  page?: PageMeta;
}

export interface RetryOptions {
  /** Số lần thử LẠI (không tính lần đầu). 0 = tắt. */
  attempts: number;
  /** Chỉ thử lại method idempotent — mặc định GET/HEAD. */
  methods: readonly string[];
  /** Status đáng thử lại. 429 KHÔNG nằm trong mặc định: chưa có Retry-After ở gokit. */
  statuses: readonly number[];
  /** Chờ `backoffMs * 2^n` giữa các lần. */
  backoffMs: number;
}

/**
 * Mặc định thận trọng: chỉ GET/HEAD, chỉ lỗi hạ tầng tạm thời.
 *
 * KHÔNG thử lại khi hết hạn chờ: người dùng vừa chờ trọn hạn rồi, thử lại là
 * bắt họ chờ thêm ngần ấy nữa. Cũng KHÔNG thử lại POST/PUT/PATCH/DELETE —
 * gokit chưa có `Idempotency-Key` (đang P2), nên thử lại một lệnh ghi là có
 * thể tạo hai bản ghi.
 */
export const DEFAULT_RETRY: RetryOptions = {
  attempts: 2,
  methods: ['GET', 'HEAD'],
  statuses: [502, 503],
  backoffMs: 300,
};

export interface HttpClientOptions {
  /** Origin + mount path, ví dụ `https://gw.example.com/orders`. Dấu `/` cuối được cắt. */
  baseUrl: string;
  /** Nhãn ngắn trong log: 'gateway' | 'iam' | 'billing'. */
  service?: string;
  /** Luật bóc vỏ. Mặc định `gokitDialect`. */
  dialect?: Dialect;
  /** Header gắn vào mọi request. Hàm thì được gọi lại mỗi lần gửi. */
  headers?: Record<string, string> | (() => Record<string, string>);
  /** Lấy access token hiện tại. Trả `null` = gửi không kèm Authorization. */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  /**
   * Gặp 401 thì gọi ĐÚNG MỘT LẦN; trả token mới thì gửi lại chính request đó.
   * Trả `null` = không cứu được, 401 nổi lên cho chỗ gọi.
   *
   * Đặt ở đây chứ không ở từng chỗ gọi: có hàng chục endpoint, bọc tay từng cái
   * thì chỗ quên sẽ là chỗ người dùng gặp lỗi.
   */
  onUnauthorized?: () => Promise<string | null>;
  /**
   * Chờ rồi thử LẠI LẦN CUỐI khi token vừa refresh cũng bị 401.
   *
   * Đo được ở camera-ai-platform 2026-08-26: một service trả UNAUTHENTICATED
   * cho access_token Keycloak vừa đúc, dùng chỉ 93–193ms sau khi cấp — nghi do
   * tầng introspection/cache của nó trễ hơn Keycloak một hai giây. Lệch đồng hồ
   * đã loại trừ. Đặt 0 để tắt.
   */
  freshTokenGraceMs?: number;
  /** Hạn chờ mỗi lời gọi. Mặc định đọc `HTTP_TIMEOUT_MS`, rơi về 10s. */
  timeoutMs?: number;
  retry?: Partial<RetryOptions> | false;
  /** Tiêm fetch khác (test, hoặc fetch có proxy). Mặc định `globalThis.fetch`. */
  fetch?: FetchLike;
  logger?: Logger;
  /** Sinh `X-Request-Id`. Mặc định `crypto.randomUUID()`. */
  requestId?: () => string;
}

export interface RequestOptions {
  query?: QueryParams;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Ghi đè hạn chờ cho đúng lời gọi này (export, upload…). */
  timeoutMs?: number;
  /** ID nghiệp vụ để in kèm block log — không đi vào request. */
  logIds?: Record<string, string | undefined>;
  /**
   * Khai bằng union chuỗi chứ không dùng `RequestCache` của lib DOM: kit chạy
   * cả trên React Native, nơi tsconfig thường không nạp `lib: ["DOM"]` — và
   * lỗi biên dịch khi đó nằm trong node_modules, chỗ người dùng kit không sửa được.
   */
  cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached';
  /** `next: { revalidate, tags }` của Next.js. Kit không đọc, chỉ chuyển tiếp. */
  next?: unknown;
}

export interface HttpClient {
  readonly baseUrl: string;
  readonly service: string;
  request<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  /** GET một collection gokit → trang đã bóc vỏ. */
  list<T>(path: string, options?: RequestOptions): Promise<Page<T>>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  del<T>(path: string, options?: RequestOptions): Promise<T>;
  /** Client con dùng chung cấu hình, thêm header cố định. */
  withHeaders(extra: Record<string, string>): HttpClient;
}

function defaultRequestId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseMaybeJson(text: string): unknown {
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const service = options.service ?? 'api';
  const dialect = options.dialect ?? gokitDialect;
  const log = options.logger ?? createLogger(`http:${service}`);
  const doFetch: FetchLike = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const newRequestId = options.requestId ?? defaultRequestId;
  const defaultTimeout = options.timeoutMs ?? readTimeoutMs('HTTP_TIMEOUT_MS');
  const grace = options.freshTokenGraceMs ?? 2_000;
  const retry: RetryOptions | null =
    options.retry === false ? null : { ...DEFAULT_RETRY, ...options.retry };

  function build(extraHeaders: Record<string, string>): HttpClient {
    async function send<T>(
      method: string,
      path: string,
      body: unknown,
      opts: RequestOptions,
      token: string | null,
      mayRefresh: boolean,
    ): Promise<Sent<T>> {
      const fullPath = withQuery(path.startsWith('/') ? path : `/${path}`, opts.query);
      const url = `${baseUrl}${fullPath}`;
      const staticHeaders = typeof options.headers === 'function' ? options.headers() : (options.headers ?? {});
      const hasBody = body !== undefined && method !== 'GET' && method !== 'HEAD';
      const headers: Record<string, string> = {
        accept: 'application/json',
        'x-request-id': newRequestId(),
        ...(hasBody ? { 'content-type': 'application/json' } : {}),
        ...staticHeaders,
        ...extraHeaders,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      };
      const target = { service, method, baseUri: baseUrl, path: fullPath, ids: opts.logIds };
      const requestLog = { token, headers, body };
      const timeout = opts.timeoutMs ?? defaultTimeout;

      const attemptOnce = async (): Promise<{ status: number; parsed: unknown; contentType: string | undefined }> => {
        const init: RequestInit = {
          method,
          headers,
          ...(hasBody ? { body: JSON.stringify(body) } : {}),
          ...(opts.cache ? ({ cache: opts.cache } as Record<string, unknown>) : {}),
          ...(opts.next !== undefined ? ({ next: opts.next } as Record<string, unknown>) : {}),
          // Signal của caller thắng: caller đã tự quản vòng đời thì kit không chen vào.
          signal: opts.signal ?? timeoutSignal(timeout),
        };
        const res = await doFetch(url, init);
        // text() rồi tự parse: body chỉ đọc được MỘT lần, mà ta cần vừa log
        // nguyên văn vừa parse. res.json() sẽ nuốt mất nội dung khi lỗi.
        const text = await res.text();
        return { status: res.status, parsed: parseMaybeJson(text), contentType: res.headers.get('content-type') ?? undefined };
      };

      const started = Date.now();
      let lastNetworkError: unknown;
      const maxAttempts = retry && retry.methods.includes(method) ? retry.attempts + 1 : 1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (attempt > 0 && retry) await sleep(retry.backoffMs * 2 ** (attempt - 1));

        let result: Awaited<ReturnType<typeof attemptOnce>>;
        try {
          result = await attemptOnce();
        } catch (e) {
          // Hết hạn chờ KHÔNG thử lại: người dùng vừa chờ trọn hạn rồi.
          if (isTimeoutError(e)) {
            log.http({ target, request: requestLog, durationMs: Date.now() - started, error: e });
            throw new HttpError({
              status: 504, code: 'TIMEOUT', method, url, cause: e,
              message: `Quá hạn ${timeout}ms khi gọi ${method} ${fullPath}`,
            });
          }
          lastNetworkError = e;
          if (attempt < maxAttempts - 1) continue;
          log.http({ target, request: requestLog, durationMs: Date.now() - started, error: e });
          throw new HttpError({
            status: 0, code: 'SERVICE_UNAVAILABLE', method, url, cause: e,
            message: `Không gọi được ${method} ${fullPath}: ${e instanceof Error ? e.message : String(e)}`,
          });
        }

        const { status, parsed, contentType } = result;
        const outcome = dialect.parse({ status, body: parsed, contentType });

        if (outcome.ok) {
          log.http({
            target, request: requestLog,
            response: { status, body: parsed, ok: true },
            durationMs: Date.now() - started,
          });
          return outcome.page
            ? { data: outcome.data as T, page: outcome.page }
            : { data: outcome.data as T };
        }

        const isLastAttempt = attempt === maxAttempts - 1;
        if (!isLastAttempt && retry && retry.statuses.includes(status)) continue;

        // 401: xin token mới rồi gửi LẠI đúng request này, một lần duy nhất.
        if (mayRefresh && status === 401 && options.onUnauthorized) {
          const fresh = await options.onUnauthorized();
          if (fresh) {
            try {
              return await send<T>(method, path, body, opts, fresh, false);
            } catch (e) {
              if (grace <= 0 || !(e instanceof HttpError) || e.status !== 401) throw e;
              log.warn(`401 kể cả với token vừa refresh — chờ ${grace}ms rồi thử lần cuối`, { path: fullPath });
              await sleep(grace);
              const out = await send<T>(method, path, body, opts, fresh, false);
              log.warn('lượt sau khi chờ ĐÃ QUA — token mới cần thời gian lan tới API', { path: fullPath });
              return out;
            }
          }
        }

        log.http({
          target, request: requestLog,
          response: { status, body: parsed, ok: false },
          durationMs: Date.now() - started,
          error: { name: 'HttpError', status, code: outcome.problem.code },
        });
        throw new HttpError({
          status: outcome.problem.status || status,
          code: outcome.problem.code || codeFromStatus(status),
          message: outcome.problem.detail ?? outcome.problem.title,
          problem: outcome.problem,
          body: parsed,
          method,
          url,
        });
      }

      // Không tới được: vòng lặp hoặc trả về hoặc ném ở lần cuối.
      throw new HttpError({
        status: 0, code: 'INTERNAL_ERROR', method, url, cause: lastNetworkError,
        message: `Vòng thử lại kết thúc không có kết quả cho ${method} ${fullPath}`,
      });
    }

    async function request<T>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
      const token = (await options.getToken?.()) ?? null;
      const sent = await send<T>(method, path, body, opts, token, true);
      return sent.data;
    }

    return {
      baseUrl,
      service,
      request,
      get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, undefined, opts),
      post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, body, opts),
      put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PUT', path, body, opts),
      patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PATCH', path, body, opts),
      del: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, undefined, opts),
      async list<T>(path: string, opts: RequestOptions = {}): Promise<Page<T>> {
        const token = (await options.getToken?.()) ?? null;
        const sent = await send<unknown>('GET', path, undefined, opts, token, true);
        return toPage<T>(sent.data, sent.page, path);
      },
      withHeaders: (extra) => build({ ...extraHeaders, ...extra }),
    };
  }

  return build({});
}

/**
 * Bóc collection thành `Page<T>`.
 *
 * Ba trường hợp gặp thật, và cả ba đều phải sống được:
 *   • gokit chuẩn: `data` là mảng, khối `page` đi kèm từ dialect;
 *   • service cũ trả thẳng mảng, không có `page` → coi như một trang, hết;
 *   • service trả `{items, total}` → nhận, vì đó vẫn là một trang đọc được.
 */
function toPage<T>(raw: unknown, page: PageMeta | undefined, path: string): Page<T> {
  if (Array.isArray(raw)) {
    return {
      items: raw as T[],
      hasMore: page?.hasMore ?? false,
      ...(page?.nextCursor !== undefined ? { nextCursor: page.nextCursor } : {}),
      ...(page?.limit !== undefined ? { limit: page.limit } : {}),
      ...(page?.total !== undefined ? { total: page.total } : {}),
    };
  }
  if (typeof raw === 'object' && raw !== null) {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.items)) {
      return {
        items: r.items as T[],
        hasMore: r.hasMore === true,
        ...(typeof r.nextCursor === 'string' ? { nextCursor: r.nextCursor } : {}),
        ...(typeof r.total === 'number' ? { total: r.total } : {}),
      };
    }
  }
  throw new HttpError({
    status: 0,
    code: 'INTERNAL_ERROR',
    method: 'GET',
    url: path,
    message: `list() chờ một mảng ở "data" nhưng nhận ${typeof raw}. Dùng get() nếu endpoint này trả tài nguyên đơn.`,
    body: raw,
  });
}
