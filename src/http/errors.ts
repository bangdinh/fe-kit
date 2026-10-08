// Một kiểu lỗi duy nhất cho mọi lời gọi HTTP của kit.
//
// Vì sao một kiểu: chỗ gọi không nên phải phân biệt `DOMException` tên
// 'TimeoutError', `TypeError` của fetch khi đứt mạng, và body lỗi của backend.
// Cả ba đều là "lời gọi không thành", khác nhau ở `status` và `code`.
import { GOKIT_FALLBACK_4XX, GOKIT_FALLBACK_5XX, GOKIT_STATUS_TO_CODE } from '../types/contract.gen';
import type { ErrorCode, FieldError, ProblemDetails } from '../types/wire';

export interface HttpErrorInit {
  status: number;
  code: ErrorCode;
  /** Câu ngắn cho log. KHÔNG dùng để hiển thị cho người dùng cuối. */
  message: string;
  /** Problem Details nguyên văn, nếu backend trả đúng RFC 9457. */
  problem?: ProblemDetails;
  /** Body nguyên văn khi không phải Problem Details (phương ngữ cũ, HTML, text). */
  body?: unknown;
  method: string;
  url: string;
  cause?: unknown;
}

/**
 * Lỗi của một lời gọi HTTP.
 *
 * `status` 0 nghĩa là **chưa từng có phản hồi** (DNS, TCP, CORS, đứt mạng);
 * `status` 504 kèm `code: 'TIMEOUT'` nghĩa là kit tự cắt vì quá hạn chờ, không
 * phải backend trả 504. Hai chuyện đó khác nhau khi đọc log, nên không gộp.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly problem?: ProblemDetails;
  readonly body?: unknown;
  readonly method: string;
  readonly url: string;

  constructor(init: HttpErrorInit) {
    super(init.message, init.cause !== undefined ? { cause: init.cause } : undefined);
    this.name = 'HttpError';
    this.status = init.status;
    this.code = init.code;
    this.problem = init.problem;
    this.body = init.body;
    this.method = init.method;
    this.url = init.url;
  }

  /** `traceId` của gokit — dán vào ticket là BE tra được đúng request. */
  get traceId(): string | undefined {
    return this.problem?.traceId;
  }

  /** Lỗi theo field. Rỗng trừ khi `code === 'VALIDATION_FAILED'`. */
  get fieldErrors(): readonly FieldError[] {
    return this.problem?.errors ?? [];
  }

  /** Lời gọi chưa từng chạm tới backend (đứt mạng, DNS, CORS). */
  get isNetwork(): boolean {
    return this.status === 0;
  }

  get isTimeout(): boolean {
    return this.code === 'TIMEOUT';
  }
}

export function isHttpError(e: unknown): e is HttpError {
  return e instanceof HttpError;
}

/**
 * So mã lỗi — dùng thay cho so `e.message`.
 *
 * `message` là văn bản cho người đọc, backend đổi lúc nào cũng được và FE
 * không có cách nào biết. `code` là hợp đồng.
 */
export function hasErrorCode(e: unknown, ...codes: ErrorCode[]): boolean {
  return isHttpError(e) && codes.includes(e.code);
}

/**
 * Suy mã gokit từ HTTP status — dùng khi backend không trả `code`.
 *
 * Luật là của gokit (`errors.CodeForHTTPStatus`), đọc từ `contract.gen.ts`. Status
 * dưới 400 (phương ngữ cũ trả lỗi kèm 200) đi theo nhánh 4xx: đó vẫn là lỗi mà
 * backend đã trả lời được, không phải lỗi phía server.
 */
export function codeFromStatus(status: number): ErrorCode {
  return GOKIT_STATUS_TO_CODE[status] ?? (status >= 500 ? GOKIT_FALLBACK_5XX : GOKIT_FALLBACK_4XX);
}
