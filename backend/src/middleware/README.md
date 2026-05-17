# Middleware

This directory contains Express middleware functions for the Product Price Comparison Website backend.

## Available Middleware

- **errorHandler**: Global error handling middleware
- **notFoundHandler**: 404 route not found handler
- **validateRequest**: Request validation using Zod schemas
- **authMiddleware**: JWT authentication verification (to be implemented)
- **rbacMiddleware**: Role-based access control (to be implemented)
- **rateLimitMiddleware**: API rate limiting (to be implemented)

## Guidelines

- Middleware should follow Express middleware signature: `(req, res, next)`
- Middleware should call `next()` to pass control to the next middleware
- Middleware should call `next(error)` to pass errors to error handler
- Middleware should be composable and reusable
- Middleware should have a single responsibility
