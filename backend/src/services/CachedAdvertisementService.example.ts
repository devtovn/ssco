/**
 * Example usage of CachedAdvertisementService
 * Demonstrates caching behavior for advertisement operations
 */

import { Pool } from 'pg';
import { AdvertisementService } from './AdvertisementService';
import { CachedAdvertisementService } from './CachedAdvertisementService';
import { CacheService } from '../utils/cache';

// Example: Initialize the cached service
async function initializeCachedAdvertisementService(pool: Pool): Promise<CachedAdvertisementService> {
  const advertisementService = new AdvertisementService(pool);
  const cachedService = new CachedAdvertisementService(advertisementService, CacheService);
  
  // Warm cache on startup
  await cachedService.warmCache();
  
  return cachedService;
}

// Example 1: Get ad zones with caching
async function getActiveAdZones(cachedService: CachedAdvertisementService) {
  console.log('=== Example 1: Get Active Ad Zones ===');
  
  // First call - Cache MISS, fetches from database
  console.log('First call (Cache MISS):');
  const zones1 = await cachedService.getAdZones({ isActive: true });
  console.log(`Found ${zones1.length} active zones`);
  
  // Second call - Cache HIT, returns from Redis
  console.log('\nSecond call (Cache HIT):');
  const zones2 = await cachedService.getAdZones({ isActive: true });
  console.log(`Found ${zones2.length} active zones (from cache)`);
  
  // Different filter - Cache MISS (different cache key)
  console.log('\nDifferent filter (Cache MISS):');
  const allZones = await cachedService.getAdZones();
  console.log(`Found ${allZones.length} total zones`);
}

// Example 2: Get ad zone by ID with caching
async function getAdZoneById(cachedService: CachedAdvertisementService, zoneId: string) {
  console.log('\n=== Example 2: Get Ad Zone by ID ===');
  
  // First call - Cache MISS
  console.log('First call (Cache MISS):');
  const zone1 = await cachedService.getAdZoneById(zoneId);
  console.log(`Zone: ${zone1?.name} at position ${zone1?.position}`);
  
  // Second call - Cache HIT
  console.log('\nSecond call (Cache HIT):');
  const zone2 = await cachedService.getAdZoneById(zoneId);
  console.log(`Zone: ${zone2?.name} (from cache)`);
}

// Example 3: Get performance metrics with caching
async function getPerformanceMetrics(cachedService: CachedAdvertisementService, zoneId: string) {
  console.log('\n=== Example 3: Get Performance Metrics ===');
  
  // First call - Cache MISS
  console.log('First call for 30 days (Cache MISS):');
  const metrics30 = await cachedService.getPerformanceMetrics(zoneId, 30);
  console.log(`Impressions: ${metrics30.totalImpressions}, Clicks: ${metrics30.totalClicks}, CTR: ${metrics30.ctr.toFixed(2)}%`);
  
  // Second call with same parameters - Cache HIT
  console.log('\nSecond call for 30 days (Cache HIT):');
  const metrics30Again = await cachedService.getPerformanceMetrics(zoneId, 30);
  console.log(`Impressions: ${metrics30Again.totalImpressions} (from cache)`);
  
  // Different days parameter - Cache MISS (different cache key)
  console.log('\nCall for 7 days (Cache MISS):');
  const metrics7 = await cachedService.getPerformanceMetrics(zoneId, 7);
  console.log(`Impressions: ${metrics7.totalImpressions}, Clicks: ${metrics7.totalClicks}`);
}

// Example 4: Create ad zone and cache invalidation
async function createAdZone(cachedService: CachedAdvertisementService) {
  console.log('\n=== Example 4: Create Ad Zone (Cache Invalidation) ===');
  
  // Get zones (populates cache)
  console.log('Getting zones (populates cache):');
  const zonesBefore = await cachedService.getAdZones({ isActive: true });
  console.log(`Zones before: ${zonesBefore.length}`);
  
  // Create new zone (invalidates cache)
  console.log('\nCreating new zone (invalidates cache):');
  const newZone = await cachedService.createAdZone({
    name: 'New Sidebar Banner',
    position: 'sidebar',
    dimensions: { width: 300, height: 250, unit: 'px' },
    configuration: {
      displayTiming: { frequency: 'always' },
      targeting: { devices: ['desktop', 'tablet'] },
    },
  });
  console.log(`Created zone: ${newZone.name} (ID: ${newZone.id})`);
  
  // Get zones again (Cache MISS due to invalidation)
  console.log('\nGetting zones again (Cache MISS):');
  const zonesAfter = await cachedService.getAdZones({ isActive: true });
  console.log(`Zones after: ${zonesAfter.length}`);
}

// Example 5: Update ad placement and cache invalidation
async function updateAdPlacement(cachedService: CachedAdvertisementService, zoneId: string) {
  console.log('\n=== Example 5: Update Ad Placement (Cache Invalidation) ===');
  
  // Get zone (populates cache)
  console.log('Getting zone (populates cache):');
  const zoneBefore = await cachedService.getAdZoneById(zoneId);
  console.log(`Zone active status: ${zoneBefore?.isActive}`);
  
  // Update zone (invalidates cache)
  console.log('\nUpdating zone (invalidates cache):');
  const updatedZone = await cachedService.updateAdPlacement(zoneId, {
    isActive: false,
    configuration: {
      displayTiming: { frequency: 'once' },
    },
  });
  console.log(`Updated zone active status: ${updatedZone.isActive}`);
  
  // Get zone again (Cache MISS due to invalidation)
  console.log('\nGetting zone again (Cache MISS):');
  const zoneAfter = await cachedService.getAdZoneById(zoneId);
  console.log(`Zone active status: ${zoneAfter?.isActive}`);
}

// Example 6: Track ad performance and cache invalidation
async function trackAdPerformance(cachedService: CachedAdvertisementService, adId: string, zoneId: string) {
  console.log('\n=== Example 6: Track Ad Performance (Cache Invalidation) ===');
  
  // Get performance metrics (populates cache)
  console.log('Getting performance metrics (populates cache):');
  const metricsBefore = await cachedService.getPerformanceMetrics(zoneId);
  console.log(`Clicks before: ${metricsBefore.totalClicks}`);
  
  // Track click event (invalidates performance cache)
  console.log('\nTracking click event (invalidates cache):');
  await cachedService.trackAdPerformance(adId, {
    type: 'click',
    timestamp: new Date(),
    metadata: {
      userSession: 'session-123',
      userAgent: 'Mozilla/5.0...',
      page: '/products/laptop-123',
    },
  });
  console.log('Click tracked');
  
  // Get performance metrics again (Cache MISS due to invalidation)
  console.log('\nGetting performance metrics again (Cache MISS):');
  const metricsAfter = await cachedService.getPerformanceMetrics(zoneId);
  console.log(`Clicks after: ${metricsAfter.totalClicks}`);
}

// Example 7: Get active advertisements with caching
async function getActiveAdvertisements(cachedService: CachedAdvertisementService, zoneId: string) {
  console.log('\n=== Example 7: Get Active Advertisements ===');
  
  // First call - Cache MISS
  console.log('First call (Cache MISS):');
  const ads1 = await cachedService.getActiveAdvertisements(zoneId);
  console.log(`Found ${ads1.length} active advertisements`);
  
  // Second call - Cache HIT
  console.log('\nSecond call (Cache HIT):');
  const ads2 = await cachedService.getActiveAdvertisements(zoneId);
  console.log(`Found ${ads2.length} active advertisements (from cache)`);
}

// Example 8: Cache warming
async function warmCacheExample(cachedService: CachedAdvertisementService) {
  console.log('\n=== Example 8: Cache Warming ===');
  
  // Clear cache first
  await cachedService.clearCache();
  console.log('Cache cleared');
  
  // Warm cache
  console.log('\nWarming cache...');
  await cachedService.warmCache();
  console.log('Cache warmed with active zones and advertisements');
  
  // Verify cache is populated (should be Cache HIT)
  console.log('\nVerifying cache (should be Cache HIT):');
  const zones = await cachedService.getAdZones({ isActive: true });
  console.log(`Found ${zones.length} zones (from cache)`);
}

// Example 9: Cache statistics
async function getCacheStatistics() {
  console.log('\n=== Example 9: Cache Statistics ===');
  
  const stats = await CacheService.getStats();
  console.log('Cache Statistics:');
  console.log(`- Total keys: ${stats.keys}`);
  console.log(`- Memory used: ${stats.memory}`);
  console.log(`- Cache hits: ${stats.hits}`);
  console.log(`- Cache misses: ${stats.misses}`);
  
  // Calculate hit rate
  const hits = parseInt(stats.hits);
  const misses = parseInt(stats.misses);
  const total = hits + misses;
  const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) : '0.00';
  console.log(`- Hit rate: ${hitRate}%`);
}

// Example 10: Complete workflow
async function completeWorkflowExample(pool: Pool) {
  console.log('\n=== Example 10: Complete Workflow ===\n');
  
  // Initialize service
  const cachedService = await initializeCachedAdvertisementService(pool);
  
  // Create a new ad zone
  const newZone = await cachedService.createAdZone({
    name: 'Homepage Header',
    position: 'header',
    dimensions: { width: 728, height: 90, unit: 'px' },
  });
  console.log(`✅ Created zone: ${newZone.name}`);
  
  // Create an advertisement
  const newAd = await cachedService.createAdvertisement(
    newZone.id,
    'static_banner',
    'https://example.com/banner.jpg',
    new Date(),
    undefined,
    { categories: ['electronics', 'laptops'] }
  );
  console.log(`✅ Created advertisement: ${newAd.id}`);
  
  // Get active advertisements (Cache MISS)
  const activeAds = await cachedService.getActiveAdvertisements(newZone.id);
  console.log(`✅ Found ${activeAds.length} active ads (Cache MISS)`);
  
  // Get active advertisements again (Cache HIT)
  const activeAdsAgain = await cachedService.getActiveAdvertisements(newZone.id);
  console.log(`✅ Found ${activeAdsAgain.length} active ads (Cache HIT)`);
  
  // Track impression
  await cachedService.trackAdPerformance(newAd.id, {
    type: 'impression',
    timestamp: new Date(),
  });
  console.log(`✅ Tracked impression`);
  
  // Track click
  await cachedService.trackAdPerformance(newAd.id, {
    type: 'click',
    timestamp: new Date(),
  });
  console.log(`✅ Tracked click`);
  
  // Get performance metrics (Cache MISS due to tracking)
  const metrics = await cachedService.getPerformanceMetrics(newZone.id);
  console.log(`✅ Performance: ${metrics.totalImpressions} impressions, ${metrics.totalClicks} clicks, ${metrics.ctr.toFixed(2)}% CTR`);
  
  // Get cache statistics
  await getCacheStatistics();
}

// Export examples for use in other files
export {
  initializeCachedAdvertisementService,
  getActiveAdZones,
  getAdZoneById,
  getPerformanceMetrics,
  createAdZone,
  updateAdPlacement,
  trackAdPerformance,
  getActiveAdvertisements,
  warmCacheExample,
  getCacheStatistics,
  completeWorkflowExample,
};

// Example usage in Express route
/*
import express from 'express';
import { pool } from './config/database';

const app = express();
const cachedService = await initializeCachedAdvertisementService(pool);

// Get all active ad zones
app.get('/api/ads/zones', async (req, res) => {
  try {
    const zones = await cachedService.getAdZones({ isActive: true });
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ad zones' });
  }
});

// Get ad zone by ID
app.get('/api/ads/zones/:id', async (req, res) => {
  try {
    const zone = await cachedService.getAdZoneById(req.params.id);
    if (!zone) {
      return res.status(404).json({ error: 'Ad zone not found' });
    }
    res.json(zone);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ad zone' });
  }
});

// Get performance metrics
app.get('/api/ads/zones/:id/performance', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const metrics = await cachedService.getPerformanceMetrics(req.params.id, days);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// Track ad event
app.post('/api/ads/:id/track', async (req, res) => {
  try {
    await cachedService.trackAdPerformance(req.params.id, {
      type: req.body.type,
      timestamp: new Date(),
      metadata: req.body.metadata,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track ad event' });
  }
});
*/
