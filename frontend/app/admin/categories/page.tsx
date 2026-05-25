'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { CategoryTree } from '@price-comparison/types';
import { buildApiUrl } from '@/lib/api/client';
import { apiFetchWithAuth } from '@/lib/auth';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function flattenTree(nodes: CategoryTree[]): Array<{ id: string; name: string; level: number }> {
  const result: Array<{ id: string; name: string; level: number }> = [];
  function walk(nodes: CategoryTree[], level: number) {
    for (const node of nodes) {
      result.push({ id: node.category.id, name: node.category.name, level });
      walk(node.children, level + 1);
    }
  }
  walk(nodes, 0);
  return result;
}

// ── DnD helpers ──────────────────────────────────────────────────────────────

interface NodeContext {
  node: CategoryTree;
  parentId: string | null;
  siblings: CategoryTree[];
}

function findNode(
  tree: CategoryTree[],
  id: string,
  parentId: string | null = null,
  siblings: CategoryTree[] = tree,
): NodeContext | null {
  for (const node of siblings) {
    if (node.category.id === id) return { node, parentId, siblings };
    const found = findNode(node.children, id, node.category.id, node.children);
    if (found) return found;
  }
  return null;
}

function hasDescendant(node: CategoryTree, targetId: string): boolean {
  return node.children.some(
    (c) => c.category.id === targetId || hasDescendant(c, targetId),
  );
}

type DropPosition = 'before' | 'after' | 'inside';

interface ReorderUpdate {
  id: string;
  parentId: string | null;
  displayOrder: number;
}

function computeUpdates(
  tree: CategoryTree[],
  dragId: string,
  targetId: string,
  position: DropPosition,
): ReorderUpdate[] | null {
  const dragCtx = findNode(tree, dragId);
  const targetCtx = findNode(tree, targetId);
  if (!dragCtx || !targetCtx) return null;
  if (dragId === targetId) return null;
  // Prevent circular parenting (dropping parent into its own descendant)
  if (position === 'inside' && hasDescendant(dragCtx.node, targetId)) return null;

  const newParentId = position === 'inside' ? targetId : targetCtx.parentId;
  const sameGroup = dragCtx.parentId === newParentId;
  const updates: ReorderUpdate[] = [];

  if (sameGroup) {
    const sibs = dragCtx.siblings.filter((n) => n.category.id !== dragId);
    const tIdx = sibs.findIndex((n) => n.category.id === targetId);
    const insertAt = position === 'before' ? tIdx : tIdx + 1;
    const ordered = [...sibs.slice(0, insertAt), dragCtx.node, ...sibs.slice(insertAt)];
    ordered.forEach((n, i) => updates.push({ id: n.category.id, parentId: dragCtx.parentId, displayOrder: i }));
  } else {
    // Reorder old parent (minus drag)
    dragCtx.siblings
      .filter((n) => n.category.id !== dragId)
      .forEach((n, i) => updates.push({ id: n.category.id, parentId: dragCtx.parentId, displayOrder: i }));

    // Build new parent group with drag inserted
    let newGroup: CategoryTree[];
    if (position === 'inside') {
      newGroup = [...targetCtx.node.children, dragCtx.node];
    } else {
      const sibs = targetCtx.siblings.filter((n) => n.category.id !== dragId);
      const tIdx = sibs.findIndex((n) => n.category.id === targetId);
      const insertAt = position === 'before' ? tIdx : tIdx + 1;
      newGroup = [...sibs.slice(0, insertAt), dragCtx.node, ...sibs.slice(insertAt)];
    }
    newGroup.forEach((n, i) => updates.push({ id: n.category.id, parentId: newParentId, displayOrder: i }));
  }

  return updates;
}

// ── CategoryNode ──────────────────────────────────────────────────────────────

interface DndState {
  dragId: string | null;
  dropTarget: { id: string; position: DropPosition } | null;
}

interface DndHandlers {
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}

interface CategoryNodeProps {
  node: CategoryTree;
  depth?: number;
  editingId: string | null;
  editName: string;
  editIcon: string;
  editActive: boolean;
  dnd: DndState;
  dndHandlers: DndHandlers;
  onStartEdit: (node: CategoryTree) => void;
  onEditName: (v: string) => void;
  onEditIcon: (v: string) => void;
  onEditActive: (v: boolean) => void;
  onSave: (id: string) => void;
  onCancel: () => void;
  onDelete: (id: string, name: string) => void;
}

function CategoryNode({
  node,
  depth = 0,
  editingId,
  editName,
  editIcon,
  editActive,
  dnd,
  dndHandlers,
  onStartEdit,
  onEditName,
  onEditIcon,
  onEditActive,
  onSave,
  onCancel,
  onDelete,
}: CategoryNodeProps) {
  const id = node.category.id;
  const isEditing = editingId === id;
  const isDragging = dnd.dragId === id;
  const dt = dnd.dropTarget?.id === id ? dnd.dropTarget.position : null;

  return (
    <li className="select-none">
      <div
        draggable
        onDragStart={(e) => { e.stopPropagation(); dndHandlers.onDragStart(id); }}
        onDragOver={(e) => { e.stopPropagation(); dndHandlers.onDragOver(e, id); }}
        onDragEnd={(e) => { e.stopPropagation(); dndHandlers.onDragEnd(); }}
        onDrop={(e) => { e.stopPropagation(); dndHandlers.onDrop(e, id); }}
        className={[
          'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors mt-0.5',
          isDragging ? 'opacity-30' : '',
          dt === 'inside' ? 'ring-2 ring-primary-400 bg-primary-50' : 'hover:bg-slate-50',
          dt === 'before' ? 'border-t-2 border-primary-500' : '',
          dt === 'after' ? 'border-b-2 border-primary-500' : '',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Drag handle */}
        <span
          className="cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing shrink-0 text-base leading-none"
          title="Kéo để sắp xếp"
        >
          ⠿
        </span>

        {isEditing ? (
          <>
            <input
              value={editIcon}
              onChange={(e) => onEditIcon(e.target.value)}
              className="w-12 rounded border border-slate-300 px-1 py-0.5 text-center text-sm"
              placeholder="icon"
            />
            <input
              value={editName}
              onChange={(e) => onEditName(e.target.value)}
              className="flex-1 rounded border border-slate-300 px-2 py-0.5 text-sm"
            />
            <label className="flex items-center gap-1 text-xs text-slate-700 shrink-0">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => onEditActive(e.target.checked)}
              />
              Hiện
            </label>
            <button type="button" onClick={() => onSave(id)} className="text-xs text-primary-600 hover:underline shrink-0">
              Lưu
            </button>
            <button type="button" onClick={onCancel} className="text-xs text-slate-600 hover:underline shrink-0">
              Hủy
            </button>
          </>
        ) : (
          <>
            {node.category.icon && <span className="shrink-0">{node.category.icon}</span>}
            <span className="flex-1 font-medium text-slate-800 truncate">{node.category.name}</span>
            {node.category.productCount != null && (
              <span className="text-xs text-slate-500 shrink-0">({node.category.productCount} SP)</span>
            )}
            {!node.category.isActive && (
              <span className="rounded bg-slate-200 px-1.5 text-xs text-slate-600 shrink-0">Ẩn</span>
            )}
            <button type="button" onClick={() => onStartEdit(node)} className="text-xs text-primary-600 hover:underline shrink-0">
              Sửa
            </button>
            <button type="button" onClick={() => onDelete(id, node.category.name)} className="text-xs text-red-600 hover:underline shrink-0">
              Xóa
            </button>
          </>
        )}
      </div>

      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <CategoryNode
              key={child.category.id}
              node={child}
              depth={depth + 1}
              editingId={editingId}
              editName={editName}
              editIcon={editIcon}
              editActive={editActive}
              dnd={dnd}
              dndHandlers={dndHandlers}
              onStartEdit={onStartEdit}
              onEditName={onEditName}
              onEditIcon={onEditIcon}
              onEditActive={onEditActive}
              onSave={onSave}
              onCancel={onCancel}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminCategoriesPage() {
  const [tree, setTree] = useState<CategoryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newParentId, setNewParentId] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editActive, setEditActive] = useState(true);

  // DnD state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: DropPosition } | null>(null);
  const [dndSaving, setDndSaving] = useState(false);
  const treeRef = useRef<CategoryTree[]>([]);
  treeRef.current = tree; // always current for DnD handlers

  async function loadTree() {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/categories/tree'));
      const json = await res.json();
      setTree(json.data ?? []);
      setError('');
    } catch {
      setError('Không tải được cây danh mục');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTree(); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await apiFetchWithAuth('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          slug: newSlug || toSlug(newName),
          icon: newIcon || undefined,
          parentId: newParentId || undefined,
        }),
      });
      setNewName(''); setNewSlug(''); setNewIcon(''); setNewParentId('');
      await loadTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo danh mục thất bại');
    }
  }

  function startEdit(node: CategoryTree) {
    setEditingId(node.category.id);
    setEditName(node.category.name);
    setEditIcon(node.category.icon ?? '');
    setEditActive(node.category.isActive);
  }

  async function handleUpdate(id: string) {
    try {
      await apiFetchWithAuth(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName, icon: editIcon || undefined, isActive: editActive }),
      });
      setEditingId(null);
      await loadTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật thất bại');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xóa danh mục "${name}"?`)) return;
    try {
      await apiFetchWithAuth(`/categories/${id}`, { method: 'DELETE' });
      await loadTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Xóa thất bại');
    }
  }

  // ── DnD handlers ────────────────────────────────────────────────────────────

  function handleDragStart(id: string) {
    setDragId(id);
    setDropTarget(null);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    const position: DropPosition = y < h * 0.3 ? 'before' : y > h * 0.7 ? 'after' : 'inside';
    setDropTarget((prev) =>
      prev?.id === id && prev?.position === position ? prev : { id, position },
    );
  }

  function handleDragEnd() {
    setDragId(null);
    setDropTarget(null);
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const currentDragId = dragId;
    const currentTarget = dropTarget;
    handleDragEnd();

    if (!currentDragId || !currentTarget || currentDragId === targetId) return;

    const updates = computeUpdates(
      treeRef.current,
      currentDragId,
      targetId,
      currentTarget.position,
    );
    if (!updates || updates.length === 0) return;

    setDndSaving(true);
    setError('');
    try {
      await apiFetchWithAuth('/admin/categories/reorder', {
        method: 'POST',
        body: JSON.stringify({ updates }),
      });
      await loadTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sắp xếp thất bại');
    } finally {
      setDndSaving(false);
    }
  }

  const dndState: DndState = { dragId, dropTarget };
  const dndHandlers: DndHandlers = {
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    onDrop: handleDrop,
  };

  const flatCategories = flattenTree(tree);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Danh mục</h1>
      <p className="mt-1 text-sm text-slate-600">Cây danh mục sản phẩm</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Thêm danh mục</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            required
            placeholder="Tên danh mục"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); if (!newSlug) setNewSlug(toSlug(e.target.value)); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Slug (vd: dien-tu)"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Icon (emoji)"
            value={newIcon}
            onChange={(e) => setNewIcon(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Danh mục gốc</option>
            {flatCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {'—'.repeat(c.level)} {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Thêm danh mục
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Kéo <span className="font-mono">⠿</span> để thay đổi thứ tự hoặc chuyển danh mục con sang cha mới
          </p>
          {dndSaving && <span className="text-xs text-primary-600">Đang lưu...</span>}
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Đang tải...</p>
        ) : (
          <ul
            onDragOver={(e) => e.preventDefault()}
          >
            {tree.map((node) => (
              <CategoryNode
                key={node.category.id}
                node={node}
                editingId={editingId}
                editName={editName}
                editIcon={editIcon}
                editActive={editActive}
                dnd={dndState}
                dndHandlers={dndHandlers}
                onStartEdit={startEdit}
                onEditName={setEditName}
                onEditIcon={setEditIcon}
                onEditActive={setEditActive}
                onSave={handleUpdate}
                onCancel={() => setEditingId(null)}
                onDelete={handleDelete}
              />
            ))}
            {!tree.length && <p className="text-sm text-slate-500">Chưa có danh mục</p>}
          </ul>
        )}
      </div>
    </div>
  );
}
