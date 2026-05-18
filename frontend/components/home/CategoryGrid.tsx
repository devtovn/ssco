import Link from 'next/link';
import type { CategoryTree } from '@price-comparison/types';

const CATEGORY_ICONS: Record<string, string> = {
  'dien-lanh': '❄️',
  'dien-thoai': '📱',
  laptop: '💻',
  'thiet-bi-gia-dung': '🏠',
  'am-thanh-hinh-anh': '🎧',
};

interface CategoryGridProps {
  categories: CategoryTree[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  const topLevel = categories.slice(0, 10);

  return (
    <section className="mt-16">
      <h2 className="mb-6 text-center text-2xl font-bold text-slate-900">Danh mục sản phẩm</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {topLevel.map((node) => {
          const cat = node.category;
          const icon = CATEGORY_ICONS[cat.slug] || '🛒';
          return (
            <Link
              key={String(cat.id)}
              href={`/danh-muc/${cat.slug}`}
              className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-primary-300 hover:shadow-md"
            >
              <span className="text-3xl" aria-hidden>
                {icon}
              </span>
              <span className="mt-2 text-sm font-semibold text-slate-800">{cat.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
