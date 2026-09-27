import { Router } from "express";

import { AuditLog } from "../models/auditLog.js";
import { Bin } from "../models/bin.js";

import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { auditFilter, redactAuditDetails, csvCell } from "../lib/auditView.js";
import { thaiDateKey, thaiTimestamp } from "../lib/thaiTime.js";

const router = Router();

router.get("/export", authenticate, requireRole("admin"), async (req, res) => {
  let filter;
  try { filter = auditFilter(req.query); }
  catch { return res.status(400).json({ success: false, error: { message: "ช่วงวันที่ไม่ถูกต้อง" } }); }
  try {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="audit-logs-${thaiDateKey()}.csv"`);
    res.write("\uFEFF" + ["Time (UTC+7)", "User", "Role", "Action", "Bin", "IP", "Details"].map(csvCell).join(",") + "\r\n");
    const cursor = AuditLog.find(filter).sort({ timestamp: -1, _id: -1 }).lean().cursor();
    try {
      for await (const log of cursor) {
        if (res.destroyed) break;
        res.write([thaiTimestamp(new Date(log.timestamp)), log.email, log.role, log.action, log.binId, log.ip, JSON.stringify(redactAuditDetails(log.details))].map(csvCell).join(",") + "\r\n");
      }
    } finally { await cursor.close(); }
    res.end();
  } catch (error) {
    console.error("Export audit logs failed:", error);
    if (res.headersSent) res.destroy();
    else res.status(500).json({ success: false, error: { message: "ไม่สามารถส่งออก Logs ได้" } });
  }
});

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

      let filter: Record<string, unknown>;
      try { filter = auditFilter(req.query); }
      catch { return res.status(400).json({ success: false, error: { message: "ช่วงวันที่ไม่ถูกต้อง" } }); }

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
          .sort({ timestamp: -1, _id: -1 })
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
      const bins = await Bin.find({ binId: { $in: data.map(log => log.binId).filter((id): id is string => typeof id === "string") } }).select("binId name").lean();
      const names = new Map(bins.map(bin => [bin.binId, bin.name]));

      return res.json({
        success: true,
        data: data.map(log => ({ ...log, binName: log.binId ? names.get(log.binId) || log.details?.name : undefined, details: redactAuditDetails(log.details) })),

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
