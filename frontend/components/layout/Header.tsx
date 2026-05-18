import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-primary-700">
          SSCO
          <span className="ml-1 text-sm font-normal text-slate-500">So sánh giá</span>
        </Link>
        <nav className="hidden gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/search" className="hover:text-primary-600">
            Tìm kiếm
          </Link>
          <Link href="/deals" className="hover:text-primary-600">
            Ưu đãi
          </Link>
          <Link href="/bai-viet" className="hover:text-primary-600">
            Bài viết
          </Link>
        </nav>
      </div>
    </header>
  );
}
