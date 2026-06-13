import Link from 'next/link';
import type { CategoryTree } from '@kombe/types';

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
    <section className="mt-10 sm:mt-16">
      <h2 className="mb-4 text-center text-xl font-bold text-slate-900 sm:mb-6 sm:text-2xl">Danh mục sản phẩm</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5">
        {topLevel.map((node) => {
          const cat = node.category;
          const icon = CATEGORY_ICONS[cat.slug] || '🛒';
          return (
            <Link
              key={String(cat.id)}
              href={`/danh-muc/${cat.slug}`}
              className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-primary-300 hover:shadow-md sm:p-4"
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
