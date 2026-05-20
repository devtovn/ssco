import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { pool } from './config/database';
import { AuthenticationService } from './services/AuthenticationService';
import { AffiliateLinkService } from './services/AffiliateLinkService';
import { CachedAffiliateLinkService } from './services/CachedAffiliateLinkService';
import { AdminService } from './services/AdminService';
import { AdvertisementService } from './services/AdvertisementService';
import { CachedAdvertisementService } from './services/CachedAdvertisementService';
import { CacheService } from './utils/cache';
import { dataCollectionService } from './services/DataCollectionService';
import { analyticsService } from './services/AnalyticsService';
import { contentManagementService } from './services/ContentManagementService';
import { createRateLimiter } from './middleware/rateLimiter';
import { metricsMiddleware, metricsHandler } from './middleware/metrics';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api';

// Initialize services
const authService = new AuthenticationService(
  pool,
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const affiliateLinkService = new AffiliateLinkService(pool);
const cachedAffiliateService = new CachedAffiliateLinkService(
  affiliateLinkService,
  CacheService
);

const adminService = new AdminService(pool);

const advertisementService = new AdvertisementService(pool);
const cachedAdService = new CachedAdvertisementService(
  advertisementService,
  CacheService
);

// Store services in app for access in routes
app.set('authService', authService);
app.set('affiliateService', cachedAffiliateService);
app.set('adminService', adminService);
app.set('adService', cachedAdService);
app.set('analyticsService', analyticsService);
app.set('contentService', contentManagementService);
app.set('pool', pool);

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware);

const searchRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_SEARCH_WINDOW_MS || '60000', 10),
  maxRequests: parseInt(process.env.RATE_LIMIT_SEARCH_MAX || '60', 10),
});

const authRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '60000', 10),
  maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '20', 10),
});

// Root — API info (no handler on / returns NOT_FOUND)
app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Price Comparison API',
    health: '/health',
    docs: `${API_PREFIX}/docs`,
    api: API_PREFIX,
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/metrics', metricsHandler);

// API Documentation
app.use(`${API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
import authRoutes from './routes/auth';
import affiliateRoutes from './routes/affiliate';
import categoryRoutes from './routes/categories';
import searchRoutes from './routes/search';
import priceRoutes from './routes/prices';
import adminRoutes from './routes/admin';
import adRoutes from './routes/ads';
import analyticsRoutes from './routes/analytics';
import contentRoutes from './routes/content';
import publicRoutes from './routes/public';

app.use(`${API_PREFIX}/auth`, authRateLimiter, authRoutes);
app.use(`${API_PREFIX}/affiliate`, affiliateRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/search`, searchRateLimiter, searchRoutes);
app.use(`${API_PREFIX}/products`, priceRoutes);
app.use(`${API_PREFIX}`, priceRoutes); // For /deals endpoint
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/ads`, adRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/content`, contentRoutes);
app.use(`${API_PREFIX}/public`, publicRoutes);

// Initialize data collection queue worker (optional)
if (process.env.DATA_COLLECTION_ENABLED === 'true') {
  dataCollectionService.initializeQueue();
  console.log('📦 Data collection queue worker started');
}

// TODO: Add more routes
// app.use(`${API_PREFIX}/content`, contentRoutes);
// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    docsUrl: `http://localhost:${PORT}${API_PREFIX}/docs`,
    healthUrl: `http://localhost:${PORT}/health`,
    metricsUrl: `http://localhost:${PORT}/metrics`,
  });
});

export default app;
