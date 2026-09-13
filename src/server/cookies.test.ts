import { describe, expect, it } from 'vitest';
import { createSessionCookies, type CookieOptions } from './cookies';

function fakeStore() {
  const map = new Map<string, { value: string; options: CookieOptions }>();
  return {
    set(name: string, value: string, options: CookieOptions) {
      map.set(name, { value, options });
    },
    get(name: string) {
      const hit = map.get(name);
      return hit ? { value: hit.value } : undefined;
    },
    raw: map,
  };
}

const tokens = {
  access_token: 'at',
  refresh_token: 'rt',
  id_token: 'it',
  expires_in: 300,
  refresh_expires_in: 1800,
};

describe('createSessionCookies', () => {
  it('ghi cả bộ, mỗi cái đúng hạn của nó', () => {
    const store = fakeStore();
    const c = createSessionCookies({ secure: true });
    c.write(store, tokens);
    expect(store.raw.get('session_token')!.options.maxAge).toBe(300);
    expect(store.raw.get('refresh_token')!.options.maxAge).toBe(1800);
    expect(store.raw.get('id_token')!.options.maxAge).toBe(1800);
    expect(store.raw.get('session_token')!.options.httpOnly).toBe(true);
  });

  it('refresh_expires_in = 0 (offline token) KHÔNG được biến thành xoá cookie', () => {
    const store = fakeStore();
    const c = createSessionCookies({ refreshMaxAge: 999 });
    c.write(store, { ...tokens, refresh_expires_in: 0 });
    expect(store.raw.get('refresh_token')!.options.maxAge).toBe(999);
  });

  it('tenant sống bằng refresh, không phải cookie phiên trình duyệt', () => {
    const store = fakeStore();
    const c = createSessionCookies({ refreshMaxAge: 1234 });
    c.writeTenant(store, 'company-1');
    expect(store.raw.get('tenant_id')!.options.maxAge).toBe(1234);
  });

  it('realm rỗng thì XOÁ, không giữ giá trị của phiên trước', () => {
    const store = fakeStore();
    const c = createSessionCookies();
    c.writeRealm(store, 'acme');
    expect(store.raw.get('auth_realm')!.value).toBe('acme');
    c.writeRealm(store, undefined);
    expect(store.raw.get('auth_realm')!.value).toBe('');
    expect(store.raw.get('auth_realm')!.options.maxAge).toBe(0);
  });

  it('clear() xoá ĐỦ bộ — không để lại trạng thái nửa vời', () => {
    const store = fakeStore();
    const c = createSessionCookies();
    c.write(store, tokens);
    c.writeTenant(store, 't');
    c.writeRealm(store, 'r');
    c.clear(store);
    for (const name of c.all) {
      expect(store.raw.get(name)!.value).toBe('');
      expect(store.raw.get(name)!.options.maxAge).toBe(0);
    }
  });

  it('đọc lại đúng những gì đã ghi', () => {
    const store = fakeStore();
    const c = createSessionCookies();
    c.write(store, tokens);
    c.writeTenant(store, 'company-1');
    expect(c.read(store)).toEqual({
      accessToken: 'at',
      refreshToken: 'rt',
      idToken: 'it',
      tenantId: 'company-1',
      realm: undefined,
    });
  });

  it('đổi tên cookie được, và `all` đi theo', () => {
    const c = createSessionCookies({ names: { access: 'at_cookie' } });
    expect(c.names.access).toBe('at_cookie');
    expect(c.all).toContain('at_cookie');
  });
});
