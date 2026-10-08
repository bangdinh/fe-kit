// Đối chiếu bản viết tay (wire.ts, codeFromStatus) với hợp đồng gokit đã vendor.
// Lệch là test đỏ — sửa ở gokit hoặc sửa bản viết tay, không sửa contract.gen.ts.
import { describe, expect, it } from 'vitest';
import contract from '../../contract/gokit-rest-contract.json' with { type: 'json' };
import { codeFromStatus } from '../http/errors';
import type {
  GokitDataEnvelope,
  GokitFieldError,
  GokitPageEnvelope,
  GokitPageMeta,
  GokitProblemDetail,
} from './contract.gen';
import { GOKIT_ERROR_CODES } from './contract.gen';
import type { CollectionEnvelope, Envelope, FieldError, PageMeta, ProblemDetails } from './wire';

// So tập khoá và tập khoá optional — không so kiểu từng field, vì wire.ts cố ý khai
// `code: ErrorCode` lỏng hơn `string`, và `T` của envelope là của sản phẩm.
type Keys<T> = keyof T;
type OptionalKeys<T> = { [K in keyof T]-?: object extends Pick<T, K> ? K : never }[keyof T];
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type SameShape<A, B> = Same<Keys<A>, Keys<B>> extends true ? Same<OptionalKeys<A>, OptionalKeys<B>> : false;

describe('wire.ts khớp hình dạng gokit', () => {
  it('khoá và optional của từng envelope', () => {
    const checks: Record<string, true> = {
      Envelope: true satisfies SameShape<Envelope<unknown>, GokitDataEnvelope>,
      CollectionEnvelope: true satisfies SameShape<CollectionEnvelope<unknown>, GokitPageEnvelope>,
      PageMeta: true satisfies SameShape<PageMeta, GokitPageMeta>,
      // `instance` là thành viên RFC 9457 kit giữ cho backend cũ; gokit không gửi.
      ProblemDetails: true satisfies SameShape<Omit<ProblemDetails, 'instance'>, GokitProblemDetail>,
      FieldError: true satisfies SameShape<FieldError, GokitFieldError>,
    };
    expect(Object.values(checks).every(Boolean)).toBe(true);
  });
});

describe('contract.gen.ts khớp file JSON đã vendor', () => {
  it('đủ mã lỗi, đúng thứ tự', () => {
    expect([...GOKIT_ERROR_CODES]).toEqual(contract.errorCodes.map((e) => e.code));
  });
});

describe('codeFromStatus theo luật của gokit', () => {
  it.each(contract.statusToCode.statuses.map((s) => [s.status, s.code] as const))('%i → %s', (status, code) => {
    expect(codeFromStatus(status)).toBe(code);
  });

  it('status không có tên đi theo fallback', () => {
    expect(codeFromStatus(499)).toBe(contract.statusToCode.fallback4xx);
    expect(codeFromStatus(599)).toBe(contract.statusToCode.fallback5xx);
  });

  it('dưới 400 (phương ngữ cũ báo lỗi kèm 200) đi theo nhánh 4xx', () => {
    expect(codeFromStatus(200)).toBe(contract.statusToCode.fallback4xx);
  });
});
