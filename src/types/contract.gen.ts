// SINH TỰ ĐỘNG từ b2b-gokit contract/rest-contract.json — KHÔNG sửa tay.
// Nguồn: b2b-gokit v0.8.7 (7e746cc11a9285111dc88aeca884f2b8260adbc8).
// Sinh lại: make contract-sync GOKIT_REF=<tag>. Lý do: docs/gokit-source-of-truth.md.

export const GOKIT_CONTRACT_SOURCE = { ref: 'v0.8.7', commit: '7e746cc11a9285111dc88aeca884f2b8260adbc8' } as const;

/** Mã lỗi ổn định của gokit (`errors.Codes()`). */
export const GOKIT_ERROR_CODES = [
  'NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INVALID_INPUT',
  'VALIDATION_FAILED',
  'ALREADY_EXISTS',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'TIMEOUT',
  'RATE_LIMITED',
  'CONFLICT',
  'PRECONDITION_FAILED',
  'OUT_OF_RANGE',
  'UNIMPLEMENTED',
  'DATA_LOSS',
] as const;

export type GokitErrorCode = (typeof GOKIT_ERROR_CODES)[number];

/** `errors.CodeForHTTPStatus` cho mọi status 4xx/5xx có tên. */
export const GOKIT_STATUS_TO_CODE: Readonly<Record<number, GokitErrorCode>> = {
  400: 'INVALID_INPUT',
  401: 'UNAUTHORIZED',
  402: 'INVALID_INPUT',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'INVALID_INPUT',
  406: 'INVALID_INPUT',
  407: 'INVALID_INPUT',
  408: 'INVALID_INPUT',
  409: 'CONFLICT',
  410: 'INVALID_INPUT',
  411: 'INVALID_INPUT',
  412: 'PRECONDITION_FAILED',
  413: 'INVALID_INPUT',
  414: 'INVALID_INPUT',
  415: 'INVALID_INPUT',
  416: 'INVALID_INPUT',
  417: 'INVALID_INPUT',
  418: 'INVALID_INPUT',
  421: 'INVALID_INPUT',
  422: 'VALIDATION_FAILED',
  423: 'INVALID_INPUT',
  424: 'INVALID_INPUT',
  425: 'INVALID_INPUT',
  426: 'INVALID_INPUT',
  428: 'INVALID_INPUT',
  429: 'RATE_LIMITED',
  431: 'INVALID_INPUT',
  451: 'INVALID_INPUT',
  500: 'INTERNAL_ERROR',
  501: 'UNIMPLEMENTED',
  502: 'SERVICE_UNAVAILABLE',
  503: 'SERVICE_UNAVAILABLE',
  504: 'TIMEOUT',
  505: 'INTERNAL_ERROR',
  506: 'INTERNAL_ERROR',
  507: 'INTERNAL_ERROR',
  508: 'INTERNAL_ERROR',
  510: 'INTERNAL_ERROR',
  511: 'INTERNAL_ERROR',
};

/** Status không có trong bảng trên: 4xx → `FALLBACK_4XX`, còn lại → `FALLBACK_5XX`. */
export const GOKIT_FALLBACK_4XX: GokitErrorCode = 'INVALID_INPUT';
export const GOKIT_FALLBACK_5XX: GokitErrorCode = 'INTERNAL_ERROR';

export const GOKIT_PROBLEM_CONTENT_TYPE = 'application/problem+json';

/** `domain.DefaultLimit` / `domain.MaxLimit` — gửi quá trần thì BE tự kẹp. */
export const GOKIT_DEFAULT_LIMIT = 20;
export const GOKIT_MAX_LIMIT = 100;

/** Header client được gửi. Header do gateway gắn (X-User-Id…) cố ý không có ở đây. */
export const GOKIT_HEADERS = {
  requestId: 'X-Request-Id',
  correlationId: 'X-Correlation-Id',
  idempotencyKey: 'Idempotency-Key',
} as const;

// Hình dạng dây đúng như struct tag của gokit. wire.ts đối chiếu với các interface
// này trong wire.contract.test.ts: thêm/bớt khoá hay đổi optional là test đỏ.
export interface GokitDataEnvelope {
  data: unknown;
}

export interface GokitPageEnvelope {
  data: unknown[];
  page: Record<string, unknown>;
}

export interface GokitPageMeta {
  limit?: number;
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export interface GokitProblemDetail {
  type: string;
  title: string;
  status: number;
  code: string;
  traceId?: string;
  detail?: string;
  errors?: unknown[];
}

export interface GokitFieldError {
  field: string;
  code?: string;
  reason: string;
}
