import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication token required',
          code: 'UNAUTHORIZED'
        }
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired access token',
          code: 'TOKEN_EXPIRED'
        }
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true,
        deletedAt: null
      },
      include: {
        customer: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User account not found or deactivated',
          code: 'UNAUTHORIZED'
        }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
