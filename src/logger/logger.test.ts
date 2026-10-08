import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureLogger, createLogger, resetLogger } from './logger';
import { prettySink } from './sinks';

afterEach(() => {
  resetLogger();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// Logger không bao giờ được làm hỏng việc nó đang ghi lại. `createHttpClient` gọi
// `log.http` ngay trong luồng của request, nên một sink ném lỗi biến request 200 thành
// lỗi status 0. Hai test dưới tái lập sự cố ở camera-ai-platform ngày 2026-09-25.
describe('sink hỏng không ném ra chỗ gọi', () => {
  it('path bị cắt giữa escape `%xx` không làm log.http ném lỗi', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    configureLogger({ level: 'debug', sink: prettySink });
    const query = 'date_from=19%2F09%2F2026&date_to=25%2F09%2F2026&page=1&page_size=10'
      + '&status=offline%2Conline%2Csync_failed%2Cfirmware_upgrading%2Cfirmware_upgrade_success'
      + '%2CStorageUnformatted%2Cfirmware_upgrade_failed%2CStorageLowSpace%2CStorageNotExist'
      + '%2CStorageDeviceError';
    const path = `/api/v1/enterprises/${'e'.repeat(36)}/device-status/history/?${query}`;
    // Điều kiện tái lập: ký tự 299–300 là `%2` — sanitize cắt chuỗi ở 300.
    expect(path.slice(298, 300)).toBe('%2');

    expect(() => createLogger('api').http({
      target: { service: 'gateway', method: 'POST', baseUri: 'https://gw.test', path },
      request: { headers: {} },
      response: { status: 200, body: { count: 0, results: [] }, ok: true },
      durationMs: 5,
    })).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });

  it('sink ném lỗi thì log nuốt, không ném ra chỗ gọi', () => {
    configureLogger({ level: 'debug', sink: () => { throw new Error('sink hỏng'); } });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createLogger('test');
    expect(() => log.info('x')).not.toThrow();
    expect(() => log.http({
      target: { service: 'gateway', method: 'GET', baseUri: 'https://gw.test', path: '/a' },
    })).not.toThrow();
    expect(err).toHaveBeenCalled();
  });
});
