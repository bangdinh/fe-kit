// Factory + cấu hình toàn cục. Mức log đọc từ env một lần, đổi được lúc chạy
// (test dùng configureLogger để bắt bản ghi thay vì spy console).
import { rawEnv } from '../config/env';
import { httpContext, type HttpLogEntry } from './http';
import { sanitize } from './redact';
import { jsonSink, prettySink } from './sinks';
import type { LogContext, LogLevel, Logger, LogRecord, LogSink, RecordLevel } from './types';

const RANK: Record<LogLevel, number> = {
  debug: 10, info: 20, warn: 30, error: 40, silent: 99,
};

// Edge/browser/React Native có thể không có `process` → đọc qua `globalThis`,
// xem ghi chú ở `config/env.ts` để biết vì sao không viết thẳng chữ `process`.
function env(key: string): string | undefined {
  return rawEnv(key);
}

function isProduction(): boolean {
  return env('NODE_ENV') === 'production';
}

/**
 * Có được phép in FULL token / Authorization header / body không cắt hay không.
 *
 * Cổng này là OPT-IN tường minh, KHÔNG suy ra từ NODE_ENV. Bản cũ redact khi và
 * chỉ khi NODE_ENV === 'production', nghĩa là mọi môi trường còn lại — staging,
 * UAT, container quên set biến, bundle client/RN nơi `process` không tồn tại —
 * đều dump nguyên JWT ở mức info. Môi trường không rõ ràng thì phải im lặng,
 * không phải nói hết.
 */
function allowFullSecretsInHttpLog(): boolean {
  if (isProduction()) return false;
  return env('LOG_HTTP_INSECURE') === '1' && env('NODE_ENV') === 'development';
}

/**
 * Ngân sách riêng cho block HTTP khi VẪN redact.
 *
 * Trần mặc định của sanitize là 8 tầng / 100 phần tử — đủ in đầy đủ context
 * thường lẫn object lồng vừa (role.features[].{urn,scopes}). Body API vẫn có thể
 * sâu/hơn ngần đó, nên mọi mảng lồng (cây resource, danh sách device kèm
 * channel) in ra thành đúng một chuỗi '[Array]'. Body chính là thứ cần đọc ở
 * block này.
 *
 * Nới sâu KHÔNG làm lộ bí mật: redact chạy theo TÊN KEY ở mọi độ sâu, và
 * maxString vẫn cắt 300 ký tự. Đây là đánh đổi dung lượng log, không phải bảo mật.
 */
const HTTP_BUDGET = { maxDepth: 12, maxItems: 50 } as const;

/**
 * Body ĐẦY ĐỦ, nhưng VẪN redact.
 *
 * Tách khỏi `LOG_HTTP_INSECURE` có chủ đích — hai thứ khác hẳn nhau:
 *   • `LOG_HTTP_INSECURE` bỏ MASK (in nguyên JWT, Authorization). Bí mật. Chặn
 *     cứng ở production.
 *   • `LOG_HTTP_FULL_BODY` chỉ bỏ TRẦN CẮT (sâu / số phần tử / độ dài chuỗi).
 *     Redact theo tên key vẫn chạy, nên token và mật khẩu vẫn `***`.
 *
 * Vì sao cần: trần mặc định 50 phần tử biến một body playback 630 đoạn ghi
 * thành `"… (+580)"` — đúng phần QC cần đọc thì bị cắt. Cho phép bật ở beta để
 * người test đọc được body thật mà không phải mở khoá bí mật.
 *
 * ⚠ Vẫn là opt-in tường minh, và body có thể chứa dữ liệu cá nhân — bật khi
 * đang truy một lỗi cụ thể, đừng để bật thường trực. Log phình rất nhanh:
 * KHÔNG có trần nào còn hiệu lực ngoài vòng chống lặp vòng của `sanitize`.
 */
function fullHttpBody(): boolean {
  return env('LOG_HTTP_FULL_BODY') === '1';
}

const HTTP_FULL_BUDGET = {
  maxDepth: Number.POSITIVE_INFINITY,
  maxItems: Number.POSITIVE_INFINITY,
  maxString: Number.POSITIVE_INFINITY,
} as const;

function defaultLevel(): LogLevel {
  // NEXT_PUBLIC_/EXPO_PUBLIC_ để bật debug được cả ở bundle client/mobile.
  const raw = env('LOG_LEVEL') ?? env('NEXT_PUBLIC_LOG_LEVEL') ?? env('EXPO_PUBLIC_LOG_LEVEL');
  if (raw && raw in RANK) return raw as LogLevel;
  return isProduction() ? 'info' : 'debug';
}

let currentLevel: LogLevel = defaultLevel();
let currentSink: LogSink = isProduction() ? jsonSink : prettySink;

export interface LoggerOptions {
  level?: LogLevel;
  sink?: LogSink;
}

/** Gọi một lần ở composition root của app (hoặc trong test). */
export function configureLogger(options: LoggerOptions): void {
  if (options.level) currentLevel = options.level;
  if (options.sink) currentSink = options.sink;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

/** Trả về mức log về mặc định theo env — dùng để dọn state giữa các test. */
export function resetLogger(): void {
  currentLevel = defaultLevel();
  currentSink = isProduction() ? jsonSink : prettySink;
}

export function createLogger(scope: string): Logger {
  const emit = (level: RecordLevel, message: string, context?: LogContext): void => {
    if (RANK[level] < RANK[currentLevel]) return;
    const record: LogRecord = {
      time: new Date().toISOString(),
      level,
      scope,
      message,
      // sanitize ở đây, KHÔNG ở sink: mọi sink đều nhận dữ liệu đã an toàn.
      ...(context ? { context: sanitize(context) as LogContext } : {}),
    };
    // Đọc currentSink tại thời điểm gọi → configureLogger sau khi tạo logger vẫn có tác dụng.
    currentSink(record);
  };

  return {
    debug: (message, context) => emit('debug', message, context),
    info:  (message, context) => emit('info', message, context),
    warn:  (message, context) => emit('warn', message, context),
    error: (message, context) => emit('error', message, context),
    http: (entry) => {
      const full = httpContext(
        'kind' in entry && entry.kind === 'http'
          ? { target: entry.target, request: entry.request, response: entry.response, durationMs: entry.durationMs, error: entry.error }
          : entry as Omit<HttpLogEntry, 'kind'>,
      );
      const failed = !!full.error || (full.response !== undefined && full.response.status >= 400);
      const method = full.target.method;
      const path = full.target.path;
      // Mặc định redact. Chỉ dev BẬT HẲN LOG_HTTP_INSECURE=1 mới thấy full
      // token + headers + body tree — xem allowFullSecretsInHttpLog().
      const context = (allowFullSecretsInHttpLog()
        ? sanitize(full, {
            redact: false,
            maxString: Number.POSITIVE_INFINITY,
            maxDepth: 24,
            maxItems: 500,
          })
        : sanitize(full, fullHttpBody() ? HTTP_FULL_BUDGET : HTTP_BUDGET)) as LogContext;
      // info (không phải debug) để luôn thấy API + Params khi LOG_LEVEL mặc định prod=info.
      const level: RecordLevel = failed ? 'error' : 'info';
      if (RANK[level] < RANK[currentLevel]) return;
      currentSink({
        time: new Date().toISOString(),
        level,
        scope,
        message: `HTTP ${method} ${path}`,
        context,
      });
    },
    child: (sub) => createLogger(`${scope}:${sub}`),
  };
}
