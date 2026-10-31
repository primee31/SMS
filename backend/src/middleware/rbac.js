export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access forbidden: Insufficient permissions for this resource',
          code: 'FORBIDDEN'
        }
      });
    }

    next();
  };
}

export function requireOwnershipOrRole(...privilegedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED'
        }
      });
    }

    // Admins and Staff have elevated access
    if (privilegedRoles.includes(req.user.role)) {
      return next();
    }

    // If user is a Customer, verify ownership
    if (req.user.role === 'CUSTOMER') {
      const resourceId = req.params.id || req.params.customerId;
      
      // If resource is Customer record itself:
      if (req.user.customer && req.user.customer.id === resourceId) {
        return next();
      }

      // If route matches user's own userId:
      if (req.user.id === resourceId) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: {
          message: 'Access forbidden: You do not have permission to access another customer\'s records',
          code: 'FORBIDDEN_OWNERSHIP'
        }
      });
    }

    return res.status(403).json({
      success: false,
      error: {
        message: 'Access forbidden: Insufficient permissions',
        code: 'FORBIDDEN'
      }
    });
  };
}
