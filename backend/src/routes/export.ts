import { Router } from "express";
import { thaiDateFilter, thaiDateKey, thaiTimestamp } from "../lib/thaiTime.js";
import { Telemetry } from "../models/telemetry.js";
import { Bin } from "../models/bin.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/export/telemetry
 *
 * Query:
 * ?binId=A-001
 * &startDate=2026-09-01
 * &endDate=2026-09-17
 */
router.get(
  "/telemetry",
  authenticate,
  async (req, res) => {
    try {
      const binId = req.query.binId
        ? String(req.query.binId)
        : undefined;

      const startDate = req.query.startDate
        ? String(req.query.startDate)
        : undefined;

      const endDate = req.query.endDate
        ? String(req.query.endDate)
        : undefined;

      if (!binId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "BIN_ID_REQUIRED",
            message:
              "binId is required",
          },
        });
      }

      const bin = await Bin.findOne({
        binId,
      }).lean();

      if (!bin) {
        return res.status(404).json({
          success: false,
          error: {
            code: "BIN_NOT_FOUND",
            message: "Bin not found",
          },
        });
      }

      let timestamp: ReturnType<typeof thaiDateFilter>;
      try {
        timestamp = thaiDateFilter(startDate, endDate);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: { code: "INVALID_DATE_RANGE", message: error instanceof Error ? error.message : "Invalid date range" },
        });
      }
      const filter = {
        binId,
        ...(Object.keys(timestamp).length ? { timestamp } : {}),
      };
      const telemetry =
        await Telemetry.find(filter)
          .sort({
            timestamp: 1,
          })
          .lean();

      const escapeCsv = (
        value: unknown
      ) => {
        if (
          value === null ||
          value === undefined
        ) {
          return "";
        }

        const text = String(value);

        if (
          text.includes(",") ||
          text.includes('"') ||
          text.includes("\n")
        ) {
          return `"${text.replace(
            /"/g,
            '""'
          )}"`;
        }

        return text;
      };

      const header = [
        "Time (Asia/Bangkok)",
        "Bin ID",
        "Bin Name",
        "Location",
        "Level (%)",
        "Capacitive",
        "Inductive",
        "Level Sensor",
        "Voltage (V)",
        "Battery (%)",
      ];

      const rows = telemetry.map(
        (item) => [
          thaiTimestamp(new Date(item.timestamp)),

          item.binId,

          bin.name,

          bin.location,

          item.level,

          item.sensorStatus
            ?.capacitive ?? "",

          item.sensorStatus
            ?.inductive ?? "",

          item.sensorStatus
            ?.level ?? "",

          item.voltage,

          item.batteryPct,
        ]
          .map(escapeCsv)
          .join(",")
      );

      // เพิ่ม BOM เพื่อให้ Excel อ่านภาษาไทยได้
      const csv =
        "\uFEFF" +
        [
          header.map(escapeCsv).join(","),
          ...rows,
        ].join("\r\n");

      const filename =
        `telemetry-${binId}-${thaiDateKey()}.csv`;

      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      res.send(csv);
    } catch (error) {
      console.error(
        "CSV export error:",
        error
      );

      res.status(500).json({
        success: false,
        error: {
          code: "CSV_EXPORT_FAILED",
          message:
            "Unable to export CSV",
        },
      });
    }
  }
);

export default router;