// Client gọi backend. Một chỗ dựng, mọi nơi dùng.
//
// `getToken` / `onUnauthorized` do TẦNG GỌI tiêm vào: phía server của web đọc
// token từ cookie phiên, app mobile đọc từ secure storage. Gói này không biết
// token nằm đâu, và không được biết.
import { createHttpClient, type HttpClient } from 'fe-kit/http';
import { env } from './env';

export interface ApiOptions {
  getToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => Promise<string | null>;
}

export function createApi(options: ApiOptions = {}): HttpClient {
  return createHttpClient({
    baseUrl: env.endpoint('gateway'),
    service: 'gateway',
    getToken: options.getToken,
    onUnauthorized: options.onUnauthorized,
    headers: { origin: env.endpoint('webOrigin') },
  });
}

/** Ví dụ một endpoint — xoá khi có endpoint thật. */
export interface HealthDto {
  status: string;
}

export function health(api: HttpClient): Promise<HealthDto> {
  return api.get<HealthDto>('/health');
}
