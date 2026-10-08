// Hợp đồng dây của b2b-gokit — bản FE.
//
// Dữ kiện (mã lỗi, luật status → code, trần phân trang, hình dạng envelope) đến từ
// `contract.gen.ts`, sinh từ `contract/rest-contract.json` của gokit — không chép tay.
// File này giữ phần "dùng thế nào ở FE": comment giải thích và type lỏng cho mã lỗi.
// `wire.contract.test.ts` đối chiếu các interface dưới đây với bản sinh ra.
//
// File này KHÔNG chứa DTO của bất kỳ sản phẩm nào. Nó chỉ mô tả cái vỏ mà mọi
// service gokit trả về; ruột (`T`) là của sản phẩm.
import { GOKIT_ERROR_CODES, type GokitErrorCode } from './contract.gen';

export { GOKIT_ERROR_CODES, type GokitErrorCode };

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
 * Mã lỗi khai lỏng có chủ đích: `GokitErrorCode` cho autocomplete, `string`
 * cho sự thật lúc chạy. Service mới thêm mã mà FE hạ type xuống `never` thì
 * chỗ `default:` không bao giờ chạy, và lỗi mới trở thành lỗi im lặng.
 */
export type ErrorCode = GokitErrorCode | (string & {});

/**
 * Một lỗi ở cấp field — chỉ có ở `VALIDATION_FAILED`.
 *
 * `reason` luôn có; `code` (UPPER_SNAKE, vd `REQUIRED`) là `omitempty` ở gokit.
 */
export interface FieldError {
  field: string;
  code?: string;
  reason: string;
}

/**
 * Envelope lỗi RFC 9457 (`application/problem+json`).
 *
 * `instance` là thành viên chuẩn của RFC 9457 mà gokit không gửi; giữ lại vì backend
 * cũ đi qua `envelopeDialect` có thể có.
 */
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
  /** Mặc định `GOKIT_DEFAULT_LIMIT`, trần `GOKIT_MAX_LIMIT`. Gửi quá trần thì BE tự kẹp. */
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
