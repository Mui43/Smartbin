import { Router } from "express";
import { Bin } from "../models/bin.js";
import { Telemetry } from "../models/telemetry.js";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { createAuditLog } from "../services/auditLog.js";

const router = Router();

/**
 * GET /api/bins
 * ดูรายการถังทั้งหมด
 * admin / staff / viewer
 */
router.get("/", authenticate, async (_req, res) => {
  try {
    const bins = await Bin.find()
      .sort({ name: 1 })
      .lean();

    const data = await Promise.all(
      bins.map(async (bin) => {
        const latestTelemetry =
          await Telemetry.findOne({
            binId: bin.binId,
          })
            .sort({ timestamp: -1 })
            .lean();

        return {
          id: bin._id,
          binId: bin.binId,
          name: bin.name,
          location: bin.location,
          mqttTopic: bin.mqttTopic,
          thresholdPct: bin.thresholdPct,

          level:
            latestTelemetry?.level ?? null,

          sensorStatus:
            latestTelemetry?.sensorStatus ?? null,

          voltage:
            latestTelemetry?.voltage ?? null,

          batteryPct:
            latestTelemetry?.batteryPct ?? null,

          lastSeen:
            latestTelemetry?.timestamp ?? null,

          createdAt: bin.createdAt,
          updatedAt: bin.updatedAt,
        };
      })
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get bins error:", error);

    res.status(500).json({
      success: false,
      error: {
        code: "BINS_FETCH_FAILED",
        message: "Unable to fetch bins",
      },
    });
  }
});

/**
 * POST /api/bins
 * สร้างถังใหม่
 * admin เท่านั้น
 */
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const {
        binId,
        name,
        location,
        mqttTopic,
        thresholdPct,
      } = req.body;

      if (
        !binId ||
        !name ||
        !location ||
        !mqttTopic
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message:
              "binId, name, location and mqttTopic are required",
          },
        });
      }

      const existingBin = await Bin.findOne({
        $or: [
          { binId },
          { mqttTopic },
        ],
      });

      if (existingBin) {
        return res.status(409).json({
          success: false,
          error: {
            code: "BIN_ALREADY_EXISTS",
            message:
              "Bin ID or MQTT topic already exists",
          },
        });
      }

      const bin = await Bin.create({
        binId: String(binId).trim(),
        name: String(name).trim(),
        location: String(location).trim(),
        mqttTopic: String(mqttTopic).trim(),
        thresholdPct:
          thresholdPct !== undefined
            ? Number(thresholdPct)
            : 85,
      });

      await createAuditLog({
        req,
        action: "CREATE_BIN",
        binId: bin.binId,
        details: {
          name: bin.name,
          location: bin.location,
          mqttTopic: bin.mqttTopic,
          thresholdPct: bin.thresholdPct,
        },
      });

      res.status(201).json({
        success: true,
        data: bin,
      });
    } catch (error) {
      console.error("Create bin error:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "BIN_CREATE_FAILED",
          message: "Unable to create bin",
        },
      });
    }
  }
);

/**
 * PUT /api/bins/:id
 * แก้ไขข้อมูลถัง
 * admin เท่านั้น
 */
router.put(
  "/:id",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const binId = String(req.params.id);

      const {
        name,
        location,
        mqttTopic,
        thresholdPct,
      } = req.body;

      const updateData: {
        name?: string;
        location?: string;
        mqttTopic?: string;
        thresholdPct?: number;
      } = {};

      if (name !== undefined) {
        updateData.name =
          String(name).trim();
      }

      if (location !== undefined) {
        updateData.location =
          String(location).trim();
      }

      if (mqttTopic !== undefined) {
        updateData.mqttTopic =
          String(mqttTopic).trim();
      }

      if (thresholdPct !== undefined) {
        const value = Number(thresholdPct);

        if (
          Number.isNaN(value) ||
          value < 0 ||
          value > 100
        ) {
          return res.status(400).json({
            success: false,
            error: {
              code: "INVALID_THRESHOLD",
              message:
                "thresholdPct must be between 0 and 100",
            },
          });
        }

        updateData.thresholdPct = value;
      }

      const bin = await Bin.findOneAndUpdate(
        { binId },
        { $set: updateData },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!bin) {
        return res.status(404).json({
          success: false,
          error: {
            code: "BIN_NOT_FOUND",
            message: "Bin not found",
          },
        });
      }

      await createAuditLog({
        req,
        action: "UPDATE_BIN",
        binId,
        details: {
          changes: updateData,
        },
      });

      res.json({
        success: true,
        data: bin,
      });
    } catch (error) {
      console.error("Update bin error:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "BIN_UPDATE_FAILED",
          message: "Unable to update bin",
        },
      });
    }
  }
);

/**
 * DELETE /api/bins/:id
 * ลบถัง
 * admin เท่านั้น
 */
router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  async (req, res) => {
    try {
      const binId = String(req.params.id);

      const bin = await Bin.findOneAndDelete({
        binId,
      });

      if (!bin) {
        return res.status(404).json({
          success: false,
          error: {
            code: "BIN_NOT_FOUND",
            message: "Bin not found",
          },
        });
      }

      await createAuditLog({
        req,
        action: "DELETE_BIN",
        binId,
        details: {
          name: bin.name,
          location: bin.location,
        },
      });

      res.json({
        success: true,
        data: {
          binId,
          message: "Bin deleted successfully",
        },
      });
    } catch (error) {
      console.error("Delete bin error:", error);

      res.status(500).json({
        success: false,
        error: {
          code: "BIN_DELETE_FAILED",
          message: "Unable to delete bin",
        },
      });
    }
  }
);

/**
 * GET /api/bins/:id/telemetry
 * ดูประวัติ Telemetry
 * admin / staff / viewer
 *
 * รองรับ:
 * ?page=1
 * ?limit=10
 * ?startDate=2026-09-01
 * ?endDate=2026-09-15
 */
router.get(
  "/:id/telemetry",
  authenticate,
  async (req, res) => {
    try {
      const binId = String(req.params.id);

      const page = Math.max(
        Number(req.query.page) || 1,
        1
      );

      const limit = Math.min(
        Math.max(
          Number(req.query.limit) || 10,
          1
        ),
        100
      );

      const startDate = req.query.startDate
        ? new Date(
          String(req.query.startDate)
        )
        : null;

      const endDate = req.query.endDate
        ? new Date(
          String(req.query.endDate)
        )
        : null;

      if (
        startDate &&
        Number.isNaN(startDate.getTime())
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_START_DATE",
            message: "Invalid startDate",
          },
        });
      }

      if (
        endDate &&
        Number.isNaN(endDate.getTime())
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_END_DATE",
            message: "Invalid endDate",
          },
        });
      }

      const filter: {
        binId: string;
        timestamp?: {
          $gte?: Date;
          $lte?: Date;
        };
      } = {
        binId,
      };

      if (startDate || endDate) {
        filter.timestamp = {};

        if (startDate) {
          filter.timestamp.$gte =
            startDate;
        }

        if (endDate) {
          endDate.setHours(
            23,
            59,
            59,
            999
          );

          filter.timestamp.$lte =
            endDate;
        }
      }

      const skip =
        (page - 1) * limit;

      const [data, total] =
        await Promise.all([
          Telemetry.find(filter)
            .sort({
              timestamp: -1,
            })
            .skip(skip)
            .limit(limit)
            .lean(),

          Telemetry.countDocuments(
            filter
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
        "Telemetry fetch error:",
        error
      );

      res.status(500).json({
        success: false,
        error: {
          code: "TELEMETRY_FETCH_FAILED",
          message:
            "Unable to fetch telemetry",
        },
      });
    }
  }
);

export default router;