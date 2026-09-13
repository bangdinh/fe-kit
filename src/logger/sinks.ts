// Sink = nơi bản ghi thực sự đi ra. Đây là ĐIỂM DUY NHẤT trong toàn repo được
// phép gọi console.* — muốn đẩy sang Sentry/OTel sau này chỉ cần viết sink mới
// rồi configureLogger({ sink }), không phải sửa chỗ gọi.
import { formatCurl, httpIds, isHttpLog } from './http';
import type { HttpLogEntry } from './http';
import type { LogRecord, LogSink, RecordLevel } from './types';

const LABEL: Record<RecordLevel, string> = {
  debug: 'DEBUG', info: 'INFO ', warn: 'WARN ', error: 'ERROR',
};

const RULE = '─'.repeat(40);
const PAD = '│   ';

/** Dev: một dòng dễ đọc + context; HTTP → block BaseUrl / Request / Response. */
export const prettySink: LogSink = (record) => {
  if (isHttpLog(record.context)) {
    write(record.level, [formatHttpPretty(record.time, record.level, record.scope, record.context)]);
    return;
  }
  const head = `${record.time.slice(11, 23)} ${LABEL[record.level]} [${record.scope}] ${record.message}`;
  // Context in thành JSON tree, KHÔNG đưa object thô cho console: util.inspect
  // của Node mặc định chỉ đi sâu 2 tầng rồi in đúng chữ '[Array]' / '[Object]',
  // nên dữ liệu lồng (cây resource, danh sách device) biến mất ngay trên
  // terminal dù sanitize đã giữ đủ. Đổi lại là mất object bung được của
  // DevTools — chấp nhận, vì log server đọc ở terminal là chính.
  const args: unknown[] = record.context
    ? [`${head}\n${indentTree(record.context).join('\n')}`]
    : [head];
  write(record.level, args);
};

/** Production: một dòng JSON cho log aggregator (Loki/ELK/CloudWatch) parse. */
export const jsonSink: LogSink = (record) => {
  write(record.level, [safeJson(record)]);
};

function formatHttpPretty(
  time: string,
  level: RecordLevel,
  scope: string,
  http: HttpLogEntry,
): string {
  const { target, request, response, durationMs, error } = http;
  const base = target.baseUri.replace(/\/+$/, '');
  const path = target.path.startsWith('/') ? target.path : `/${target.path}`;

  const lines = [
    `${time.slice(11, 23)} ${LABEL[level]} [${scope}]`,
    `┌${RULE}`,
    `│ BaseUrl   ${base}`,
    `│ API       ${target.method} ${path}`,
    `│           service=${target.service}`,
    `│ Params`,
    ...formatParamsLines(target, request?.body),
    `│ Request`,
    ...formatRequestLines(request),
    `│ CURL`,
    ...formatCurlLines(http),
    `│ Response  ${response ? String(response.status) : '—'}`,
    ...formatBodyTree(response?.body),
  ];
  if (error !== undefined) {
    lines.push(`│ Error`);
    lines.push(...indentTree(error));
  }
  const footer = durationMs !== undefined ? ` ${durationMs}ms ` : '';
  lines.push(`└${RULE}${footer ? `─${footer}` : ''}`);
  return lines.join('\n');
}

function formatCurlLines(http: HttpLogEntry): string[] {
  return formatCurl(http).split('\n').map((line) => `${PAD}${line}`);
}

/** Path ids + query string + body — một chỗ để biết đang gọi API với param gì. */
function formatParamsLines(target: HttpLogEntry['target'], body: unknown): string[] {
  const ids = httpIds(target);
  const query = parseQuery(target.path);
  const lines: string[] = [];

  for (const [k, v] of Object.entries(ids)) {
    lines.push(`${PAD}${k}: ${v}`);
  }
  for (const [k, v] of Object.entries(query)) {
    lines.push(`${PAD}${k}: ${v}`);
  }
  if (body !== undefined) {
    lines.push(`${PAD}body:`);
    lines.push(...indentTree(body, `${PAD}  `));
  }
  if (lines.length === 0) lines.push(`${PAD}(none)`);
  return lines;
}

function parseQuery(path: string): Record<string, string> {
  const q = path.includes('?') ? path.slice(path.indexOf('?') + 1) : '';
  if (!q) return {};
  const out: Record<string, string> = {};
  for (const part of q.split('&')) {
    if (!part) continue;
    const [k, ...rest] = part.split('=');
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}

function formatRequestLines(request: HttpLogEntry['request']): string[] {
  if (!request) return [`${PAD}—`];
  const lines: string[] = [];
  lines.push(`${PAD}token     ${request.token ?? '(none)'}`);
  lines.push(`${PAD}headers`);
  if (request.headers && Object.keys(request.headers).length > 0) {
    lines.push(...indentTree(request.headers, `${PAD}  `));
  } else {
    lines.push(`${PAD}  (none)`);
  }
  if (request.body !== undefined) {
    lines.push(`${PAD}body`);
    lines.push(...indentTree(request.body, `${PAD}  `));
  }
  return lines;
}

function formatBodyTree(body: unknown): string[] {
  if (body === undefined) return [`${PAD}(no body)`];
  return indentTree(body);
}

/** In object/array dạng JSON indent = tree trên console (terminal + DevTools). */
function indentTree(value: unknown, prefix = PAD): string[] {
  let text: string;
  if (typeof value === 'string') {
    // Thử parse JSON string → tree; không được thì giữ nguyên.
    try {
      text = JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      text = value;
    }
  } else {
    try {
      text = JSON.stringify(value, null, 2) ?? String(value);
    } catch {
      text = String(value);
    }
  }
  return text.split('\n').map((line) => `${prefix}${line}`);
}

function write(level: RecordLevel, args: unknown[]): void {
  // Gọi thẳng từng method để giữ đúng `this` của console và để devtools gắn
  // đúng nhãn mức (warn/error mới có filter riêng).
  switch (level) {
    case 'debug': console.debug(...args); break;
    case 'info':  console.info(...args); break;
    case 'warn':  console.warn(...args); break;
    case 'error': console.error(...args); break;
  }
}

function safeJson(record: LogRecord): string {
  try {
    return JSON.stringify(record);
  } catch {
    return JSON.stringify({ ...record, context: '[Unserializable]' });
  }
}
