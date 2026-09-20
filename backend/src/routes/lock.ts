import { Router } from "express";
import { Bin } from "../models/bin.js";
import { publishLockCommand } from "../mqtt/client.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { createAuditLog } from "../services/auditLog.js";

const router = Router();

router.post(
  "/:id/lock",
  authenticate,
  requireRole("admin", "staff"),
  async (req, res) => {
    try {
      const binId = String(req.params.id);
      const { action } = req.body;

      if (action !== "lock" && action !== "unlock") {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_LOCK_ACTION",
            message: "Action must be lock or unlock",
          },
        });
      }

      const bin = await Bin.findOne({ binId });

      if (!bin) {
        return res.status(404).json({
          success: false,
          error: {
            code: "BIN_NOT_FOUND",
            message: "Bin not found",
          },
        });
      }

      publishLockCommand(binId, action);

      await createAuditLog({
        req,
        action:
          action === "lock"
            ? "LOCK"
            : "UNLOCK",
        binId,
        details: {
          action,
          message:
            action === "lock"
              ? "Lock command sent"
              : "Unlock command sent",
        },
      });

      res.json({
        success: true,
        data: {
          binId,
          action,
          requestedBy: {
            id: req.user?.id,
            email: req.user?.email,
            role: req.user?.role,
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Lock API error:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "LOCK_COMMAND_FAILED",
          message: "Unable to send lock command",
        },
      });
    }
  }
);

export default router;