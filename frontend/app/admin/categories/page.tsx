'use client';

import { FormEvent, useEffect, useState } from 'react';
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

interface CategoryNodeProps {
  node: CategoryTree;
  depth?: number;
  editingId: string | null;
  editName: string;
  editIcon: string;
  editActive: boolean;
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
  onStartEdit,
  onEditName,
  onEditIcon,
  onEditActive,
  onSave,
  onCancel,
  onDelete,
}: CategoryNodeProps) {
  const isEditing = editingId !== null && editingId === node.category.id;
  return (
    <li className="mt-1">
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
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
            <label className="flex items-center gap-1 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => onEditActive(e.target.checked)}
              />
              Hiện
            </label>
            <button
              type="button"
              onClick={() => onSave(node.category.id)}
              className="text-xs text-primary-600 hover:underline"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-600 hover:underline"
            >
              Hủy
            </button>
          </>
        ) : (
          <>
            {node.category.icon && <span>{node.category.icon}</span>}
            <span className="flex-1 font-medium text-slate-800">{node.category.name}</span>
            {node.category.productCount != null && (
              <span className="text-xs text-slate-500">({node.category.productCount} SP)</span>
            )}
            {!node.category.isActive && (
              <span className="rounded bg-slate-200 px-1.5 text-xs text-slate-600">Ẩn</span>
            )}
            <button
              type="button"
              onClick={() => onStartEdit(node)}
              className="text-xs text-primary-600 hover:underline"
            >
              Sửa
            </button>
            <button
              type="button"
              onClick={() => onDelete(node.category.id, node.category.name)}
              className="text-xs text-red-600 hover:underline"
            >
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

export default function AdminCategoriesPage() {
  const [tree, setTree] = useState<CategoryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newParentId, setNewParentId] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editActive, setEditActive] = useState(true);

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

  useEffect(() => {
    loadTree();
  }, []);

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
      setNewName('');
      setNewSlug('');
      setNewIcon('');
      setNewParentId('');
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
        body: JSON.stringify({
          name: editName,
          icon: editIcon || undefined,
          isActive: editActive,
        }),
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

  const flatCategories = flattenTree(tree);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Danh mục</h1>
      <p className="mt-1 text-sm text-slate-600">Cây danh mục sản phẩm</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form
        onSubmit={handleCreate}
        className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="font-semibold text-slate-900">Thêm danh mục</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            required
            placeholder="Tên danh mục"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (!newSlug) setNewSlug(toSlug(e.target.value));
            }}
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
              <option key={c.id} value={c.id as string}>
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
        {loading ? (
          <p className="text-sm text-slate-600">Đang tải...</p>
        ) : (
          <ul>
            {tree.map((node) => (
              <CategoryNode
                key={node.category.id}
                node={node}
                editingId={editingId}
                editName={editName}
                editIcon={editIcon}
                editActive={editActive}
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
