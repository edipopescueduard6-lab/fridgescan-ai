import { AsyncLocalStorage } from 'async_hooks';
import { PrismaClient } from '@prisma/client';
import { Response, NextFunction } from 'express';

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

// Helper type for query args that have a `where` clause
interface WithWhere {
  where?: Record<string, any>;
}

interface WithData {
  data?: Record<string, any>;
}

/**
 * Set up Row Level Security via Prisma Client Extensions ($extends).
 * Returns a new extended PrismaClient that automatically injects userId
 * filters on protected models (PantryItem, SavedRecipe, ScanHistory).
 *
 * Usage:
 *   const basePrisma = new PrismaClient();
 *   const prisma = setupRLS(basePrisma);
 */
export function setupRLS(prisma: PrismaClient) {
  return prisma.$extends({
    query: {
      pantryItem: buildModelRLS('pantryItem', prisma),
      savedRecipe: buildModelRLS('savedRecipe', prisma),
      scanHistory: buildModelRLS('scanHistory', prisma),
    },
  });
}

/**
 * Build RLS query overrides for a single model.
 */
function buildModelRLS(modelName: string, basePrisma: PrismaClient) {
  return {
    // --- READ ---
    async findMany({ args, query }: { args: any; query: any }) {
      const userId = getCurrentUserId();
      if (userId) {
        args.where = { ...args.where, userId };
      }
      return query(args);
    },

    async findFirst({ args, query }: { args: any; query: any }) {
      const userId = getCurrentUserId();
      if (userId) {
        args.where = { ...args.where, userId };
      }
      return query(args);
    },

    async findUnique({ args, query }: { args: any; query: any }) {
      // findUnique doesn't support arbitrary where, so pass through
      // Ownership is enforced at the route level for unique lookups
      return query(args);
    },

    // --- COUNT / AGGREGATE ---
    async count({ args, query }: { args: any; query: any }) {
      const userId = getCurrentUserId();
      if (userId) {
        args.where = { ...args.where, userId };
      }
      return query(args);
    },

    async groupBy({ args, query }: { args: any; query: any }) {
      const userId = getCurrentUserId();
      if (userId) {
        args.where = { ...args.where, userId };
      }
      return query(args);
    },

    // --- CREATE ---
    async create({ args, query }: { args: any; query: any }) {
      const userId = getCurrentUserId();
      if (userId && args.data && !args.data.userId) {
        args.data.userId = userId;
      }
      return query(args);
    },

    async createMany({ args, query }: { args: any; query: any }) {
      const userId = getCurrentUserId();
      if (userId && Array.isArray(args.data)) {
        args.data = args.data.map((item: any) => ({
          ...item,
          userId: item.userId || userId,
        }));
      }
      return query(args);
    },

    // --- UPDATE ---
    async update({ args, query }: { args: any; query: any }) {
      const userId = getCurrentUserId();
      if (userId && args.where?.id) {
        // Verify ownership before allowing update
        const existing = await (basePrisma as any)[modelName].findFirst({
          where: { id: args.where.id, userId },
          select: { id: true },
        });
        if (!existing) {
          throw new Error('Acces interzis: nu ai permisiunea sa modifici aceasta resursa');
        }
      }
      return query(args);
    },

    async updateMany({ args, query }: { args: any; query: any }) {
      const userId = getCurrentUserId();
      if (userId) {
        args.where = { ...args.where, userId };
      }
      return query(args);
    },

    // --- DELETE ---
    async delete({ args, query }: { args: any; query: any }) {
      const userId = getCurrentUserId();
      if (userId && args.where?.id) {
        // Verify ownership before allowing delete
        const existing = await (basePrisma as any)[modelName].findFirst({
          where: { id: args.where.id, userId },
          select: { id: true },
        });
        if (!existing) {
          throw new Error('Acces interzis: nu ai permisiunea sa stergi aceasta resursa');
        }
      }
      return query(args);
    },

    async deleteMany({ args, query }: { args: any; query: any }) {
      const userId = getCurrentUserId();
      if (userId) {
        args.where = { ...args.where, userId };
      }
      return query(args);
    },
  };
}
