// Hình dạng phân quyền: WIRE (khớp backend nguyên văn) và DOMAIN (thứ code dùng).
// Chuyển đổi giữa hai bên nằm DUY NHẤT ở `buildAccessProfile`.
//
// `A` là tập mã action của SẢN PHẨM. Kit không biết action nào tồn tại — khai
// `A = string` là mặc định, và sản phẩm hẹp lại bằng union sinh từ OpenAPI của
// mình để có autocomplete và bắt typo.

// ── WIRE ──────────────────────────────────────────────────────────
export interface WireRole {
  id: string;
  rank: number;
  name?: string;
}

/**
 * Cấp công ty, KHÔNG phải cấp vai trò: một người chỉ có một membership dù mang
 * nhiều vai trò. Đình chỉ membership là đình chỉ mọi vai trò cùng lúc.
 */
export interface WireMembership {
  status: string;
  max_rank?: number;
}

export interface WireContract {
  status: string;
  expires_at?: string | null;
}

export interface WirePermission {
  /** Action LÁ, đã bung — không có dạng nhóm `#master`. */
  action: string;
  /** `granted` là quyền. Mọi giá trị khác coi là bị gói dịch vụ chặn. */
  status: string;
}

export interface WireResourceRef {
  resource_type?: string;
  resource_id: string;
}

/**
 * Một vai trò kèm phạm vi resource của RIÊNG nó.
 *
 * Hai mảng dưới khai LỎNG đúng như dây thật: backend hay serialize mảng rỗng
 * thành `null` hoặc bỏ hẳn khoá — gặp nhiều nhất với Owner
 * (`scope_all_resources = true` thì `resources` đằng nào cũng rỗng). Khai chặt
 * hơn sự thật chỉ đẩy TypeError xuống chỗ dùng, và đúng vào những người quyền
 * cao nhất.
 */
export interface WireAssignment {
  role: WireRole;
  scope_all_resources?: boolean;
  permissions?: WirePermission[] | null;
  resources?: WireResourceRef[] | null;
}

export interface WireAccessData {
  membership: WireMembership;
  contract?: WireContract;
  assignments?: WireAssignment[] | null;
}

// ── DOMAIN ────────────────────────────────────────────────────────
export interface RoleRef {
  id: string;
  name: string;
  rank: number;
}

/**
 * Một vai trò = tập action + phạm vi resource của RIÊNG nó.
 * KHÔNG BAO GIỜ gộp actions/scope của nhiều binding — gộp là leo thang quyền.
 */
export interface RoleBinding<A extends string = string> {
  role: RoleRef;
  active: boolean;
  scopeAll: boolean;
  actions: ReadonlySet<A>;
  licenseBlocked: ReadonlySet<A>;
  scope: ReadonlySet<string>;
}

export interface AccessProfile<A extends string = string> {
  tenantId: string;
  contractActive: boolean;
  bindings: readonly RoleBinding<A>[];
  /** Chỉ để hiển thị. KHÔNG dùng chấm quyền. */
  maxRank: number;
  /** Hint UI "nâng gói". Đã trừ action mà binding khác cấp được. */
  licenseBlocked: ReadonlySet<A>;
}
