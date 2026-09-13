// Hạn chờ cho mọi lời gọi mạng của kit.
//
// Không có timeout thì hỏng-kiểu-treo tệ hơn hỏng-kiểu-lỗi: client của kit
// chạy trong middleware / RSC / Server Action, nên một backend không phản hồi
// treo cả trang cho tới khi socket của platform tự bỏ cuộc — hàng chục giây,
// và người dùng chỉ thấy tab quay mãi.
import { envNumber } from './env';

/** Dài hơn mọi lần backend khoẻ mạnh, ngắn hơn kiên nhẫn người dùng. */
export const DEFAULT_TIMEOUT_MS = 10_000;

/** Đọc hạn chờ từ env; thiếu hoặc không phải số dương thì về mặc định. */
export function timeoutMs(envKey: string, fallback = DEFAULT_TIMEOUT_MS): number {
  return envNumber(envKey, fallback);
}

/**
 * AbortSignal tự huỷ sau `ms`.
 *
 * `AbortSignal.timeout` có ở Node ≥18 và Edge runtime nhưng KHÔNG chắc có trên
 * mọi bản Hermes/React Native, nên có đường lui bằng AbortController. Nhánh lui
 * huỷ không kèm lý do (chữ ký `abort(reason)` chưa có ở lib của RN) nên lỗi ném
 * ra mang `name = 'AbortError'` thay vì `'TimeoutError'` — dùng `isTimeoutError`
 * để bắt cả hai thay vì so tên.
 */
export function timeoutSignal(ms: number): AbortSignal {
  const ctor = AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal };
  if (typeof ctor.timeout === 'function') return ctor.timeout(ms);

  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/** Lỗi này có phải do hết hạn chờ / bị huỷ hay không. */
export function isTimeoutError(e: unknown): boolean {
  return e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
}
