'use client';

import { useEffect } from 'react';
import { trackInteraction } from '@/lib/api/analytics';
import { getUserSession } from '@/lib/utils/session';

interface ProductViewTrackerProps {
  productId: string;
}

export function ProductViewTracker({ productId }: ProductViewTrackerProps) {
  useEffect(() => {
    void trackInteraction({
      eventType: 'product_view',
      productId,
      pagePath: `/san-pham/${productId}`,
      userSession: getUserSession(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
  }, [productId]);

  return null;
}
