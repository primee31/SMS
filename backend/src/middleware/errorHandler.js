import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // Zod Validation Error
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }
    });
  }

  // Prisma Unique Constraint Error
  if (err?.code === 'P2002') {
    const target = err.meta?.target ? err.meta.target.join(', ') : 'field';
    return res.status(409).json({
      success: false,
      error: {
        message: `A record with this ${target} already exists`,
        code: 'CONFLICT',
        target
      }
    });
  }

  // Prisma Record Not Found Error
  if (err?.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Resource not found',
        code: 'NOT_FOUND'
      }
    });
  }

  // Prisma Database Connection Failure
  if (err?.name === 'PrismaClientInitializationError' || err?.message?.includes("Can't reach database server")) {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Database connection failed. Please ensure PostgreSQL is running and reachable at DATABASE_URL.',
        code: 'DATABASE_UNAVAILABLE'
      }
    });
  }

  // Custom status code if provided
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error('Unhandled Server Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      details: err.details || null
    }
  });
}
