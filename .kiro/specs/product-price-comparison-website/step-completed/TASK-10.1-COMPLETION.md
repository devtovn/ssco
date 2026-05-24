# Task 10.1: Create Authentication Service with JWT - Completion Report

## Overview
This task implements JWT-based authentication system with password hashing, refresh tokens, and authentication middleware for the Product Price Comparison Website backend.

## Files Created

### 1. AuthenticationService (`src/services/AuthenticationService.ts`)

#### Features Implemented
- **JWT Token Generation**: Access tokens (24h) and refresh tokens (7d)
- **Password Hashing**: bcrypt with 10 salt rounds
- **Refresh Token Storage**: Redis-based storage with TTL
- **Token Verification**: JWT signature and expiry validation
- **User Authentication**: Email/password login with validation

#### Key Methods

**`login(credentials: LoginCredentials)`**
- Validates email and password
- Checks user active status
- Verifies password with bcrypt
- Updates last_login timestamp
- Generates JWT tokens
- Returns user object and tokens

**`logout(refreshToken: string)`**
- Verifies refresh token
- Removes token from Redis
- Graceful error handling

**`refreshAccessToken(refreshToken: string)`**
- Verifies refresh token
- Checks token exists in Redis
- Fetches current user data
- Generates new token pair
- Removes old refresh token

**`verifyAccessToken(token: string)`**
- Verifies JWT signature
- Checks token expiry
- Returns decoded payload

**`getUserById(userId: string)`**
- Fetches user from database
- Returns user object or null

**`hashPassword(password: string)`**
- Hashes password with bcrypt
- Uses 10 salt rounds

#### Token Payload Structure
```typescript
interface TokenPayload {
  userId: string;
  email: string;
  role: 'Administrator' | 'Reviewer';
  permissions: Record<string, boolean>;
}
```

#### Token Storage
- **Access Token**: Client-side (not stored in Redis)
- **Refresh Token**: Redis with key format `refresh_token:{userId}:{token}`
- **TTL**: 7 days (604800 seconds)

### 2. Authentication Middleware (`src/middleware/auth.ts`)

#### Middleware Functions

**`authenticateJWT(authService: AuthenticationService)`**
- Extracts Bearer token from Authorization header
- Verifies token using AuthenticationService
- Attaches decoded user to request object
- Returns 401 if token missing or invalid

**`requireRole(...roles: string[])`**
- Checks if authenticated user has required role
- Returns 403 if insufficient permissions
- Supports multiple role options

**`requirePermission(...permissions: string[])`**
- Checks if user has specific permissions
- Returns 403 if permission not granted
- Supports multiple permission options

**`optionalAuth(authService: AuthenticationService)`**
- Adds user to request if token valid
- Continues without user if no token
- Useful for public endpoints with optional auth

#### AuthRequest Interface
```typescript
interface AuthRequest extends Request {
  user?: TokenPayload;
}
```

### 3. Authentication Routes (`src/routes/auth.ts`)

#### Endpoints Implemented

**POST /api/auth/login**
- **Description**: Authenticate user with email and password
- **Request Body**:
  ```json
  {
    "email": "admin@pricecompare.vn",
    "password": "Admin@123456"
  }
  ```
- **Response**:
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "admin@pricecompare.vn",
      "role": "Administrator",
      "permissions": {...}
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "jwt-refresh-token",
      "expiresIn": 86400
    },
    "redirectUrl": "/admin/dashboard"
  }
  ```
- **Status Codes**: 200 (success), 400 (validation), 401 (invalid credentials)

**POST /api/auth/logout**
- **Description**: Invalidate refresh token
- **Request Body**:
  ```json
  {
    "refreshToken": "jwt-refresh-token"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Logout successful"
  }
  ```
- **Status Codes**: 200 (success), 400 (validation)

**POST /api/auth/refresh**
- **Description**: Get new access token using refresh token
- **Request Body**:
  ```json
  {
    "refreshToken": "jwt-refresh-token"
  }
  ```
- **Response**:
  ```json
  {
    "tokens": {
      "accessToken": "new-jwt-token",
      "refreshToken": "new-jwt-refresh-token",
      "expiresIn": 86400
    }
  }
  ```
- **Status Codes**: 200 (success), 400 (validation), 401 (invalid/expired token)

**GET /api/auth/me**
- **Description**: Get current authenticated user information
- **Headers**: `Authorization: Bearer {access-token}`
- **Response**:
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "admin@pricecompare.vn",
      "role": "Administrator",
      "permissions": {...},
      "isActive": true,
      "lastLogin": "2024-01-01T00:00:00Z"
    }
  }
  ```
- **Status Codes**: 200 (success), 401 (not authenticated), 404 (user not found)

#### Validation
- Uses Zod schemas for request validation
- Email format validation
- Password minimum length (8 characters)
- Detailed error messages

#### OpenAPI Documentation
- Complete OpenAPI 3.0 documentation for all endpoints
- Request/response schemas
- Authentication requirements
- Example payloads

### 4. Updated Main Application (`src/index.ts`)

#### Changes Made
- Import AuthenticationService
- Initialize authService with database pool and JWT secret
- Store authService in app for route access
- Register auth routes at `/api/auth`

#### Service Initialization
```typescript
const authService = new AuthenticationService(
  pool,
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

app.set('authService', authService);
```

## Configuration

### Environment Variables (`.env.example`)
Already configured with:
```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d
```

### Dependencies
All required dependencies already installed:
- `bcrypt@^5.1.1` - Password hashing
- `jsonwebtoken@^9.0.2` - JWT token generation/verification
- `@types/bcrypt@^5.0.2` - TypeScript types
- `@types/jsonwebtoken@^9.0.5` - TypeScript types

## Usage Examples

### 1. Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pricecompare.vn",
    "password": "Admin@123456"
  }'
```

### 2. Access Protected Endpoint
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer {access-token}"
```

### 3. Refresh Token
```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "{refresh-token}"
  }'
```

### 4. Logout
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "{refresh-token}"
  }'
```

## Using Authentication Middleware in Routes

### Example: Protected Admin Route
```typescript
import { Router } from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.post('/admin/categories',
  authenticateJWT(authService),
  requireRole('Administrator'),
  async (req, res) => {
    // Only authenticated Administrators can access
    // req.user contains user information
  }
);
```

### Example: Reviewer-Only Route
```typescript
router.post('/content/generate',
  authenticateJWT(authService),
  requireRole('Reviewer', 'Administrator'),
  async (req, res) => {
    // Both Reviewers and Administrators can access
  }
);
```

### Example: Permission-Based Route
```typescript
router.get('/admin/analytics',
  authenticateJWT(authService),
  requirePermission('view_analytics'),
  async (req, res) => {
    // Only users with view_analytics permission
  }
);
```

### Example: Optional Authentication
```typescript
router.get('/products/:id',
  optionalAuth(authService),
  async (req, res) => {
    // Public endpoint, but adds user info if authenticated
    if (req.user) {
      // Personalized response for authenticated users
    }
  }
);
```

## Security Features

### 1. Password Security
- bcrypt hashing with 10 salt rounds
- Passwords never stored in plain text
- Constant-time comparison prevents timing attacks

### 2. Token Security
- JWT signed with secret key
- Short-lived access tokens (24 hours)
- Refresh tokens stored in Redis with TTL
- Token invalidation on logout

### 3. Error Handling
- Generic error messages for authentication failures
- No information leakage about user existence
- Proper HTTP status codes

### 4. Session Management
- Refresh token rotation on refresh
- Old refresh tokens invalidated
- Redis-based token storage for scalability

## Testing

### Manual Testing
1. Start backend server: `npm run dev`
2. Test login with default admin account
3. Use access token to access protected endpoints
4. Test token refresh
5. Test logout

### Test Credentials
- **Email**: admin@pricecompare.vn
- **Password**: Admin@123456
- **Role**: Administrator

## Requirements Satisfied

This task satisfies the following requirements:
- **Requirement 1.1**: Authenticate Administrator and Reviewer users using email and password
- **Requirement 1.2**: Support two authenticated user roles
- **Requirement 1.3**: Redirect to appropriate dashboard on successful login
- **Requirement 1.4**: Display error message on authentication failure
- **Requirement 1.5**: Maintain authenticated user sessions for 24 hours

## Next Steps

After completing this task, you can proceed to:
1. **Task 10.2**: Implement role-based access control (RBAC) middleware (partially done)
2. **Task 10.3**: Create authentication API endpoints (completed)
3. **Task 11.1**: Create AdminService for system management
4. **Task 7.1**: Create AffiliateLinkService class

## Notes

### Production Considerations
1. **Change JWT_SECRET**: Use a strong, random secret in production
2. **HTTPS Only**: Always use HTTPS in production
3. **Rate Limiting**: Add rate limiting to auth endpoints
4. **Monitoring**: Monitor failed login attempts
5. **Token Rotation**: Consider implementing token rotation policies

### Future Enhancements
1. **Two-Factor Authentication**: Add 2FA support
2. **Password Reset**: Implement password reset flow
3. **Account Lockout**: Lock accounts after failed attempts
4. **Audit Logging**: Log all authentication events
5. **Session Management**: Admin panel to view/revoke sessions
