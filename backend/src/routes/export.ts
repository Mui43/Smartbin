import { Router } from "express";
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

      const filter: Record<
        string,
        unknown
      > = {
        binId,
      };

      if (startDate) {
        const start = new Date(
          `${startDate}T00:00:00.000Z`
        );

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            error: {
              code: "INVALID_START_DATE",
              message:
                "Invalid startDate",
            },
          });
        }

        filter.timestamp = {
          $gte: start,
        };
      }

      if (endDate) {
        const end = new Date(
          `${endDate}T23:59:59.999Z`
        );

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            error: {
              code: "INVALID_END_DATE",
              message:
                "Invalid endDate",
            },
          });
        }

        if (filter.timestamp) {
          (
            filter.timestamp as {
              $gte?: Date;
              $lte?: Date;
            }
          ).$lte = end;
        } else {
          filter.timestamp = {
            $lte: end,
          };
        }
      }

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
        "Time",
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
          new Date(
            item.timestamp
          ).toISOString(),

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
        `telemetry-${binId}-${new Date()
          .toISOString()
          .slice(0, 10)}.csv`;

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