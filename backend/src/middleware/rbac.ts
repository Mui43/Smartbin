import { Request, Response, NextFunction } from "express";
import { AuthUser } from "./auth.js";

export function requireRole(
  ...roles: AuthUser["role"][]
) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission",
        },
      });
    }

    next();
  };
}