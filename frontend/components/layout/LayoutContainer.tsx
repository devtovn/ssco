'use client';

interface LayoutContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps content with the configured layout width.
 * Uses the CSS class `layout-container` which reads --layout-max-width from <html>.
 */
export function LayoutContainer({ children, className = '' }: LayoutContainerProps) {
  return (
    <div className={`layout-container px-4 ${className}`}>
      {children}
    </div>
  );
}
