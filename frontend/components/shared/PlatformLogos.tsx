import { getPlatformLabel, getPlatformLogo, sortPlatformSources } from '@/lib/platforms';

const MAX_VISIBLE = 4;

interface PlatformLogosProps {
  sources?: string[];
  className?: string;
}

export function PlatformLogos({ sources = [], className = '' }: PlatformLogosProps) {
  const sorted = sortPlatformSources(sources.filter(Boolean));
  if (sorted.length === 0) return null;

  const visible = sorted.slice(0, MAX_VISIBLE);
  const overflow = sorted.length - visible.length;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {visible.map((source) => {
        const logo = getPlatformLogo(source);
        const label = getPlatformLabel(source);
        return (
          <span
            key={source}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-[0_0_0_1px_rgb(226_232_240)]"
            title={label}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={label} className="h-full w-full object-contain p-0.5" />
            ) : (
              <span className="text-[9px] font-bold uppercase text-slate-600">
                {label.charAt(0)}
              </span>
            )}
          </span>
        );
      })}
      {overflow > 0 && (
        <span
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1 text-[10px] font-semibold text-slate-600 shadow-[0_0_0_1px_rgb(226_232_240)]"
          title={sorted.slice(MAX_VISIBLE).map(getPlatformLabel).join(', ')}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
