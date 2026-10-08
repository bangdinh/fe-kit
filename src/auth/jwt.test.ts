import { describe, expect, it } from 'vitest';
import { decodeJwtPayload, isJwtExpired } from './jwt';

const b64url = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const jwt = (payload: object) => `${b64url('{"alg":"none"}')}.${b64url(JSON.stringify(payload))}.sig`;

describe('decodeJwtPayload', () => {
  it('giữ đúng claim UTF-8 — `atob` từng byte làm hỏng tên tiếng Việt', () => {
    expect(decodeJwtPayload(jwt({ name: 'Nguyễn Văn Ánh', exp: 1 }))).toEqual({ name: 'Nguyễn Văn Ánh', exp: 1 });
  });

  it('segment có ký tự ngoài bảng base64url thì trả null', () => {
    expect(decodeJwtPayload('a.b$c.d')).toBeNull();
  });

  it('thiếu segment payload thì trả null', () => {
    expect(decodeJwtPayload('abc')).toBeNull();
  });
});

describe('isJwtExpired', () => {
  it('token không đọc được coi như hết hạn', () => {
    expect(isJwtExpired('rác')).toBe(true);
  });

  it('exp ở tương lai xa thì chưa hết hạn', () => {
    expect(isJwtExpired(jwt({ exp: Math.floor(Date.now() / 1000) + 3600 }))).toBe(false);
  });
});
