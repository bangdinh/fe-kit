import { afterEach, describe, expect, it } from 'vitest';
import { defineEnvironments } from './environments';

const table = {
  uat:  { gateway: 'https://uat-gw.test',  sso: 'https://uat-sso.test' },
  beta: { gateway: 'https://beta-gw.test', sso: 'https://beta-sso.test' },
  prod: { gateway: 'https://gw.test',      sso: 'https://sso.test' },
};

afterEach(() => {
  delete process.env.APP_ENV;
  delete process.env.API_GATEWAY_URI;
  delete process.env.NEXT_PUBLIC_APP_ENV;
});

describe('defineEnvironments', () => {
  it('mặc định là môi trường được khai, KHÔNG phải prod', () => {
    const env = defineEnvironments(table, { default: 'uat' });
    expect(env.current()).toBe('uat');
    expect(env.resolve().gateway).toBe('https://uat-gw.test');
  });

  it('không khai default thì lấy khoá đầu bảng', () => {
    expect(defineEnvironments(table).current()).toBe('uat');
  });

  it('chọn một khoá là MỌI endpoint đi theo — chống lệch môi trường', () => {
    process.env.APP_ENV = 'beta';
    const env = defineEnvironments(table, { default: 'uat' });
    expect(env.resolve()).toEqual({ gateway: 'https://beta-gw.test', sso: 'https://beta-sso.test' });
  });

  it('giá trị lạ ở APP_ENV rơi về default thay vì nổ', () => {
    process.env.APP_ENV = 'khong-ton-tai';
    expect(defineEnvironments(table, { default: 'uat' }).current()).toBe('uat');
  });

  it('đọc được cả tiền tố NEXT_PUBLIC_ / EXPO_PUBLIC_', () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'prod';
    expect(defineEnvironments(table).current()).toBe('prod');
  });

  it('override từng endpoint bằng biến đã khai (devtunnel)', () => {
    process.env.API_GATEWAY_URI = 'https://abc.devtunnels.ms';
    const env = defineEnvironments(table, { default: 'uat', overrides: { gateway: 'API_GATEWAY_URI' } });
    expect(env.resolve().gateway).toBe('https://abc.devtunnels.ms');
    expect(env.resolve().sso).toBe('https://uat-sso.test');
  });

  it('biến override RỖNG nghĩa là "dùng mặc định", không phải chuỗi rỗng', () => {
    process.env.API_GATEWAY_URI = '';
    const env = defineEnvironments(table, { default: 'uat', overrides: { gateway: 'API_GATEWAY_URI' } });
    expect(env.resolve().gateway).toBe('https://uat-gw.test');
  });

  it('bảng rỗng hoặc default sai thì nổ NGAY lúc khai, không đợi lúc gọi', () => {
    expect(() => defineEnvironments({})).toThrow(/bảng rỗng/);
    // @ts-expect-error default không có trong bảng — chặn cả ở type lẫn lúc chạy
    expect(() => defineEnvironments(table, { default: 'staging' })).toThrow(/không có trong bảng/);
  });

  it('endpoint() báo đúng chỗ phải sửa khi thiếu khoá', () => {
    const env = defineEnvironments({ uat: { gateway: '' } });
    expect(() => env.endpoint('gateway')).toThrow(/bảng môi trường của dự án/);
  });
});
