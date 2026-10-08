// Cookie mang trạng thái DỞ DANG của một lượt đăng nhập (PKCE verifier, state,
// nonce). Sống vài phút, chết ngay sau callback.
//
// Vì sao là cookie httpOnly chứ không phải localStorage: `verifier` là bí mật
// một lần; đọc được nó cộng với `code` là đổi được token. localStorage thì mọi
// script trên trang đọc được.
import type { OidcTx } from 'fe-kit/auth';
import type { NextResponse } from 'next/server';

export const TX_COOKIE = 'oidc_tx';
// 30 phút, khớp "Login timeout" mặc định của Keycloak — app không được là bên hẹp hơn.
// 600s từng làm hỏng bước cài 2FA lần đầu ở camera-ai-platform (cài app authenticator +
// quét QR vượt 10 phút ⇒ callback mất cookie, báo `missing_params` trông như lỗi IdP).
const TX_MAX_AGE = 1800;

const OPTIONS = {
  httpOnly: true as const,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function writeTx(res: NextResponse, tx: OidcTx): void {
  res.cookies.set(TX_COOKIE, JSON.stringify(tx), { ...OPTIONS, maxAge: TX_MAX_AGE });
}

export function clearTx(res: NextResponse): void {
  res.cookies.set(TX_COOKIE, '', { ...OPTIONS, maxAge: 0 });
}

export function readTx(raw: string | undefined): OidcTx | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OidcTx;
  } catch {
    return null;
  }
}
