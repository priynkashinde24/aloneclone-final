import { Request, Response, NextFunction } from 'express';
import { verifyCsrfToken } from '../utils/csrf';
import { sendError } from '../utils/responseFormatter';

/**
 * Public routes that don't require CSRF protection
 */
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/invites/accept',
  '/api/invites/validate',
  '/api/auth/verify-email',
  '/api/auth/send-verification',
  '/api/auth/reset-password/validate',
];

/**
 * HTTP methods that don't require CSRF protection (read-only)
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Check if a route is public (doesn't require CSRF protection)
 */
const isPublicRoute = (path: string): boolean => {
  return PUBLIC_ROUTES.some((route) => path.startsWith(route));
};

/**
 * CSRF Protection Middleware
 * Implements Double Submit Cookie Pattern
 * 
 * Requirements:
 * - CSRF token must be present in both cookie and header
 * - Tokens must match exactly
 * - Only applies to state-changing methods (POST, PUT, PATCH, DELETE)
 * - Skips public auth routes
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  const method = req.method.toUpperCase();
  const path = req.path;

  // Skip CSRF check for safe methods
  if (SAFE_METHODS.includes(method)) {
    return next();
  }

  // Skip CSRF check for public routes
  if (isPublicRoute(path)) {
    return next();
  }

  // Verify CSRF token
  if (!verifyCsrfToken(req)) {
    sendError(res, 'Invalid or missing CSRF token', 403);
    return;
  }

  // CSRF token is valid, proceed
  next();
};

