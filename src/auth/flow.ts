// Ba bước của Authorization Code + PKCE, gói lại để glue chỉ cần gọi ba hàm.
import { buildAuthorizeUrl } from './authorize';
import type { OidcConfig } from './discovery';
import { OidcError } from './errors';
import { verifyToken, type OidcClaims } from './jwks';
import { generatePkce, randomString } from './pkce';
import { exchangeCode, refreshTokens, type TokenSet } from './token';

/**
 * Trạng thái một lượt đăng nhập đang dở — sống giữa `/login` và `/callback`.
 *
 * Lưu ở cookie ngắn hạn (web) hoặc secure storage (mobile). KHÔNG lưu ở
 * localStorage trên web: `verifier` là bí mật một lần, và XSS đọc được nó là
 * đọc được cả phiên.
 */
export interface OidcTx {
  verifier: string;
  state: string;
  nonce: string;
  /** Nơi đưa người dùng về sau khi đăng nhập xong. */
  redirectTo: string;
  /**
   * Realm/tenant đã dùng ở bước authorize. Callback PHẢI đổi code→token trên
   * ĐÚNG realm đó: token stamp `iss` theo realm và JWKS mỗi realm một bộ.
   */
  realm?: string;
}

export interface LoginStart {
  authorizeUrl: string;
  tx: OidcTx;
}

export interface LoginResult {
  tokens: TokenSet;
  claims: OidcClaims;
}

/** Bước 1 — sinh PKCE + state + nonce, dựng URL authorize. */
export async function startLogin(
  cfg: OidcConfig,
  redirectTo: string,
  realm?: string,
): Promise<LoginStart> {
  const { verifier, challenge } = await generatePkce();
  const state = randomString(24);
  const nonce = randomString(24);
  const authorizeUrl = buildAuthorizeUrl({
    authorizationEndpoint: cfg.authorizationEndpoint,
    clientId: cfg.clientId,
    redirectUri: cfg.redirectUri,
    scope: cfg.scope,
    state,
    nonce,
    codeChallenge: challenge,
    prompt: cfg.prompt,
    idpHint: cfg.idpHint,
    uiLocales: cfg.uiLocales,
  });
  return { authorizeUrl, tx: { verifier, state, nonce, redirectTo, realm } };
}

/** Bước 2 — verify `state`, đổi code→token, verify `id_token` + `nonce`. */
export async function completeLogin(
  cfg: OidcConfig,
  input: { code: string; state: string; tx: OidcTx },
): Promise<LoginResult> {
  if (input.state !== input.tx.state) throw new OidcError('state_mismatch');

  const tokens = await exchangeCode({
    tokenEndpoint: cfg.tokenEndpoint,
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    code: input.code,
    codeVerifier: input.tx.verifier,
    redirectUri: cfg.redirectUri,
  });

  if (!tokens.id_token) throw new OidcError('invalid_id_token');

  let claims: OidcClaims;
  try {
    claims = await verifyToken(tokens.id_token, {
      issuer: cfg.issuer,
      jwksUri: cfg.jwksUri,
      audience: cfg.clientId,
    });
  } catch (e) {
    throw new OidcError('invalid_id_token', { cause: e });
  }
  if (claims.nonce !== input.tx.nonce) throw new OidcError('nonce_mismatch');

  return { tokens, claims };
}

/** Bước 3 — làm mới phiên. `access_token` mới sẽ được verify ở chỗ đọc phiên. */
export async function refreshSession(cfg: OidcConfig, refreshToken: string): Promise<TokenSet> {
  return refreshTokens({
    tokenEndpoint: cfg.tokenEndpoint,
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    refreshToken,
  });
}

export interface EndSessionParams {
  endSessionEndpoint: string;
  idTokenHint?: string;
  postLogoutRedirectUri?: string;
  clientId?: string;
}

/**
 * URL đăng xuất tập trung (RP-Initiated Logout).
 *
 * Thiếu `id_token_hint` thì IdP hỏi lại "bạn có chắc muốn đăng xuất" — đó là lý
 * do `id_token` phải được giữ suốt phiên chứ không vứt sau khi đọc claims.
 */
export function buildEndSessionUrl(p: EndSessionParams): string {
  const u = new URL(p.endSessionEndpoint);
  if (p.idTokenHint) u.searchParams.set('id_token_hint', p.idTokenHint);
  if (p.postLogoutRedirectUri) u.searchParams.set('post_logout_redirect_uri', p.postLogoutRedirectUri);
  if (p.clientId) u.searchParams.set('client_id', p.clientId);
  return u.toString();
}
