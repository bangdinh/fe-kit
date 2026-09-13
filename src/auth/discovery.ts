// Nạp discovery doc OIDC (I/O + cache) và dựng `OidcConfig`.
//
// Kit KHÔNG biết bảng môi trường của sản phẩm — nó nhận thẳng `discoveryUrl` và
// danh tính client. Sản phẩm suy hai thứ đó từ `defineEnvironments` của mình.
import { timeoutMs, timeoutSignal } from '../config/timeout';
import { OidcError } from './errors';

export interface OidcConfig {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  endSessionEndpoint?: string;
  clientId: string;
  /** Public client (PKCE, không secret) thì bỏ trống. */
  clientSecret?: string;
  redirectUri: string;
  scope: string;
  prompt?: string;
  idpHint?: string;
  uiLocales?: string;
}

interface DiscoveryDoc {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

const discoveryCache = new Map<string, DiscoveryDoc>();

/**
 * Keycloak: một realm = một issuer. URL discovery của realm `r`.
 *
 * Có hệ đặt **một công ty một realm**, và khi đó mã doanh nghiệp người dùng gõ
 * ở màn login CHÍNH LÀ realm. Trong hệ đó, mọi bước sau (verify `iss`, JWKS,
 * refresh, logout) PHẢI dùng đúng realm của lúc login — nên realm phải được lưu
 * theo phiên, không suy lại từ môi trường.
 */
export function realmDiscoveryUrl(issuerRoot: string, realm: string): string {
  const root = issuerRoot.replace(/\/+$/, '');
  return `${root}/realms/${encodeURIComponent(realm)}/.well-known/openid-configuration`;
}

/**
 * WORKAROUND đã trả giá: vài Keycloak dev/local trả endpoint KHÔNG reachable từ
 * ngoài (`http://localhost:8081`) thay vì domain public vừa dùng để fetch
 * discovery. Ghi đè origin của các endpoint MẠNG (authorize/token/jwks); GIỮ
 * NGUYÊN `issuer` vì token stamp `iss` theo đó và phải khớp lúc verify.
 * No-op khi đã đúng domain.
 */
function fixUnreachableEndpoints(doc: DiscoveryDoc, discoveryUrl: string): DiscoveryDoc {
  const realOrigin = new URL(discoveryUrl).origin;
  const issuerOrigin = new URL(doc.issuer).origin;
  if (realOrigin === issuerOrigin) return doc;

  const rewrite = (u: string) => {
    const parsed = new URL(u);
    return `${realOrigin}${parsed.pathname}${parsed.search}`;
  };
  return {
    ...doc,
    authorization_endpoint: rewrite(doc.authorization_endpoint),
    token_endpoint: rewrite(doc.token_endpoint),
    jwks_uri: rewrite(doc.jwks_uri),
    end_session_endpoint: doc.end_session_endpoint ? rewrite(doc.end_session_endpoint) : undefined,
  };
}

export async function fetchDiscovery(url: string): Promise<DiscoveryDoc> {
  const cached = discoveryCache.get(url);
  if (cached) return cached;
  let res: Response;
  try {
    res = await fetch(url, { signal: timeoutSignal(timeoutMs('OIDC_TIMEOUT_MS')) });
  } catch (e) {
    throw new OidcError('discovery_failed', { cause: e });
  }
  if (!res.ok) throw new OidcError('discovery_failed', { status: res.status });
  const raw = (await res.json()) as DiscoveryDoc;
  const doc = fixUnreachableEndpoints(raw, url);
  discoveryCache.set(url, doc);
  return doc;
}

export function resetDiscoveryCache(): void {
  discoveryCache.clear();
}

export interface LoadOidcConfigOptions {
  discoveryUrl: string;
  clientId: string;
  clientSecret?: string;
  /**
   * Nên suy từ origin của chính request (route login/callback) — luôn khớp
   * domain thật. Giá trị tĩnh chỉ là đường lui khi không có request context.
   */
  redirectUri: string;
  scope?: string;
  prompt?: string;
  idpHint?: string;
  uiLocales?: string;
}

/**
 * `prompt` mặc định BỎ TRỐNG, có chủ đích.
 *
 * `prompt=login` ép IdP dựng lại màn đăng nhập ở MỌI lượt authorize, tức vứt bỏ
 * phiên SSO vừa tạo: mở tab thứ hai, hay quay lại `/login` sau khi đã đăng
 * nhập, đều phải gõ lại mật khẩu — đúng thứ SSO sinh ra để khỏi phải làm.
 */
export async function loadOidcConfig(opts: LoadOidcConfigOptions): Promise<OidcConfig> {
  const disc = await fetchDiscovery(opts.discoveryUrl);
  return {
    issuer: disc.issuer,
    authorizationEndpoint: disc.authorization_endpoint,
    tokenEndpoint: disc.token_endpoint,
    jwksUri: disc.jwks_uri,
    endSessionEndpoint: disc.end_session_endpoint,
    clientId: opts.clientId,
    clientSecret: opts.clientSecret || undefined,
    redirectUri: opts.redirectUri,
    scope: opts.scope ?? 'openid',
    prompt: opts.prompt,
    idpHint: opts.idpHint,
    uiLocales: opts.uiLocales,
  };
}
