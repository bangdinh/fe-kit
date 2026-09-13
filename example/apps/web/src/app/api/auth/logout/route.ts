import { buildEndSessionUrl } from 'fe-kit/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { oidcConfig, sessionCookies } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { idToken } = sessionCookies.read(req.cookies);
  const origin = req.nextUrl.origin;

  let target = new URL('/', req.url).toString();
  try {
    const cfg = await oidcConfig(origin);
    if (cfg.endSessionEndpoint) {
      // Thiếu `id_token_hint` thì IdP hỏi lại "có chắc muốn đăng xuất" — đó là
      // lý do id_token phải được giữ suốt phiên, không vứt sau khi đọc claims.
      target = buildEndSessionUrl({
        endSessionEndpoint: cfg.endSessionEndpoint,
        idTokenHint: idToken,
        postLogoutRedirectUri: origin,
        clientId: cfg.clientId,
      });
    }
  } catch {
    // IdP không với tới được thì vẫn phải đăng xuất ở phía mình.
  }

  const res = NextResponse.redirect(target);
  sessionCookies.clear(res.cookies);
  return res;
}
