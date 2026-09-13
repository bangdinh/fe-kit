import { describe, expect, it } from 'vitest';
import { buildQuery, withQuery } from './query';

describe('buildQuery', () => {
  it('bỏ undefined / null / chuỗi rỗng', () => {
    expect(buildQuery({ a: 1, b: undefined, c: null, d: '' })).toBe('?a=1');
  });

  it('GIỮ false và 0 — chúng là giá trị thật, không phải "không lọc"', () => {
    expect(buildQuery({ active: false, page: 0 })).toBe('?active=false&page=0');
  });

  it('mảng lặp khoá, không nối bằng dấu phẩy', () => {
    expect(buildQuery({ id: ['a', 'b'] })).toBe('?id=a&id=b');
  });

  it('Date thành ISO 8601', () => {
    expect(buildQuery({ from: new Date('2026-01-02T03:04:05.000Z') })).toBe(
      '?from=2026-01-02T03%3A04%3A05.000Z',
    );
  });

  it('không có tham số thì không có dấu ?', () => {
    expect(buildQuery()).toBe('');
    expect(buildQuery({})).toBe('');
  });
});

describe('withQuery', () => {
  it('nối vào path đã có sẵn query bằng &', () => {
    expect(withQuery('/devices?sort=-createdAt', { limit: 20 })).toBe('/devices?sort=-createdAt&limit=20');
  });

  it('path không có query thì mở bằng ?', () => {
    expect(withQuery('/devices', { limit: 20 })).toBe('/devices?limit=20');
  });
});
