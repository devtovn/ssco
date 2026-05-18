import Image from 'next/image';
import Link from 'next/link';

interface BannerAdProps {
  imageUrl?: string;
  clickUrl?: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function BannerAd({
  imageUrl,
  clickUrl,
  alt = 'Quảng cáo',
  width = 728,
  height = 90,
  className = '',
}: BannerAdProps) {
  if (!imageUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100 text-xs text-slate-500 ${className}`}
        style={{ minHeight: height, maxWidth: width }}
      >
        Banner quảng cáo
      </div>
    );
  }

  const content = (
    <div className="relative overflow-hidden rounded-lg" style={{ width, height }}>
      <Image src={imageUrl} alt={alt} fill className="object-cover" sizes={`${width}px`} />
    </div>
  );

  if (clickUrl) {
    return (
      <Link
        href={clickUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className={className}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
