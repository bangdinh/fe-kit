// Cây resource → `ResourceIndex` (id → cha) cho `canOn`.
//
// Kit không biết cây của sản phẩm có hình gì, nên nhận hai hàm đọc: lấy id và
// lấy con. Nhờ vậy cùng một engine chạy được trên cây phòng ban, cây địa điểm,
// hay cây thiết bị mà không phải đổi shape dữ liệu về một khuôn của kit.
import { MAX_RESOURCE_DEPTH, type ResourceIndex } from './engine';

export interface TreeReader<N> {
  idOf(node: N): string;
  childrenOf(node: N): readonly N[] | undefined;
}

/**
 * Duyệt cây thành bảng cha — lặp, KHÔNG đệ quy.
 *
 * Đệ quy trên cây do backend trả về là đặt hy vọng vào dữ liệu: một cạnh vòng
 * (A là con của B, B là con của A) làm tràn stack và hạ nguyên trang. Vòng lặp
 * kèm `seen` thì cạnh vòng chỉ bị bỏ qua, và `canOn` vẫn chạy.
 */
export function indexFromTree<N>(roots: readonly N[], reader: TreeReader<N>): ResourceIndex {
  const parentOf = new Map<string, string | null>();
  const seen = new Set<string>();
  const stack: { node: N; parent: string | null; depth: number }[] = roots.map((node) => ({
    node,
    parent: null,
    depth: 0,
  }));

  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) break;
    const { node, parent, depth } = entry;
    const id = reader.idOf(node);
    if (seen.has(id) || depth > MAX_RESOURCE_DEPTH) continue;
    seen.add(id);
    parentOf.set(id, parent);
    for (const child of reader.childrenOf(node) ?? []) {
      stack.push({ node: child, parent: id, depth: depth + 1 });
    }
  }

  return { parentOf };
}

/** Index rỗng — mọi `canOn` chỉ còn đúng với binding `scopeAll`. */
export const EMPTY_RESOURCE_INDEX: ResourceIndex = { parentOf: new Map() };
