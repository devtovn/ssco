import { Request, Response, NextFunction } from 'express';
import { AuthenticationService, TokenPayload } from '../services/AuthenticationService';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticateJWT = (authService: AuthenticationService) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        code: 'NO_TOKEN',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = authService.verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid token';
      return res.status(401).json({
        error: message,
        code: 'INVALID_TOKEN',
      });
    }
  };
};

/**
 * Middleware to require specific role(s)
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
};


/**
 * Middleware to require specific permission(s)
 */
export const requirePermission = (...permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const userPermissions = req.user.permissions || {};
    const hasPermission = permissions.some(
      (permission) => userPermissions[permission] === true
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: permissions,
      });
    }

    next();
  };
};

/**
 * Optional authentication - adds user to request if token is valid, but doesn't require it
 */
export const optionalAuth = (authService: AuthenticationService) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);

    try {
      const decoded = authService.verifyAccessToken(token);
      req.user = decoded;
    } catch (error) {
      // Invalid token, but we don't fail the request
      console.warn('Optional auth failed:', error);
    }

    next();
  };
};
