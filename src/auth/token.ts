// Token endpoint: dựng body (thuần) + đổi code / refresh lấy token (I/O).
import { timeoutMs, timeoutSignal } from '../config/timeout';
import { OidcError } from './errors';

export interface TokenSet {
  access_token: string;
  /** Có ở `authorization_code`; ở refresh có thể vắng tuỳ cấu hình IdP. */
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
  /** Hạn refresh_token (giây) — dùng đặt maxAge cookie. Có IdP trả 0. */
  refresh_expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface TokenExchangeParams {
  clientId: string;
  clientSecret?: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export function buildTokenBody(p: TokenExchangeParams): URLSearchParams {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: p.clientId,
    code: p.code,
    code_verifier: p.codeVerifier,
    redirect_uri: p.redirectUri,
  });
  if (p.clientSecret) body.set('client_secret', p.clientSecret);
  return body;
}

export interface RefreshParams {
  tokenEndpoint: string;
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
}

/**
 * Body `x-www-form-urlencoded` cho grant refresh_token (thuần).
 *
 * Không nhận `tokenEndpoint`: đó là chuyện của lời gọi HTTP, không phải của
 * body — nhờ vậy test dựng body được mà không cần bịa endpoint.
 */
export function buildRefreshBody(p: Omit<RefreshParams, 'tokenEndpoint'>): URLSearchParams {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: p.clientId,
    refresh_token: p.refreshToken,
  });
  if (p.clientSecret) body.set('client_secret', p.clientSecret);
  return body;
}

async function postToken(
  tokenEndpoint: string,
  body: URLSearchParams,
  failCode: 'token_exchange_failed' | 'refresh_failed',
): Promise<TokenSet> {
  let res: Response;
  try {
    res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: timeoutSignal(timeoutMs('OIDC_TIMEOUT_MS')),
    });
  } catch (e) {
    // Timeout/DNS/TCP đều quy về cùng một mã: caller chỉ cần biết "không lấy
    // được token", nguyên nhân đi kèm ở `cause` cho log.
    throw new OidcError(failCode, { cause: e });
  }
  if (!res.ok) {
    // IdP trả JSON `{error, error_description}` — đây là chỗ phân biệt "phiên
    // hết hạn" (`invalid_grant`) với "cấu hình client sai" (`invalid_client`).
    // Body lỗi không chứa token.
    const details = (await res.json().catch(() => undefined)) as unknown;
    throw new OidcError(failCode, { details, status: res.status });
  }
  return (await res.json()) as TokenSet;
}

/** Đổi authorization code → token (PKCE). Ném `OidcError` nếu thất bại. */
export async function exchangeCode(
  opts: TokenExchangeParams & { tokenEndpoint: string },
): Promise<TokenSet> {
  return postToken(opts.tokenEndpoint, buildTokenBody(opts), 'token_exchange_failed');
}

// Refresh đang bay, khoá theo chính refresh_token.
//
// Keycloak (và IdP tương tự) bật rotation kèm reuse-detection: hai lời gọi SONG
// SONG cùng một refresh_token thì cái thứ hai không chỉ hỏng — nó bị coi là dấu
// hiệu token bị đánh cắp và CẢ PHIÊN bị thu hồi. Hai tab, hoặc web và mobile
// dùng chung gói này, đâm nhau đúng kiểu đó. Chống ở đây, nơi biết chuyện, thay
// vì dặn từng caller.
const inFlight = new Map<string, Promise<TokenSet>>();

/**
 * Đổi refresh_token → token set mới.
 *
 * IdP thường BẬT rotation: mỗi lần gọi trả refresh_token MỚI và vô hiệu cái cũ.
 * Caller PHẢI ghi đè chỗ lưu bằng giá trị mới.
 *
 * Gọi song song cùng một refresh_token thì mọi lời gọi dùng CHUNG một request —
 * cùng nhận một token set, không ai double-spend.
 */
export async function refreshTokens(p: RefreshParams): Promise<TokenSet> {
  const key = p.refreshToken;
  const running = inFlight.get(key);
  if (running) return running;

  const call = postToken(p.tokenEndpoint, buildRefreshBody(p), 'refresh_failed')
    // Xoá khoá NGAY khi xong: token cũ đã chết, lần refresh sau mang khoá khác.
    // `finally` chứ không `then` — hỏng cũng phải dọn, nếu không một lần lỗi
    // đóng băng mọi lần thử lại về đúng promise hỏng đó.
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, call);
  return call;
}
