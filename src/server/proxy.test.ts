import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import type { TokenSet } from '../auth/token';
import { createSessionCookies } from './cookies';
import { createSessionProxy, safeInternalPath } from './proxy';

const b64url = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const jwt = (expInSeconds: number) =>
  `${b64url('{"alg":"none"}')}.${b64url(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expInSeconds }))}.sig`;

const cookies = createSessionCookies({ secure: false });
const fresh: TokenSet = { access_token: jwt(300), refresh_token: 'rt-2', expires_in: 300 } as TokenSet;

function request(path: string, cookieMap: Record<string, string> = {}, init: { method?: string; headers?: Record<string, string> } = {}) {
  const cookie = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
  // Next standalone: req.url luôn là 0.0.0.0:8080 bất kể Host (đo ở camera-ai-platform).
  return new NextRequest(`http://0.0.0.0:8080${path}`, {
    method: init.method ?? 'GET',
    headers: { ...(cookie ? { cookie } : {}), ...init.headers },
  });
}

const setCookieNames = (res: NextResponse) => res.cookies.getAll().map((c) => c.name);

describe('createSessionProxy', () => {
  it('token còn hạn thì cho đi tiếp, không refresh', async () => {
    const refresh = vi.fn();
    const proxy = createSessionProxy({ cookies, refresh });
    const res = await proxy(request('/app', { session_token: jwt(300) }));
    expect(res.headers.get('location')).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('redirect về login dựng trên `origin`, không trên req.url (0.0.0.0 ở standalone)', async () => {
    const proxy = createSessionProxy({
      cookies,
      refresh: vi.fn(),
      origin: () => 'https://app.example.test',
    });
    const res = await proxy(request('/app'));
    expect(res.headers.get('location')).toBe('https://app.example.test/login?returnTo=%2Fapp');
  });

  it('loginPath theo request (locale)', async () => {
    const proxy = createSessionProxy({
      cookies,
      refresh: vi.fn(),
      origin: () => 'https://app.example.test',
      loginPath: (req) => `/${req.nextUrl.pathname.split('/')[1]}/login`,
    });
    const res = await proxy(request('/vi/live'));
    expect(new URL(res.headers.get('location') ?? '').pathname).toBe('/vi/login');
  });

  it('refresh xong thì ghi token mới vào response VÀ request (RSC cùng lượt đọc được)', async () => {
    const proxy = createSessionProxy({ cookies, refresh: async () => fresh });
    const res = await proxy(request('/app', { session_token: jwt(-10), refresh_token: 'rt-1' }));
    expect(res.cookies.get('session_token')?.value).toBe(fresh.access_token);
    expect(res.cookies.get('refresh_token')?.value).toBe('rt-2');
    expect(res.headers.get('x-middleware-request-cookie') ?? '').toContain(`session_token=${fresh.access_token}`);
  });

  it('`next` nối middleware khác (next-intl) và vẫn nhận token mới', async () => {
    const next = vi.fn((req: NextRequest) => {
      const res = NextResponse.next({ request: { headers: req.headers } });
      res.headers.set('x-intl', '1');
      return res;
    });
    const proxy = createSessionProxy({ cookies, refresh: async () => fresh, next });
    const res = await proxy(request('/app', { session_token: jwt(-10), refresh_token: 'rt-1' }));
    expect(res.headers.get('x-intl')).toBe('1');
    expect(res.cookies.get('session_token')?.value).toBe(fresh.access_token);
    // Request đưa cho `next` đã mang token mới.
    expect(next.mock.calls[0]?.[0].cookies.get('session_token')?.value).toBe(fresh.access_token);
  });

  it('path public vẫn đi qua `next` (trang login cũng cần next-intl)', async () => {
    const next = vi.fn(() => NextResponse.next());
    const proxy = createSessionProxy({ cookies, refresh: vi.fn(), next, isPublic: (r) => r.nextUrl.pathname === '/login' });
    await proxy(request('/login'));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('chỉ còn cookie tenant/realm (token đã hết maxAge) thì vẫn dọn khi đá về login', async () => {
    const proxy = createSessionProxy({ cookies, refresh: vi.fn(), origin: () => 'https://app.example.test' });
    const res = await proxy(request('/app', { tenant_id: 'c1', auth_realm: 'b2b' }));
    expect(res.headers.get('location')).not.toBeNull();
    expect(setCookieNames(res)).toEqual(expect.arrayContaining(['tenant_id', 'auth_realm']));
  });

  it('không còn cookie phiên nào thì không ghi Set-Cookie thừa', async () => {
    const proxy = createSessionProxy({ cookies, refresh: vi.fn(), origin: () => 'https://app.example.test' });
    const res = await proxy(request('/app'));
    expect(setCookieNames(res)).toEqual([]);
  });

  describe('Server Action', () => {
    const action = (cookieMap: Record<string, string>) =>
      request('/vi/login', cookieMap, { method: 'POST', headers: { 'next-action': 'abc123' } });

    it('KHÔNG redirect kể cả khi không có phiên — redirect làm React ném "unexpected response"', async () => {
      const proxy = createSessionProxy({ cookies, refresh: vi.fn() });
      const res = await proxy(action({}));
      expect(res.headers.get('location')).toBeNull();
    });

    it('refresh hỏng thì cho đi tiếp, không xoá cookie — action tự gác bằng requireSession', async () => {
      const proxy = createSessionProxy({ cookies, refresh: async () => { throw new Error('invalid_grant'); } });
      const res = await proxy(action({ session_token: jwt(-10), refresh_token: 'rt-1' }));
      expect(res.headers.get('location')).toBeNull();
      expect(setCookieNames(res)).toEqual([]);
    });

    it('refresh được thì vẫn ghi token mới, khỏi refresh lại ở action sau', async () => {
      const proxy = createSessionProxy({ cookies, refresh: async () => fresh });
      const res = await proxy(action({ session_token: jwt(-10), refresh_token: 'rt-1' }));
      expect(res.cookies.get('session_token')?.value).toBe(fresh.access_token);
    });
  });
});

describe('safeInternalPath', () => {
  it.each([
    ['/vi/live?x=1', '/vi/live?x=1'],
    ['//evil.test', '/'],
    ['https://evil.test', '/'],
    ['/\\evil.test', '/'],
    ['live', '/'],
    [null, '/'],
  ])('%s → %s', (input, out) => {
    expect(safeInternalPath(input, '/')).toBe(out);
  });
});
