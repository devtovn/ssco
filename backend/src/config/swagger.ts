import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Product Price Comparison API',
      version: '1.0.0',
      description:
        'API documentation for the Product Price Comparison Website - A public-facing web application for the Vietnamese market that enables users to search and compare product prices from multiple e-commerce platforms.',
      contact: {
        name: 'API Support',
        email: 'support@pricecomparison.vn',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}${process.env.API_PREFIX || '/api'}`,
        description: 'Development server',
      },
      {
        url: `https://api.pricecomparison.vn${process.env.API_PREFIX || '/api'}`,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication for Administrator and Reviewer users',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            message: {
              type: 'string',
              example: 'An error occurred',
            },
            code: {
              type: 'string',
              example: 'INTERNAL_ERROR',
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            uptime: {
              type: 'number',
              example: 123.456,
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Unauthorized',
                code: 'UNAUTHORIZED',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'User does not have permission to access this resource',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Forbidden',
                code: 'FORBIDDEN',
              },
            },
          },
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Resource not found',
                code: 'NOT_FOUND',
              },
            },
          },
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                status: 'error',
                message: 'Internal server error',
                code: 'INTERNAL_ERROR',
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Search',
        description: 'Product search and discovery endpoints (public access)',
      },
      {
        name: 'Products',
        description: 'Product information and price comparison endpoints (public access)',
      },
      {
        name: 'Categories',
        description: 'Product category management endpoints',
      },
      {
        name: 'Authentication',
        description: 'User authentication endpoints for Administrator and Reviewer',
      },
      {
        name: 'Admin',
        description: 'Administrative endpoints (Administrator only)',
      },
      {
        name: 'Content',
        description: 'Content management endpoints (Reviewer only)',
      },
      {
        name: 'Advertisements',
        description: 'Advertisement management endpoints',
      },
      {
        name: 'Affiliate',
        description: 'Affiliate link management endpoints',
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
