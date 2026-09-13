export type OidcErrorCode =
  | 'state_mismatch'
  | 'nonce_mismatch'
  | 'token_exchange_failed'
  | 'refresh_failed'
  | 'invalid_id_token'
  | 'discovery_failed'
  | 'missing_params';

export interface OidcErrorInfo {
  /** Lỗi gốc (timeout, DNS, TCP…) nếu có. */
  cause?: unknown;
  /** Body lỗi của IdP: `{error, error_description}` — không chứa token. */
  details?: unknown;
  /** HTTP status của lời gọi hỏng. */
  status?: number;
}

export class OidcError extends Error {
  readonly details?: unknown;
  readonly status?: number;

  constructor(public readonly code: OidcErrorCode, info: OidcErrorInfo = {}) {
    super(`OIDC error: ${code}`, info.cause !== undefined ? { cause: info.cause } : undefined);
    this.name = 'OidcError';
    this.details = info.details;
    this.status = info.status;
  }
}

export function isOidcError(e: unknown): e is OidcError {
  return e instanceof OidcError;
}
