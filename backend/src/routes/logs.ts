import { Router } from "express";

import { AuditLog } from "../models/auditLog.js";

import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();

/**
 * GET /api/logs
 *
 * admin เท่านั้น
 *
 * ตัวอย่าง:
 * /api/logs?page=1&limit=20
 * /api/logs?action=LOCK
 * /api/logs?binId=A-001
 * /api/logs?email=admin@example.com
 */

router.get(
  "/",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const page = Math.max(
        Number(req.query.page) || 1,
        1
      );

      const limit = Math.min(
        Math.max(
          Number(req.query.limit) || 20,
          1
        ),
        100
      );

      const action = req.query.action
        ? String(req.query.action)
        : undefined;

      const binId = req.query.binId
        ? String(req.query.binId)
        : undefined;

      const email = req.query.email
        ? String(req.query.email)
        : undefined;

      const filter: Record<string, string> = {};

      if (action) {
        filter.action = action;
      }

      if (binId) {
        filter.binId = binId;
      }

      if (email) {
        filter.email = email;
      }

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        AuditLog.find(
          filter as Record<string, unknown>
        )
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        AuditLog.countDocuments(
          filter as Record<string, unknown>
        ),
      ]);

      const totalPages = Math.ceil(
        total / limit
      );

      return res.json({
        success: true,
        data,

        pagination: {
          page,
          limit,
          total,
          totalPages,

          hasNextPage:
            page < totalPages,

          hasPreviousPage:
            page > 1,
        },
      });
    } catch (error) {
      console.error(
        "Get audit logs error:",
        error
      );

      return res.status(500).json({
        success: false,
        error: {
          code: "AUDIT_LOG_FETCH_FAILED",
          message:
            "Unable to fetch audit logs",
        },
      });
    }
  }
);

export default router;