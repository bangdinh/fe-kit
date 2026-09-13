// Hợp đồng dây của b2b-gokit — bản FE. Nguồn: b2b-gokit `response/response.go`,
// `errors/problem.go`, `errors/codes.go`, `domain/pagination.go`,
// `docs/REST_API_STANDARD.md`.
//
// File này KHÔNG chứa DTO của bất kỳ sản phẩm nào. Nó chỉ mô tả cái vỏ mà mọi
// service gokit trả về; ruột (`T`) là của sản phẩm.

/** Envelope thành công cho tài nguyên đơn: `{"data": {...}}`. */
export interface Envelope<T> {
  data: T;
}

/**
 * Khối phân trang con trỏ.
 *
 * `hasMore` LUÔN có. `limit`/`nextCursor`/`total` là `omitempty` ở Go nên có
 * thể vắng — đặc biệt `total`: gokit chỉ trả khi đếm được với chi phí chấp
 * nhận được. Khai `total` là bắt buộc ở FE là tự dựng một lời nói dối mà
 * `undefined` sẽ phá ở đúng màn hình đông dữ liệu nhất.
 */
export interface PageMeta {
  hasMore: boolean;
  limit?: number;
  nextCursor?: string;
  total?: number;
}

/** Envelope thành công cho collection: `{"data": [...], "page": {...}}`. */
export interface CollectionEnvelope<T> {
  data: T[];
  page: PageMeta;
}

/** Một trang đã bóc vỏ — thứ code sản phẩm thực sự cầm. */
export interface Page<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
  limit?: number;
  total?: number;
}

/**
 * 15 mã lỗi ổn định của gokit (`errors/codes.go`). Đây là thứ FE được phép
 * switch/case — KHÔNG switch theo `title` hay `detail`, hai trường đó là văn
 * bản cho người đọc và đổi được bất cứ lúc nào.
 */
export const GOKIT_ERROR_CODES = [
  'NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INVALID_INPUT',
  'VALIDATION_FAILED',
  'ALREADY_EXISTS',
  'CONFLICT',
  'PRECONDITION_FAILED',
  'OUT_OF_RANGE',
  'RATE_LIMITED',
  'TIMEOUT',
  'SERVICE_UNAVAILABLE',
  'UNIMPLEMENTED',
  'DATA_LOSS',
  'INTERNAL_ERROR',
] as const;

export type GokitErrorCode = (typeof GOKIT_ERROR_CODES)[number];

/**
 * Mã lỗi khai lỏng có chủ đích: `GokitErrorCode` cho autocomplete, `string`
 * cho sự thật lúc chạy. Service mới thêm mã mà FE hạ type xuống `never` thì
 * chỗ `default:` không bao giờ chạy, và lỗi mới trở thành lỗi im lặng.
 */
export type ErrorCode = GokitErrorCode | (string & {});

/** Một lỗi ở cấp field — chỉ có ở `VALIDATION_FAILED`. */
export interface FieldError {
  field: string;
  code: string;
  reason?: string;
}

/** Envelope lỗi RFC 9457 (`application/problem+json`). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: FieldError[];
}

/** Tham số truy vấn chuẩn của collection gokit. */
export interface ListQuery {
  /** Mặc định 20, trần 100 (`domain.ClampLimit`). Gửi quá trần thì BE tự kẹp. */
  limit?: number;
  /** Con trỏ đục. Rỗng/vắng = trang đầu. */
  cursor?: string;
  /** `-createdAt` giảm dần; `createdAt` hoặc `+createdAt` tăng dần. */
  sort?: string;
}

export function isProblemDetails(v: unknown): v is ProblemDetails {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return typeof p.status === 'number' && typeof p.title === 'string' && typeof p.code === 'string';
}

export function isCollectionEnvelope<T>(v: unknown): v is CollectionEnvelope<T> {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return Array.isArray(e.data) && typeof e.page === 'object' && e.page !== null;
}
