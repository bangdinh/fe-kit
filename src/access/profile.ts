// Parser: payload phân quyền của backend → AccessProfile. Thuần, không I/O.
//
//   { membership: { status, max_rank },
//     contract:   { status, expires_at },
//     assignments: [ { role: {id, rank},
//                     scope_all_resources,
//                     permissions: [{action, status}],
//                     resources:   [{resource_type, resource_id}] } ] }
//
// Luật status: CHỈ 'granted' là quyền. Mọi status khác vào `licenseBlocked`.
// Action KHÔNG được cấp thì VẮNG MẶT hẳn khỏi mảng, nên không có trạng thái
// thứ ba nào phải xử lý ở đây.
import { nodeEnv } from '../config/env';
import type {
  AccessProfile,
  RoleBinding,
  WireAccessData,
  WireAssignment,
} from './types';

const GRANTED = 'granted';

export interface BuildAccessProfileOptions<A extends string> {
  /**
   * Tập action mà sản phẩm biết. Gặp mã lạ thì cảnh báo — dấu hiệu backend đã
   * thêm action mà FE chưa sinh lại type. Bỏ trống = không kiểm.
   */
  knownActions?: Iterable<A>;
  /** Nơi nhận cảnh báo. Mặc định `console.warn` ngoài production. */
  onWarn?: (message: string) => void;
}

function defaultWarn(message: string): void {
  if (nodeEnv() === 'production') return;
  console.warn(`[access] ${message}`);
}

/**
 * Không có field `contract` → coi là còn hiệu lực.
 *
 * Vắng field mà khoá sạch app thì mỗi lần backend đổi shape là toàn bộ người
 * dùng mất quyền cùng lúc — hỏng nặng hơn nhiều so với việc tin một hợp đồng
 * đã hết hạn thêm một nhịp, vì phán quyết cuối vẫn nằm ở server.
 */
function contractActiveOf(data: WireAccessData, warn: (m: string) => void): boolean {
  if (!data.contract) {
    warn('payload không có field `contract` — tạm coi hợp đồng còn hiệu lực');
    return true;
  }
  return data.contract.status === 'active';
}

function buildBinding<A extends string>(
  w: WireAssignment,
  active: boolean,
  known: ReadonlySet<string> | undefined,
  seenStatuses: Set<string>,
  warn: (m: string) => void,
): RoleBinding<A> {
  const actions = new Set<A>();
  const licenseBlocked = new Set<A>();

  if (!Array.isArray(w.permissions)) {
    warn(`assignment role "${w.role?.id ?? '?'}" thiếu mảng "permissions" — coi như không có quyền nào`);
  }
  if (!Array.isArray(w.resources) && w.scope_all_resources !== true) {
    warn(`assignment role "${w.role?.id ?? '?'}" thiếu mảng "resources" — coi như phạm vi rỗng`);
  }

  for (const p of w.permissions ?? []) {
    if (known && !known.has(p.action)) {
      warn(`action code lạ "${p.action}" — sinh lại danh sách action từ OpenAPI của backend`);
    }
    const code = p.action as A;

    if (p.status === GRANTED) {
      actions.add(code);
    } else {
      if (!seenStatuses.has(p.status)) {
        seenStatuses.add(p.status);
        warn(`status "${p.status}" không phải "granted" — coi như bị chặn (license)`);
      }
      licenseBlocked.add(code);
    }
  }

  return {
    // Endpoint quyền thường không trả tên vai trò — lấy tạm id để chỗ hiển thị
    // có thứ để bám, và ghi đè được khi backend có trả `name`.
    role: { id: w.role.id, name: w.role.name ?? w.role.id, rank: w.role.rank },
    active,
    scopeAll: w.scope_all_resources === true,
    actions,
    licenseBlocked,
    scope: new Set((w.resources ?? []).map((r) => r.resource_id)),
  };
}

export function buildAccessProfile<A extends string = string>(
  data: WireAccessData,
  tenantId: string,
  options: BuildAccessProfileOptions<A> = {},
): AccessProfile<A> {
  const warn = options.onWarn ?? defaultWarn;
  const known = options.knownActions ? new Set<string>(options.knownActions) : undefined;

  // Membership là CẤP CÔNG TY: đình chỉ nó là đình chỉ mọi vai trò cùng lúc,
  // không phải từng vai trò một.
  const active = data.membership?.status === 'active';
  const seenStatuses = new Set<string>();
  const bindings = (data.assignments ?? []).map((a) =>
    buildBinding<A>(a, active, known, seenStatuses, warn),
  );

  const granted = new Set<A>();
  for (const b of bindings) for (const a of b.actions) granted.add(a);

  // Trừ phần granted: role A cho phép mà role B bị license chặn thì không được
  // hiện nút "nâng gói" cho thứ user đang dùng được.
  const licenseBlocked = new Set<A>();
  for (const b of bindings) {
    for (const a of b.licenseBlocked) if (!granted.has(a)) licenseBlocked.add(a);
  }

  // Tính từ binding đang active chứ không lấy `membership.max_rank`: hai giá
  // trị lệch nhau khi membership bị đình chỉ (server vẫn trả rank cũ trong khi
  // không vai trò nào còn hiệu lực), và cái đúng để hiển thị là cái phản ánh
  // quyền thực tế.
  const activeRanks = bindings.filter((b) => b.active).map((b) => b.role.rank);

  return {
    tenantId,
    contractActive: contractActiveOf(data, warn),
    bindings,
    maxRank: activeRanks.length > 0 ? Math.max(...activeRanks) : 0,
    licenseBlocked,
  };
}
