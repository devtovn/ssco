# Services

This directory contains business logic services for the Product Price Comparison Website backend.

## Structure

Services are organized by domain:

- **SearchService**: Product search and discovery functionality
- **PriceComparisonService**: Price aggregation and comparison logic
- **CategoryManagementService**: Category hierarchy and management
- **AffiliateLinkService**: Affiliate link generation and tracking
- **DataCollectionService**: Data collection coordination from multiple sources
- **ContentManagementService**: AI-powered content generation and management
- **AdvertisementService**: Advertisement zone and placement management
- **AnalyticsService**: Analytics tracking and reporting
- **AdminService**: Administrative operations and system configuration
- **AuthService**: Authentication and authorization

## Guidelines

- Each service should be a class with clear responsibilities
- Services should use dependency injection for database and cache connections
- Services should handle business logic, not HTTP concerns
- Services should throw custom errors that are handled by middleware
- Services should be testable in isolation
