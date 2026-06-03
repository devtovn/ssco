import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { JsonLd } from '@/components/shared/JsonLd';
import { getPublishedArticle, getPublishedArticles } from '@/lib/api/content';
import { getSiteConfig } from '@/lib/api/site-config';
import { formatDate } from '@/lib/utils/format';
import { AdZone } from '@/components/ads/AdZone';
import { AdSidebarLayout } from '@/components/ads/AdSidebarLayout';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface ArticlePageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  try {
    const article = await getPublishedArticle(params.id);
    const seo = article.seoMetadata;
    return {
      title: seo?.metaTitle || article.title,
      description: seo?.metaDescription || article.excerpt,
      keywords: seo?.keywords,
      openGraph: {
        title: seo?.ogTitle || article.title,
        description: seo?.ogDescription || article.excerpt,
        images: seo?.ogImage ? [seo.ogImage] : undefined,
        type: 'article',
      },
      alternates: {
        canonical: seo?.canonicalUrl || `${SITE_URL}/bai-viet/${params.id}`,
      },
    };
  } catch {
    const { siteName } = await getSiteConfig();
    return { title: `Bài viết | ${siteName}` };
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  let article;
  try {
    article = await getPublishedArticle(params.id);
  } catch {
    notFound();
  }

  const moreArticles = await getPublishedArticles(5).catch((err) => { console.error('[ArticleDetailPage] getPublishedArticles', err); return []; });
  const related = moreArticles.filter((a) => a.id !== article.id).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    url: `${SITE_URL}/bai-viet/${article.id}`,
  };

  return (
    <PublicLayout>
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Trang chủ', href: '/' },
            { label: 'Bài viết', href: '/bai-viet' },
            { label: article.title },
          ]}
        />
        <div className="mt-6">
          <AdSidebarLayout>
            <article>
              <header className="mb-8">
                <h1 className="text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
                  {article.title}
                </h1>
                {article.publishedAt && (
                  <p className="mt-2 text-sm text-slate-500">
                    Đăng ngày {formatDate(article.publishedAt)}
                  </p>
                )}
                {article.excerpt && (
                  <p className="mt-4 text-lg text-slate-600">{article.excerpt}</p>
                )}
              </header>

              <AdZone position="in-content" className="mb-8" />

              <div
                className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-primary-600"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              {article.productId && (
                <p className="mt-8">
                  <Link
                    href={`/san-pham/${article.productId}`}
                    className="inline-flex rounded-lg bg-primary-600 px-5 py-2.5 font-semibold text-white hover:bg-primary-700"
                  >
                    Xem sản phẩm liên quan
                  </Link>
                </p>
              )}

              {related.length > 0 && (
                <section className="mt-12 border-t border-slate-200 pt-8">
                  <h2 className="mb-4 text-xl font-bold text-slate-900">Bài viết khác</h2>
                  <ul className="space-y-3">
                    {related.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/bai-viet/${a.id}`}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>
          </AdSidebarLayout>
        </div>
      </div>
    </PublicLayout>
  );
}
