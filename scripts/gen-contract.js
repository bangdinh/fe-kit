#!/usr/bin/env node
// Sinh src/types/contract.gen.ts từ contract/gokit-rest-contract.json.
//
//   node scripts/gen-contract.js          ghi file
//   node scripts/gen-contract.js --check  chỉ so; lệch thì exit 1 (make contract-verify)
//
// File sinh ra là dữ kiện của gokit, không phải của kit: mã lỗi, luật status → code,
// trần phân trang, tên header, hình dạng envelope. Phần "dùng thế nào" ở FE (comment
// giải thích, type lỏng cho mã lỗi) vẫn viết tay ở wire.ts và đối chiếu với file này.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED_SCHEMA = 1;
const OUT = join(root, 'src/types/contract.gen.ts');

const contract = JSON.parse(readFileSync(join(root, 'contract/gokit-rest-contract.json'), 'utf8'));
const source = JSON.parse(readFileSync(join(root, 'contract/gokit-source.json'), 'utf8'));

if (contract.schemaVersion !== SUPPORTED_SCHEMA) {
  console.error(
    `✗ gokit-rest-contract.json có schemaVersion ${contract.schemaVersion}, generator chỉ đọc ${SUPPORTED_SCHEMA}.\n` +
      '  Định dạng file đã đổi ở gokit — sửa scripts/gen-contract.js trước.',
  );
  process.exit(1);
}

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const TS_TYPE = { string: 'string', number: 'number', boolean: 'boolean', array: 'unknown[]', object: 'Record<string, unknown>', unknown: 'unknown' };

function iface(name, fields) {
  const lines = fields.map((f) => {
    const t = TS_TYPE[f.type];
    if (!t) throw new Error(`Kiểu lạ "${f.type}" ở field ${f.name}`);
    return `  ${f.name}${f.optional ? '?' : ''}: ${t};`;
  });
  return `export interface ${name} {\n${lines.join('\n')}\n}`;
}

const codes = contract.errorCodes.map((e) => e.code);
const statusLines = contract.statusToCode.statuses.map((s) => `  ${s.status}: ${q(s.code)},`);

const out = `// SINH TỰ ĐỘNG từ b2b-gokit contract/rest-contract.json — KHÔNG sửa tay.
// Nguồn: b2b-gokit ${source.ref} (${source.commit}).
// Sinh lại: make contract-sync GOKIT_REF=<tag>. Lý do: docs/gokit-source-of-truth.md.

export const GOKIT_CONTRACT_SOURCE = { ref: ${q(source.ref)}, commit: ${q(source.commit)} } as const;

/** Mã lỗi ổn định của gokit (\`errors.Codes()\`). */
export const GOKIT_ERROR_CODES = [
${codes.map((c) => `  ${q(c)},`).join('\n')}
] as const;

export type GokitErrorCode = (typeof GOKIT_ERROR_CODES)[number];

/** \`errors.CodeForHTTPStatus\` cho mọi status 4xx/5xx có tên. */
export const GOKIT_STATUS_TO_CODE: Readonly<Record<number, GokitErrorCode>> = {
${statusLines.join('\n')}
};

/** Status không có trong bảng trên: 4xx → \`FALLBACK_4XX\`, còn lại → \`FALLBACK_5XX\`. */
export const GOKIT_FALLBACK_4XX: GokitErrorCode = ${q(contract.statusToCode.fallback4xx)};
export const GOKIT_FALLBACK_5XX: GokitErrorCode = ${q(contract.statusToCode.fallback5xx)};

export const GOKIT_PROBLEM_CONTENT_TYPE = ${q(contract.contentTypes.problem)};

/** \`domain.DefaultLimit\` / \`domain.MaxLimit\` — gửi quá trần thì BE tự kẹp. */
export const GOKIT_DEFAULT_LIMIT = ${contract.pagination.defaultLimit};
export const GOKIT_MAX_LIMIT = ${contract.pagination.maxLimit};

/** Header client được gửi. Header do gateway gắn (X-User-Id…) cố ý không có ở đây. */
export const GOKIT_HEADERS = {
  requestId: ${q(contract.headers.requestId)},
  correlationId: ${q(contract.headers.correlationId)},
  idempotencyKey: ${q(contract.headers.idempotencyKey)},
} as const;

// Hình dạng dây đúng như struct tag của gokit. wire.ts đối chiếu với các interface
// này trong wire.contract.test.ts: thêm/bớt khoá hay đổi optional là test đỏ.
${iface('GokitDataEnvelope', contract.shapes.dataEnvelope)}

${iface('GokitPageEnvelope', contract.shapes.pageEnvelope)}

${iface('GokitPageMeta', contract.shapes.pageMeta)}

${iface('GokitProblemDetail', contract.shapes.problemDetail)}

${iface('GokitFieldError', contract.shapes.fieldError)}
`;

if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {
    // chưa có file thì coi như lệch
  }
  if (current !== out) {
    console.error('✗ src/types/contract.gen.ts lệch khỏi contract/gokit-rest-contract.json\n  Chạy: node scripts/gen-contract.js');
    process.exit(1);
  }
  console.log(`✓ contract.gen.ts khớp hợp đồng gokit ${source.ref}`);
} else {
  writeFileSync(OUT, out);
  console.log(`✓ đã sinh src/types/contract.gen.ts từ gokit ${source.ref}`);
}
