/**
 * Example usage of AdvertisementService
 * This file demonstrates how to use the AdvertisementService for managing advertisements
 */

import { Pool } from 'pg';
import {
  AdvertisementService,
  AdZoneConfig,
  PlacementConfig,
  AdEvent,
  AdType,
} from './AdvertisementService';

// Initialize the service with a database pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kombe',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const advertisementService = new AdvertisementService(pool);

/**
 * Example 1: Create a header banner ad zone
 */
async function createHeaderBannerZone() {
  const config: AdZoneConfig = {
    name: 'Header Banner 728x90',
    position: 'header',
    dimensions: {
      width: 728,
      height: 90,
      unit: 'px',
    },
    configuration: {
      displayTiming: {
        delayMs: 0, // Show immediately
        frequency: 'always', // Show on every page load
      },
      targeting: {
        pages: ['/', '/products/*', '/categories/*'],
        devices: ['desktop', 'tablet'],
      },
      styling: {
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        padding: '10px',
        margin: '0 auto',
      },
    },
  };

  try {
    const zone = await advertisementService.createAdZone(config);
    console.log('Created ad zone:', zone);
    return zone;
  } catch (error) {
    console.error('Error creating ad zone:', error);
    throw error;
  }
}

/**
 * Example 2: Create a sidebar ad zone for mobile
 */
async function createSidebarZone() {
  const config: AdZoneConfig = {
    name: 'Sidebar 300x600',
    position: 'sidebar',
    dimensions: {
      width: 300,
      height: 600,
      unit: 'px',
    },
    configuration: {
      displayTiming: {
        delayMs: 1000, // Delay 1 second
        frequency: 'session', // Show once per session
      },
      targeting: {
        devices: ['desktop'],
        categories: ['dien-thoai', 'laptop'],
      },
    },
  };

  try {
    const zone = await advertisementService.createAdZone(config);
    console.log('Created sidebar zone:', zone);
    return zone;
  } catch (error) {
    console.error('Error creating sidebar zone:', error);
    throw error;
  }
}

/**
 * Example 3: Create a floating ad zone
 */
async function createFloatingZone() {
  const config: AdZoneConfig = {
    name: 'Floating Ad',
    position: 'floating',
    dimensions: {
      width: 320,
      height: 100,
      unit: 'px',
    },
    configuration: {
      displayTiming: {
        delayMs: 5000, // Show after 5 seconds
        durationMs: 10000, // Display for 10 seconds
        frequency: 'once', // Show only once
      },
      targeting: {
        devices: ['mobile', 'tablet'],
      },
      styling: {
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '15px',
      },
    },
  };

  try {
    const zone = await advertisementService.createAdZone(config);
    console.log('Created floating zone:', zone);
    return zone;
  } catch (error) {
    console.error('Error creating floating zone:', error);
    throw error;
  }
}

/**
 * Example 4: Update ad zone placement configuration
 */
async function updateZoneTiming(zoneId: string) {
  const config: PlacementConfig = {
    configuration: {
      displayTiming: {
        delayMs: 2000,
        frequency: 'always',
      },
    },
  };

  try {
    const updatedZone = await advertisementService.updateAdPlacement(zoneId, config);
    console.log('Updated ad zone:', updatedZone);
    return updatedZone;
  } catch (error) {
    console.error('Error updating ad zone:', error);
    throw error;
  }
}

/**
 * Example 5: Create a Google Ads advertisement
 */
async function createGoogleAd(zoneId: string) {
  const type: AdType = 'google_ads';
  const contentUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3); // Run for 3 months

  const targeting = {
    categories: ['dien-thoai', 'laptop', 'may-tinh-bang'],
    keywords: ['smartphone', 'laptop', 'tablet'],
  };

  try {
    const ad = await advertisementService.createAdvertisement(
      zoneId,
      type,
      contentUrl,
      startDate,
      endDate,
      targeting
    );
    console.log('Created Google Ads advertisement:', ad);
    return ad;
  } catch (error) {
    console.error('Error creating Google Ads:', error);
    throw error;
  }
}

/**
 * Example 6: Create a static banner advertisement
 */
async function createStaticBanner(zoneId: string) {
  const type: AdType = 'static_banner';
  const contentUrl = 'https://cdn.example.com/banners/summer-sale-728x90.jpg';
  const startDate = new Date('2024-06-01');
  const endDate = new Date('2024-08-31');

  const targeting = {
    categories: ['dien-lanh', 'thiet-bi-gia-dung'],
  };

  try {
    const ad = await advertisementService.createAdvertisement(
      zoneId,
      type,
      contentUrl,
      startDate,
      endDate,
      targeting
    );
    console.log('Created static banner:', ad);
    return ad;
  } catch (error) {
    console.error('Error creating static banner:', error);
    throw error;
  }
}

/**
 * Example 7: Track ad impression
 */
async function trackImpression(adId: string) {
  const event: AdEvent = {
    type: 'impression',
    timestamp: new Date(),
    metadata: {
      userSession: 'session-abc123',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      referrer: 'https://google.com',
      page: '/products/iphone-15-pro',
    },
  };

  try {
    await advertisementService.trackAdPerformance(adId, event);
    console.log('Tracked impression for ad:', adId);
  } catch (error) {
    console.error('Error tracking impression:', error);
    throw error;
  }
}

/**
 * Example 8: Track ad click
 */
async function trackClick(adId: string) {
  const event: AdEvent = {
    type: 'click',
    timestamp: new Date(),
    metadata: {
      userSession: 'session-abc123',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      page: '/products/iphone-15-pro',
    },
  };

  try {
    await advertisementService.trackAdPerformance(adId, event);
    console.log('Tracked click for ad:', adId);
  } catch (error) {
    console.error('Error tracking click:', error);
    throw error;
  }
}

/**
 * Example 9: Get performance metrics for an ad zone
 */
async function getZonePerformance(zoneId: string) {
  try {
    const metrics = await advertisementService.getPerformanceMetrics(zoneId, 30);
    console.log('Performance metrics for zone:', zoneId);
    console.log('Total Impressions:', metrics.totalImpressions);
    console.log('Total Clicks:', metrics.totalClicks);
    console.log('CTR:', metrics.ctr.toFixed(2) + '%');
    console.log('Average Impressions per Ad:', metrics.averageImpressions.toFixed(0));
    console.log('Average Clicks per Ad:', metrics.averageClicks.toFixed(0));
    console.log('\nPerformance by Ad:');
    metrics.performanceByAd.forEach((ad) => {
      console.log(`  Ad ${ad.adId} (${ad.adType}):`);
      console.log(`    Impressions: ${ad.impressions}`);
      console.log(`    Clicks: ${ad.clicks}`);
      console.log(`    CTR: ${ad.ctr.toFixed(2)}%`);
    });
    return metrics;
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    throw error;
  }
}

/**
 * Example 10: Get all active ad zones
 */
async function getAllActiveZones() {
  try {
    const zones = await advertisementService.getAdZones({ isActive: true });
    console.log(`Found ${zones.length} active ad zones:`);
    zones.forEach((zone) => {
      console.log(`  - ${zone.name} (${zone.position}): ${zone.dimensions.width}x${zone.dimensions.height}${zone.dimensions.unit}`);
    });
    return zones;
  } catch (error) {
    console.error('Error getting ad zones:', error);
    throw error;
  }
}

/**
 * Example 11: Get active advertisements for a zone
 */
async function getActiveAds(zoneId: string) {
  try {
    const ads = await advertisementService.getActiveAdvertisements(zoneId);
    console.log(`Found ${ads.length} active advertisements for zone ${zoneId}:`);
    ads.forEach((ad) => {
      console.log(`  - ${ad.type}: ${ad.contentUrl}`);
      console.log(`    Performance: ${ad.performanceData.impressions} impressions, ${ad.performanceData.clicks} clicks, ${ad.performanceData.ctr.toFixed(2)}% CTR`);
    });
    return ads;
  } catch (error) {
    console.error('Error getting active ads:', error);
    throw error;
  }
}

/**
 * Example 12: Update advertisement status
 */
async function pauseAdvertisement(adId: string) {
  try {
    const updatedAd = await advertisementService.updateAdvertisement(adId, {
      isActive: false,
    });
    console.log('Paused advertisement:', updatedAd.id);
    return updatedAd;
  } catch (error) {
    console.error('Error pausing advertisement:', error);
    throw error;
  }
}

/**
 * Example 13: Delete an ad zone
 */
async function deleteZone(zoneId: string) {
  try {
    await advertisementService.deleteAdZone(zoneId);
    console.log('Deleted ad zone:', zoneId);
  } catch (error) {
    console.error('Error deleting ad zone:', error);
    throw error;
  }
}

/**
 * Complete workflow example
 */
async function completeWorkflow() {
  try {
    // 1. Create ad zones
    console.log('\n=== Creating Ad Zones ===');
    const headerZone = await createHeaderBannerZone();
    const sidebarZone = await createSidebarZone();

    // 2. Create advertisements
    console.log('\n=== Creating Advertisements ===');
    const googleAd = await createGoogleAd(headerZone.id);
    const bannerAd = await createStaticBanner(sidebarZone.id);

    // 3. Simulate user interactions
    console.log('\n=== Tracking User Interactions ===');
    // Simulate 100 impressions and 5 clicks for Google Ad
    for (let i = 0; i < 100; i++) {
      await trackImpression(googleAd.id);
    }
    for (let i = 0; i < 5; i++) {
      await trackClick(googleAd.id);
    }

    // Simulate 50 impressions and 3 clicks for Banner Ad
    for (let i = 0; i < 50; i++) {
      await trackImpression(bannerAd.id);
    }
    for (let i = 0; i < 3; i++) {
      await trackClick(bannerAd.id);
    }

    // 4. Get performance metrics
    console.log('\n=== Performance Metrics ===');
    await getZonePerformance(headerZone.id);
    await getZonePerformance(sidebarZone.id);

    // 5. Get all active zones and ads
    console.log('\n=== Active Zones and Ads ===');
    await getAllActiveZones();
    await getActiveAds(headerZone.id);

    // 6. Update zone configuration
    console.log('\n=== Updating Zone Configuration ===');
    await updateZoneTiming(headerZone.id);

    console.log('\n=== Workflow Complete ===');
  } catch (error) {
    console.error('Workflow error:', error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Run the complete workflow if this file is executed directly
if (require.main === module) {
  completeWorkflow()
    .then(() => {
      console.log('Example completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Example failed:', error);
      process.exit(1);
    });
}

// Export functions for use in other modules
export {
  createHeaderBannerZone,
  createSidebarZone,
  createFloatingZone,
  updateZoneTiming,
  createGoogleAd,
  createStaticBanner,
  trackImpression,
  trackClick,
  getZonePerformance,
  getAllActiveZones,
  getActiveAds,
  pauseAdvertisement,
  deleteZone,
  completeWorkflow,
};
