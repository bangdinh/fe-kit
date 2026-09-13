// Chấm quyền. Thuần, không I/O.
//
//   allow(action, resource) = contractActive
//                             ∧ ∃ binding b: b.active
//                                          ∧ action ∈ b.actions
//                                          ∧ resource ∈ scope(b)
//
// Dấu ∧ nằm TRONG ∃. Kéo ra ngoài (gộp actions của mọi role rồi mới so với
// scope gộp) là leo thang quyền: vai trò Viewer phạm vi rộng cộng vai trò Admin
// phạm vi hẹp sẽ thành Admin phạm vi rộng.
import type { AccessProfile, RoleBinding } from './types';

export interface ResourceIndex {
  /** id → id cha, `null` nếu là gốc. Không có khoá = không biết resource đó. */
  parentOf: ReadonlyMap<string, string | null>;
}

/** Chặn vòng lặp vô hạn khi dữ liệu cây bị lỗi tạo cycle. */
export const MAX_RESOURCE_DEPTH = 32;

/** Grant ở node cha kế thừa xuống toàn bộ con — leo ngược lên gốc. */
export function inScope<A extends string>(
  b: RoleBinding<A>,
  idx: ResourceIndex,
  resourceId: string,
): boolean {
  if (b.scopeAll) return true;

  let id: string | null = resourceId;
  for (let depth = 0; id !== null && depth < MAX_RESOURCE_DEPTH; depth++) {
    if (b.scope.has(id)) return true;
    id = idx.parentOf.get(id) ?? null;
  }
  return false;
}

/**
 * Gate KHÔNG phụ thuộc resource: hiện mục menu, cho vào trang.
 * MỌI thao tác thật phải dùng `canOn`.
 */
export function can<A extends string>(p: AccessProfile<A>, action: A): boolean {
  return p.contractActive && p.bindings.some((b) => b.active && b.actions.has(action));
}

/** Chấm quyền trên một resource cụ thể. */
export function canOn<A extends string>(
  p: AccessProfile<A>,
  action: A,
  resourceId: string,
  idx: ResourceIndex,
): boolean {
  return (
    p.contractActive &&
    p.bindings.some((b) => b.active && b.actions.has(action) && inScope(b, idx, resourceId))
  );
}

/**
 * Action bị chặn vì gói dịch vụ — dùng để hiện "nâng gói" thay vì ẩn hẳn.
 * KHÔNG phải quyết định bảo mật; quyết định bảo mật là `can`/`canOn`.
 */
export function isLicenseBlocked<A extends string>(p: AccessProfile<A>, action: A): boolean {
  return p.licenseBlocked.has(action);
}

/** Hồ sơ rỗng — chưa đăng nhập, hoặc chưa tải xong. Từ chối mọi thứ. */
export function emptyAccessProfile<A extends string = string>(tenantId = ''): AccessProfile<A> {
  return {
    tenantId,
    contractActive: false,
    bindings: [],
    maxRank: 0,
    licenseBlocked: new Set<A>(),
  };
}
