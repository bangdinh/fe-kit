// Dựng URL /authorize — thuần.
export interface AuthorizeParams {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  /** `login` ép hiện lại màn đăng nhập; bỏ trống thì dùng lại phiên SSO. */
  prompt?: string;
  /** Chọn sẵn identity provider trong realm (Keycloak `kc_idp_hint`). */
  idpHint?: string;
  /**
   * Ngôn ngữ màn đăng nhập, BCP-47 (`vi`), KHÔNG phải thẻ kiểu Java (`vi_VN`).
   * Keycloak so `ui_locales` với danh sách locale của theme; thẻ sai không khớp
   * gì nên nó im lặng rơi về `defaultLocale` của realm.
   */
  uiLocales?: string;
  /** Tham số thêm của IdP cụ thể. */
  extra?: Record<string, string>;
}

export function buildAuthorizeUrl(p: AuthorizeParams): string {
  const u = new URL(p.authorizationEndpoint);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    scope: p.scope,
    state: p.state,
    nonce: p.nonce,
    code_challenge: p.codeChallenge,
    code_challenge_method: 'S256',
  });
  if (p.prompt) params.set('prompt', p.prompt);
  if (p.idpHint) params.set('kc_idp_hint', p.idpHint);
  if (p.uiLocales) params.set('ui_locales', p.uiLocales);
  for (const [k, v] of Object.entries(p.extra ?? {})) params.set(k, v);
  u.search = params.toString();
  return u.toString();
}
