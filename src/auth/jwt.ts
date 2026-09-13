// Đọc payload JWT KHÔNG verify chữ ký — dùng ở nơi không verify được hoặc
// không cần verify (Edge middleware chỉ cần biết token còn hạn hay không).
//
// ⚠ KHÔNG dùng cho quyết định bảo mật. Mọi thứ cần tin cậy phải đi qua
// `verifyToken()` (JWKS).

/** Payload JWT đã decode, hoặc `null` nếu token không đúng định dạng. */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  const seg = token.split('.')[1];
  if (!seg) return null;
  try {
    const pad = seg.length % 4 === 0 ? '' : '='.repeat(4 - (seg.length % 4));
    const json = atob(seg.replace(/-/g, '+').replace(/_/g, '/') + pad);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** `exp` (epoch giây) của token, `null` nếu không đọc được. */
export function jwtExpiresAt(token: string): number | null {
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  return typeof payload?.exp === 'number' ? payload.exp : null;
}

/**
 * Token đã hết hạn (hoặc sắp hết trong `skewSeconds`)?
 * Token không decode được coi như hết hạn — fail-closed.
 */
export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const exp = jwtExpiresAt(token);
  if (exp === null) return true;
  return Date.now() / 1000 + skewSeconds >= exp;
}
