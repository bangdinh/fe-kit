// Verify JWT qua JWKS (I/O + cache).
import { createRemoteJWKSet, jwtVerify } from 'jose';

/** Claims chuẩn OIDC + phần mở rộng của IdP/sản phẩm. */
export interface OidcClaims {
  sub: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  email?: string;
  nonce?: string;
  [k: string]: unknown;
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export interface VerifyOptions {
  issuer: string;
  jwksUri: string;
  /** `access_token` của Keycloak có `aud` khác `id_token` → để trống khi verify nó. */
  audience?: string;
}

/**
 * Verify `id_token` / `access_token` qua JWKS. Ném lỗi nếu không hợp lệ.
 *
 * Bộ khoá cache theo `jwksUri`: mỗi realm một bộ, và `jose` tự làm mới khi gặp
 * `kid` lạ. Cache theo issuer thay vì theo URI sẽ trộn khoá giữa các realm.
 */
export async function verifyToken(token: string, opts: VerifyOptions): Promise<OidcClaims> {
  let jwks = jwksCache.get(opts.jwksUri);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(opts.jwksUri));
    jwksCache.set(opts.jwksUri, jwks);
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer: opts.issuer,
    ...(opts.audience ? { audience: opts.audience } : {}),
  });
  return payload as OidcClaims;
}

/** Xoá cache JWKS — dùng trong test, hoặc khi IdP xoay khoá gốc. */
export function resetJwksCache(): void {
  jwksCache.clear();
}
