import { Router } from "express";

import { Bin } from "../models/bin.js";
import { checkBinAlerts } from "../alerts/checkAlerts.js";
import { Alert } from "../models/alert.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/alerts
 * ดู Alerts ปัจจุบันของทุก Bin
 */
router.get("/", async (_req, res) => {
  try {
    const bins = await Bin.find()
      .select("binId name location")
      .lean();

    const alerts: Array<{
      binId: string;
      binName: string;
      location: string;
      type: string;
      level: string;
      message: string;
    }> = [];

    for (const bin of bins) {
      const binAlerts = await checkBinAlerts(bin.binId);

      for (const alert of binAlerts) {
        alerts.push({
          binId: bin.binId,
          binName: bin.name,
          location: bin.location,
          ...alert,
        });
      }
    }

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Alert fetch error:", error);

    res.status(500).json({
      success: false,
      error: {
        code: "ALERT_FETCH_FAILED",
        message: "Unable to fetch alerts",
      },
    });
  }
});

/**
 * GET /api/alerts/history
 * ดูประวัติ Alerts
 *
 * Query:
 * ?page=1
 * &limit=20
 * &type=FULL
 * &active=true
 */
router.get(
  "/history",
  authenticate,
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

      const type = req.query.type
        ? String(req.query.type)
        : undefined;

      const active =
        req.query.active !== undefined
          ? String(req.query.active) === "true"
          : undefined;

      const skip = (page - 1) * limit;

      // สร้าง Query แบบ Mongoose
      let query = Alert.find();

      if (type) {
        query = query
          .where("type")
          .equals(type);
      }

      if (active !== undefined) {
        query = query
          .where("active")
          .equals(active);
      }

      // สร้าง filter สำหรับนับจำนวน
      const countFilter: Record<
        string,
        string | boolean
      > = {};

      if (type) {
        countFilter.type = type;
      }

      if (active !== undefined) {
        countFilter.active = active;
      }

      const [data, total] =
        await Promise.all([
          query
            .sort({
              createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
            .lean(),

          Alert.countDocuments(
            countFilter
          ),
        ]);

      const totalPages =
        Math.ceil(total / limit);

      res.json({
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
        "Get alert history error:",
        error
      );

      res.status(500).json({
        success: false,
        error: {
          code:
            "ALERT_HISTORY_FETCH_FAILED",
          message:
            "Unable to fetch alert history",
        },
      });
    }
  }
);

/**
 * GET /api/alerts/:id
 * ตรวจสอบ Alerts ของ Bin ที่ระบุ
 */
router.get(
  "/:id",
  async (req, res) => {
    try {
      const binId = String(
        req.params.id
      );

      const alerts =
        await checkBinAlerts(binId);

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      console.error(
        "Alert check error:",
        error
      );

      res.status(500).json({
        success: false,
        error: {
          code: "ALERT_CHECK_FAILED",
          message:
            "Unable to check alerts",
        },
      });
    }
  }
);

export default router;
