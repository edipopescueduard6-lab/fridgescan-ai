import { AsyncLocalStorage } from 'async_hooks';
import { PrismaClient, Prisma } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

// ============================================================
// AsyncLocalStorage for request-scoped userId
// ============================================================

interface RequestContext {
  userId: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current userId from the async context.
 * Returns undefined if no context is set (e.g. outside a request).
 */
export function getCurrentUserId(): string | undefined {
  const store = asyncLocalStorage.getStore();
  return store?.userId;
}

/**
 * Set the current userId in the async context.
 * Typically called from auth middleware after JWT verification.
 */
export function setCurrentUserId(userId: string): void {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.userId = userId;
  }
}

/**
 * Express middleware that wraps the request lifecycle in an AsyncLocalStorage context.
 * Must be applied AFTER auth middleware so that req.userId is available.
 */
export function rlsContextMiddleware(req: any, _res: Response, next: NextFunction): void {
  const userId = req.userId || '';
  asyncLocalStorage.run({ userId }, () => {
    next();
  });
}

// ============================================================
// Models protected by RLS
// ============================================================

const PROTECTED_MODELS = ['PantryItem', 'SavedRecipe', 'ScanHistory'];

/**
 * Set up Row Level Security middleware on Prisma.
 * Automatically injects userId filters on protected models
 * to prevent cross-user data access.
 */
export function setupRLS(prisma: PrismaClient): void {
  prisma.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
    // Only apply to protected models
    if (!params.model || !PROTECTED_MODELS.includes(params.model)) {
      return next(params);
    }

    const userId = getCurrentUserId();

    // If no userId in context, skip RLS (allows system-level operations)
    if (!userId) {
      return next(params);
    }

    // --- READ operations: inject userId filter ---
    if (params.action === 'findMany' || params.action === 'findFirst') {
      if (!params.args) {
        params.args = {};
      }
      if (!params.args.where) {
        params.args.where = {};
      }
      params.args.where.userId = userId;
      return next(params);
    }

    // --- COUNT operations: inject userId filter ---
    if (params.action === 'count') {
      if (!params.args) {
        params.args = {};
      }
      if (!params.args.where) {
        params.args.where = {};
      }
      params.args.where.userId = userId;
      return next(params);
    }

    // --- GROUP BY operations: inject userId filter ---
    if (params.action === 'groupBy') {
      if (!params.args) {
        params.args = {};
      }
      if (!params.args.where) {
        params.args.where = {};
      }
      params.args.where.userId = userId;
      return next(params);
    }

    // --- CREATE operations: inject userId ---
    if (params.action === 'create') {
      if (!params.args) {
        params.args = {};
      }
      if (!params.args.data) {
        params.args.data = {};
      }
      // Only set userId if not already provided
      if (!params.args.data.userId) {
        params.args.data.userId = userId;
      }
      return next(params);
    }

    // --- UPDATE operations: verify ownership before updating ---
    if (params.action === 'update' || params.action === 'updateMany') {
      if (!params.args) {
        params.args = {};
      }
      if (!params.args.where) {
        params.args.where = {};
      }

      // For single update, verify ownership first
      if (params.action === 'update' && params.args.where.id) {
        const existing = await (prisma as any)[lowerFirst(params.model)].findFirst({
          where: { id: params.args.where.id, userId },
          select: { id: true },
        });

        if (!existing) {
          throw new Error('Acces interzis: nu ai permisiunea sa modifici aceasta resursa');
        }
      }

      // For updateMany, add userId filter
      if (params.action === 'updateMany') {
        params.args.where.userId = userId;
      }

      return next(params);
    }

    // --- DELETE operations: verify ownership before deleting ---
    if (params.action === 'delete' || params.action === 'deleteMany') {
      if (!params.args) {
        params.args = {};
      }
      if (!params.args.where) {
        params.args.where = {};
      }

      // For single delete, verify ownership first
      if (params.action === 'delete' && params.args.where.id) {
        const existing = await (prisma as any)[lowerFirst(params.model)].findFirst({
          where: { id: params.args.where.id, userId },
          select: { id: true },
        });

        if (!existing) {
          throw new Error('Acces interzis: nu ai permisiunea sa stergi aceasta resursa');
        }
      }

      // For deleteMany, add userId filter
      if (params.action === 'deleteMany') {
        params.args.where.userId = userId;
      }

      return next(params);
    }

    // All other actions pass through
    return next(params);
  });
}

// ============================================================
// Helpers
// ============================================================

/**
 * Convert PascalCase model name to camelCase for Prisma client access.
 * e.g. "PantryItem" -> "pantryItem", "ScanHistory" -> "scanHistory"
 */
function lowerFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}
