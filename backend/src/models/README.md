# Models

This directory contains TypeScript interfaces and types for the Product Price Comparison Website backend.

## Structure

Models represent data structures used throughout the application:

- **Product**: Product information and specifications
- **Category**: Product category hierarchy
- **PriceEntry**: Price data from various sources
- **User**: Administrator and Reviewer user accounts
- **Article**: Content articles for products
- **AffiliateConfig**: Affiliate program configurations
- **Advertisement**: Advertisement zones and placements
- **SearchLog**: Search analytics data

## Guidelines

- Models should define TypeScript interfaces for data structures
- Models should include Zod schemas for validation
- Models should be exported from a central index file
- Models should match database schema where applicable
- Models should include JSDoc comments for OpenAPI documentation
