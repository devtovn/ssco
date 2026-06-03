'use client';

import { useEffect, useState } from 'react';
import { getAdZones } from '@/lib/api/ads';
import { AdZone } from '@/components/ads/AdZone';
import { ProductDetailTabs } from './ProductDetailTabs';
import type { PriceComparison, PriceHistory } from '@price-comparison/types';
import type { GadgetSpecs } from '@/lib/api/gadget';

interface ProductTabsSectionProps {
  comparison: PriceComparison;
  history: PriceHistory;
  productId: string;
  gadgetSpecs?: GadgetSpecs;
  gadgetSlug?: string;
}

export function ProductTabsSection({ comparison, history, productId, gadgetSpecs, gadgetSlug }: ProductTabsSectionProps) {
  const [hasSidebar, setHasSidebar] = useState(false);

  useEffect(() => {
    getAdZones({ isActive: true, position: 'sidebar' })
      .then((zones) => setHasSidebar(zones.length > 0))
      .catch((err) => { console.error('[ProductTabsSection]', err); });
  }, []);

  const tabs = <ProductDetailTabs comparison={comparison} history={history} productId={productId} gadgetSpecs={gadgetSpecs} gadgetSlug={gadgetSlug} />;

  if (!hasSidebar) return tabs;

  return (
    <div className="grid gap-6 lg:grid-cols-[9fr_3fr]">
      <div>{tabs}</div>
      <aside className="hidden lg:block">
        <div className="sticky top-4">
          <AdZone position="sidebar" />
        </div>
      </aside>
    </div>
  );
}
