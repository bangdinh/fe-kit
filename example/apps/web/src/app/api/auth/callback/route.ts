import { completeLogin, isOidcError } from 'fe-kit/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { oidcConfig, sessionCookies } from '@/lib/session';
import { clearTx, readTx, TX_COOKIE } from '../tx';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get('code');
  const state = params.get('state');
  const tx = readTx(req.cookies.get(TX_COOKIE)?.value);

  if (!code || !state || !tx) return fail(req, 'missing_params');

  try {
    const cfg = await oidcConfig(req.nextUrl.origin);
    const { tokens } = await completeLogin(cfg, { code, state, tx });

    const res = NextResponse.redirect(new URL(tx.redirectTo, req.url));
    sessionCookies.write(res.cookies, tokens);
    sessionCookies.writeRealm(res.cookies, tx.realm);
    // Mỗi lần đổi code→token thành công là MỘT phiên mới — có thể của người
    // khác, tenant khác. Tenant của phiên trước KHÔNG được đi theo.
    sessionCookies.clearTenant(res.cookies);
    clearTx(res);
    return res;
  } catch (e) {
    return fail(req, isOidcError(e) ? e.code : 'token_exchange_failed');
  }
}

function fail(req: NextRequest, reason: string) {
  const url = new URL('/login', req.url);
  url.searchParams.set('error', reason);
  const res = NextResponse.redirect(url);
  // Dọn sạch trước khi quay lại login: cookie chết để nguyên là nguyên nhân
  // của vòng lặp login → app → login mà không có thông báo nào.
  sessionCookies.clear(res.cookies);
  clearTx(res);
  return res;
}
