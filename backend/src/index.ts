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
import { CacheService } from './utils/cache';

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

// Store services in app for access in routes
app.set('authService', authService);
app.set('affiliateService', cachedAffiliateService);
app.set('pool', pool);

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Documentation
app.use(`${API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
import authRoutes from './routes/auth';
import affiliateRoutes from './routes/affiliate';
import categoryRoutes from './routes/categories';
import searchRoutes from './routes/search';
import priceRoutes from './routes/prices';
import adminRoutes from './routes/admin';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/affiliate`, affiliateRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/products`, priceRoutes);
app.use(`${API_PREFIX}`, priceRoutes); // For /deals endpoint
app.use(`${API_PREFIX}/admin`, adminRoutes);

// TODO: Add more routes
// app.use(`${API_PREFIX}/content`, contentRoutes);
// app.use(`${API_PREFIX}/ads`, adRoutes);
// app.use(`${API_PREFIX}/analytics`, analyticsRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}${API_PREFIX}/docs`);
  console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
});

export default app;
