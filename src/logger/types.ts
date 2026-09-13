// Hợp đồng của tầng log. Không phụ thuộc runtime nào (Node / Edge / browser /
// React Native) — nơi thực sự ghi ra là LogSink, thay được lúc chạy.
import type { HttpLogEntry } from './http';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/** Mức 'silent' chỉ dùng để TẮT, không bao giờ là mức của một bản ghi. */
export type RecordLevel = Exclude<LogLevel, 'silent'>;

export type LogContext = Record<string, unknown>;

export interface LogRecord {
  time: string;            // ISO — sink tự quyết có in ra hay không
  level: RecordLevel;
  scope: string;           // vd 'api-client', 'web:auth' — luôn có
  message: string;
  context?: LogContext;    // ĐÃ redact + cắt ngắn trước khi tới sink
}

export type LogSink = (record: LogRecord) => void;

export type HttpLogInput = HttpLogEntry | Omit<HttpLogEntry, 'kind'>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /**
   * Log 1 block HTTP: Target / Request / Response.
   * Mức tự chọn: error nếu có error hoặc status ≥ 400, else info (không phải
   * debug — để luôn thấy API + params ở mức mặc định của prod).
   * Token/header luôn bị mask trừ khi bật LOG_HTTP_INSECURE=1 ở dev.
   */
  http(entry: HttpLogInput): void;
  /** Logger con, scope nối bằng ':' — vd createLogger('web').child('auth'). */
  child(scope: string): Logger;
}
