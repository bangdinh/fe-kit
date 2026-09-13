import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpClient, type FetchLike } from './client';
import { HttpError, hasErrorCode } from './errors';
import { configureLogger, resetLogger } from '../logger/logger';

beforeEach(() => {
  // Log ra sink rỗng: test này nói về hành vi mạng, không phải về log.
  configureLogger({ level: 'silent', sink: () => {} });
  return () => resetLogger();
});

function jsonResponse(status: number, body: unknown, contentType = 'application/json'): Response {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'content-type': contentType },
  });
}

function clientWith(fetchImpl: FetchLike, extra: Record<string, unknown> = {}) {
  return createHttpClient({ baseUrl: 'https://api.test/v1/', service: 'test', fetch: fetchImpl, ...extra });
}

describe('createHttpClient — đường thành công', () => {
  it('bóc envelope và cắt dấu / thừa ở baseUrl', async () => {
    const fetchMock = vi.fn<FetchLike>(async () => jsonResponse(200, { data: { id: 'x' } }));
    const api = clientWith(fetchMock);
    await expect(api.get('/things/x')).resolves.toEqual({ id: 'x' });
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/v1/things/x');
  });

  it('list() giữ con trỏ trang', async () => {
    const api = clientWith(async () =>
      jsonResponse(200, { data: [{ id: 1 }], page: { hasMore: true, nextCursor: 'eyJ', total: 42 } }),
    );
    await expect(api.list('/things')).resolves.toEqual({
      items: [{ id: 1 }],
      hasMore: true,
      nextCursor: 'eyJ',
      total: 42,
    });
  });

  it('gắn Authorization và X-Request-Id', async () => {
    const fetchMock = vi.fn<FetchLike>(async () => jsonResponse(200, { data: null }));
    const api = clientWith(fetchMock, { getToken: () => 'tok-1' });
    await api.get('/me');
    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer tok-1');
    expect(headers['x-request-id']).toMatch(/.+/);
  });

  it('query dựng từ options, không phải nối chuỗi ở chỗ gọi', async () => {
    const fetchMock = vi.fn<FetchLike>(async () => jsonResponse(200, { data: [], page: { hasMore: false } }));
    await clientWith(fetchMock).list('/things', { query: { limit: 20, sort: '-createdAt', q: undefined } });
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/v1/things?limit=20&sort=-createdAt');
  });

  it('204 trả undefined, không ném', async () => {
    const api = clientWith(async () => new Response(null, { status: 204 }));
    await expect(api.del('/things/x')).resolves.toBeUndefined();
  });
});

describe('createHttpClient — lỗi', () => {
  it('Problem Details thành HttpError giữ code, traceId, fieldErrors', async () => {
    const api = clientWith(async () =>
      jsonResponse(
        422,
        {
          type: 'about:blank',
          title: 'Validation failed',
          status: 422,
          code: 'VALIDATION_FAILED',
          traceId: 'tr-9',
          errors: [{ field: 'name', code: 'REQUIRED' }],
        },
        'application/problem+json',
      ),
    );
    const err = await api.post('/things', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    const e = err as HttpError;
    expect(e.status).toBe(422);
    expect(e.code).toBe('VALIDATION_FAILED');
    expect(e.traceId).toBe('tr-9');
    expect(e.fieldErrors).toEqual([{ field: 'name', code: 'REQUIRED' }]);
    expect(hasErrorCode(e, 'VALIDATION_FAILED')).toBe(true);
  });

  it('đứt mạng → status 0, phân biệt được với 504 của timeout', async () => {
    const api = clientWith(async () => {
      throw new TypeError('fetch failed');
    }, { retry: false });
    const e = (await api.get('/x').catch((x: unknown) => x)) as HttpError;
    expect(e.status).toBe(0);
    expect(e.isNetwork).toBe(true);
    expect(e.isTimeout).toBe(false);
  });

  it('quá hạn chờ → 504 TIMEOUT và KHÔNG thử lại', async () => {
    const fetchMock = vi.fn<FetchLike>(async () => {
      const err = new Error('timed out');
      err.name = 'TimeoutError';
      throw err;
    });
    const api = clientWith(fetchMock);
    const e = (await api.get('/x').catch((x: unknown) => x)) as HttpError;
    expect(e.status).toBe(504);
    expect(e.isTimeout).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('200 kèm HTML (trang login của proxy) là lỗi, không phải dữ liệu', async () => {
    const api = clientWith(async () => new Response('<html>login</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    const e = (await api.get('/x').catch((x: unknown) => x)) as HttpError;
    expect(e.code).toBe('INTERNAL_ERROR');
  });
});

describe('createHttpClient — thử lại', () => {
  it('GET gặp 503 thì thử lại và thành công', async () => {
    let n = 0;
    const fetchMock = vi.fn<FetchLike>(async () => {
      n++;
      return n === 1 ? jsonResponse(503, { title: 'down', status: 503, code: 'SERVICE_UNAVAILABLE' }) : jsonResponse(200, { data: 'ok' });
    });
    const api = clientWith(fetchMock, { retry: { backoffMs: 1 } });
    await expect(api.get('/x')).resolves.toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('POST KHÔNG thử lại — gokit chưa có Idempotency-Key', async () => {
    const fetchMock = vi.fn<FetchLike>(async () => jsonResponse(503, { title: 'down', status: 503, code: 'SERVICE_UNAVAILABLE' }));
    const api = clientWith(fetchMock, { retry: { backoffMs: 1 } });
    await expect(api.post('/x', { a: 1 })).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('404 không bao giờ thử lại', async () => {
    const fetchMock = vi.fn<FetchLike>(async () => jsonResponse(404, { title: 'no', status: 404, code: 'NOT_FOUND' }));
    const api = clientWith(fetchMock, { retry: { backoffMs: 1 } });
    await expect(api.get('/x')).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('createHttpClient — interceptor 401', () => {
  it('xin token mới rồi gửi lại đúng request đó', async () => {
    const seen: (string | undefined)[] = [];
    const fetchMock = vi.fn<FetchLike>(async (_url, init) => {
      const h = init!.headers as Record<string, string>;
      seen.push(h.authorization);
      return h.authorization === 'Bearer new'
        ? jsonResponse(200, { data: 'ok' })
        : jsonResponse(401, { title: 'no', status: 401, code: 'UNAUTHORIZED' });
    });
    const onUnauthorized = vi.fn(async () => 'new');
    const api = clientWith(fetchMock, { getToken: () => 'old', onUnauthorized, freshTokenGraceMs: 0 });

    await expect(api.get('/x')).resolves.toBe('ok');
    expect(seen).toEqual(['Bearer old', 'Bearer new']);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('refresh chỉ chạy MỘT lần — token mới vẫn 401 thì lỗi nổi lên', async () => {
    const fetchMock = vi.fn<FetchLike>(async () => jsonResponse(401, { title: 'no', status: 401, code: 'UNAUTHORIZED' }));
    const onUnauthorized = vi.fn(async () => 'new');
    const api = clientWith(fetchMock, { getToken: () => 'old', onUnauthorized, freshTokenGraceMs: 0 });

    await expect(api.get('/x')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('chờ ân hạn rồi thử lần cuối khi token vừa đúc bị từ chối', async () => {
    let calls = 0;
    const fetchMock = vi.fn<FetchLike>(async () => {
      calls++;
      // 1: token cũ 401 · 2: token mới vẫn 401 · 3: sau khi chờ thì qua
      return calls >= 3 ? jsonResponse(200, { data: 'ok' }) : jsonResponse(401, { title: 'no', status: 401, code: 'UNAUTHORIZED' });
    });
    const api = clientWith(fetchMock, {
      getToken: () => 'old',
      onUnauthorized: async () => 'new',
      freshTokenGraceMs: 1,
    });
    await expect(api.get('/x')).resolves.toBe('ok');
    expect(calls).toBe(3);
  });

  it('onUnauthorized trả null = không cứu được, 401 nổi lên ngay', async () => {
    const fetchMock = vi.fn<FetchLike>(async () => jsonResponse(401, { title: 'no', status: 401, code: 'UNAUTHORIZED' }));
    const api = clientWith(fetchMock, { getToken: () => 'old', onUnauthorized: async () => null });
    await expect(api.get('/x')).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('withHeaders', () => {
  it('client con thêm header, không đụng client gốc', async () => {
    const fetchMock = vi.fn<FetchLike>(async () => jsonResponse(200, { data: null }));
    const api = clientWith(fetchMock);
    await api.withHeaders({ 'x-tenant': 't1' }).get('/a');
    await api.get('/b');
    const first = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    const second = fetchMock.mock.calls[1]![1]!.headers as Record<string, string>;
    expect(first['x-tenant']).toBe('t1');
    expect(second['x-tenant']).toBeUndefined();
  });
});
