import { describe, expect, it } from 'vitest';
import { envelopeDialect, gokitDialect, passthroughDialect } from './dialect';

const ct = 'application/json';

describe('gokitDialect', () => {
  it('bóc `data` của tài nguyên đơn', () => {
    const out = gokitDialect.parse({ status: 200, body: { data: { id: 'a' } }, contentType: ct });
    expect(out).toEqual({ ok: true, data: { id: 'a' } });
  });

  it('giữ khối `page` của collection — đây là thứ list() cần', () => {
    const out = gokitDialect.parse({
      status: 200,
      body: { data: [1, 2], page: { hasMore: true, nextCursor: 'eyJ', limit: 2 } },
      contentType: ct,
    });
    expect(out).toEqual({
      ok: true,
      data: [1, 2],
      page: { hasMore: true, nextCursor: 'eyJ', limit: 2 },
    });
  });

  it('`total` vắng thì KHÔNG bịa ra 0 — gokit chỉ trả khi đếm được', () => {
    const out = gokitDialect.parse({ status: 200, body: { data: [], page: { hasMore: false } }, contentType: ct });
    expect(out.ok && out.page).toEqual({ hasMore: false });
    expect(out.ok && 'total' in (out.page ?? {})).toBe(false);
  });

  it('204 không body là thành công, data undefined', () => {
    expect(gokitDialect.parse({ status: 204, body: undefined, contentType: undefined })).toEqual({
      ok: true,
      data: undefined,
    });
  });

  it('lỗi RFC 9457 đi qua nguyên vẹn, giữ traceId và errors', () => {
    const problem = {
      type: 'about:blank',
      title: 'Validation failed',
      status: 422,
      code: 'VALIDATION_FAILED',
      traceId: 'tr-1',
      errors: [{ field: 'name', code: 'REQUIRED' }],
    };
    const out = gokitDialect.parse({ status: 422, body: problem, contentType: 'application/problem+json' });
    expect(out).toEqual({ ok: false, problem });
  });

  it('lỗi không đúng RFC thì vẫn ra Problem, mã suy từ status', () => {
    const out = gokitDialect.parse({ status: 404, body: 'not found', contentType: 'text/plain' });
    expect(out.ok).toBe(false);
    expect(!out.ok && out.problem.code).toBe('NOT_FOUND');
    expect(!out.ok && out.problem.detail).toBe('not found');
  });

  it('200 mà thiếu khoá `data` là LỖI, không phải dữ liệu', () => {
    // Hay gặp nhất: proxy/SSO trả trang HTML với status 200.
    const out = gokitDialect.parse({ status: 200, body: { items: [] }, contentType: ct });
    expect(out.ok).toBe(false);
    expect(!out.ok && out.problem.code).toBe('INTERNAL_ERROR');
  });
});

describe('envelopeDialect', () => {
  const legacy = envelopeDialect({
    name: 'legacy',
    // Backend cũ: lỗi cũng trả HTTP 200, phán quyết nằm trong body.
    isSuccess: ({ body }) => (body as { code?: number } | undefined)?.code === 1200,
    error: ({ status, body }) => {
      const b = body as { code?: number; error?: string } | undefined;
      return {
        type: 'about:blank',
        title: b?.error ?? 'Lỗi',
        status,
        code: String(b?.code ?? status),
      };
    },
  });

  it('nhận thành công theo mã trong body, không theo HTTP status', () => {
    expect(legacy.parse({ status: 200, body: { code: 1200, data: { x: 1 } }, contentType: ct })).toEqual({
      ok: true,
      data: { x: 1 },
    });
  });

  it('HTTP 200 mà mã trong body là lỗi thì vẫn là lỗi', () => {
    const out = legacy.parse({ status: 200, body: { code: 140308, error: 'forbidden' }, contentType: ct });
    expect(out.ok).toBe(false);
    expect(!out.ok && out.problem.code).toBe('140308');
  });
});

describe('passthroughDialect', () => {
  it('trả nguyên body khi không có vỏ', () => {
    expect(passthroughDialect.parse({ status: 200, body: [1, 2], contentType: ct })).toEqual({
      ok: true,
      data: [1, 2],
    });
  });
});
