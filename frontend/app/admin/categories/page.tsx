'use client';

import { useEffect, useState } from 'react';
import type { CategoryTree } from '@price-comparison/types';
import { buildApiUrl } from '@/lib/api/client';

function CategoryNode({ node, depth = 0 }: { node: CategoryTree; depth?: number }) {
  return (
    <li className="mt-1">
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.category.icon && <span>{node.category.icon}</span>}
        <span className="font-medium text-slate-800">{node.category.name}</span>
        {node.category.productCount != null && (
          <span className="text-xs text-slate-500">({node.category.productCount} SP)</span>
        )}
        {!node.category.isActive && (
          <span className="rounded bg-slate-200 px-1.5 text-xs text-slate-600">Ẩn</span>
        )}
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <CategoryNode key={child.category.id} node={child} depth={depth + 1} />
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

  useEffect(() => {
    fetch(buildApiUrl('/categories/tree'))
      .then((res) => res.json())
      .then((json) => {
        setTree(json.data ?? []);
      })
      .catch(() => setError('Không tải được cây danh mục'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Danh mục</h1>
      <p className="mt-1 text-sm text-slate-600">Cây danh mục sản phẩm</p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-600">Đang tải...</p>
        ) : (
          <ul>
            {tree.map((node) => (
              <CategoryNode key={node.category.id} node={node} />
            ))}
            {!tree.length && <p className="text-sm text-slate-500">Chưa có danh mục</p>}
          </ul>
        )}
      </div>
    </div>
  );
}
