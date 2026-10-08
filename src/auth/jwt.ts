// Đọc payload JWT KHÔNG verify chữ ký — dùng ở nơi không verify được hoặc
// không cần verify (Edge middleware chỉ cần biết token còn hạn hay không).
//
// ⚠ KHÔNG dùng cho quyết định bảo mật. Mọi thứ cần tin cậy phải đi qua
// `verifyToken()` (JWKS).

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Kiểu khai theo hình dạng, lấy qua `globalThis` — không dùng kiểu `TextDecoder` của
// lib DOM, cùng lý do với `CryptoLike` ở pkce.ts.
type TextDecoderCtor = new () => { decode(input: Uint8Array): string };

function utf8(bytes: Uint8Array): string {
  const Ctor = (globalThis as { TextDecoder?: TextDecoderCtor }).TextDecoder;
  if (!Ctor) throw new Error('Runtime không có TextDecoder — cần nó để đọc claim UTF-8 của JWT.');
  return new Ctor().decode(bytes);
}

/**
 * base64url → byte. Không dùng `atob`: nó trả mỗi byte thành một ký tự, nên claim
 * UTF-8 (tên tiếng Việt) ra chữ vỡ. Byte đi qua `TextDecoder` mới ra đúng chuỗi —
 * Hermes có `TextDecoder`, nên chạy được cả trên React Native.
 */
function decodeBase64Url(seg: string): Uint8Array | null {
  const out: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const ch of seg.replace(/=+$/, '')) {
    const v = B64URL.indexOf(ch);
    if (v < 0) return null;
    acc = ((acc << 6) | v) & 0xffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/** Payload JWT đã decode, hoặc `null` nếu token không đúng định dạng. */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  const seg = token.split('.')[1];
  if (!seg) return null;
  const bytes = decodeBase64Url(seg);
  if (!bytes) return null;
  const json = utf8(bytes);
  try {
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
