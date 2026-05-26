import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { getPublishedArticles } from '@/lib/api/content';
import { formatDate } from '@/lib/utils/format';
import { getSiteConfig } from '@/lib/api/site-config';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteConfig();
  return {
    title: `Bài viết | ${siteName}`,
    description: 'Tin tức, đánh giá và hướng dẫn mua sắm thông minh.',
  };
}

export default async function ArticlesIndexPage() {
  const articles = await getPublishedArticles(20).catch(() => []);

  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900">Bài viết</h1>
        <p className="mt-2 text-slate-600">Đánh giá sản phẩm và mẹo so sánh giá</p>

        <ul className="mt-8 space-y-6">
          {articles.map((article) => (
            <li key={article.id} className="border-b border-slate-200 pb-6 last:border-0">
              <Link href={`/bai-viet/${article.id}`} className="group">
                <h2 className="text-xl font-semibold text-slate-900 group-hover:text-primary-600">
                  {article.title}
                </h2>
                {article.excerpt && (
                  <p className="mt-2 line-clamp-2 text-slate-600">{article.excerpt}</p>
                )}
                {article.publishedAt && (
                  <p className="mt-2 text-xs text-slate-400">{formatDate(article.publishedAt)}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {articles.length === 0 && (
          <p className="mt-12 text-center text-slate-500">Chưa có bài viết nào.</p>
        )}
      </section>
    </PublicLayout>
  );
}
