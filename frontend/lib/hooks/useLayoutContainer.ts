import type { CSSProperties } from 'react';

/**
 * Returns container class for layout width.
 * Uses the `layout-container` CSS class which reads --layout-max-width from :root.
 */
export function useLayoutContainer(): {
  containerClass: string;
  containerStyle: CSSProperties | undefined;
} {
  return { containerClass: 'layout-container', containerStyle: undefined };
}
