import { Router } from "express";
import { Telemetry } from "../models/telemetry.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

/**
 * GET /api/dashboard/stats
 *
 * Query:
 * ?range=day
 * ?range=week
 * ?range=month
 */
router.get(
  "/stats",
  authenticate,
  async (req, res) => {
    try {
      const range =
        String(req.query.range || "day");

      if (
        !["day", "week", "month"].includes(
          range
        )
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_RANGE",
            message:
              "Range must be day, week, or month",
          },
        });
      }

      const now = new Date();

      const startDate = new Date(now);

      if (range === "day") {
        startDate.setHours(
          0,
          0,
          0,
          0
        );
      }

      if (range === "week") {
        startDate.setDate(
          startDate.getDate() - 6
        );
        startDate.setHours(
          0,
          0,
          0,
          0
        );
      }

      if (range === "month") {
        startDate.setDate(
          startDate.getDate() - 29
        );
        startDate.setHours(
          0,
          0,
          0,
          0
        );
      }

      const telemetry =
        await Telemetry.find({
          timestamp: {
            $gte: startDate,
            $lte: now,
          },
        })
          .sort({
            timestamp: 1,
          })
          .lean();

      const totalRecords =
        telemetry.length;

      const average = (
        values: number[]
      ) => {
        if (values.length === 0) {
          return 0;
        }

        return (
          values.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / values.length
        );
      };

      const levels = telemetry.map(
        (item) => item.level
      );

      const batteries = telemetry.map(
        (item) => item.batteryPct
      );

      const voltages = telemetry.map(
        (item) => item.voltage
      );

      const averageLevel = average(
        levels
      );

      const averageBattery = average(
        batteries
      );

      const averageVoltage = average(
        voltages
      );

      const maxLevel =
        levels.length > 0
          ? Math.max(...levels)
          : 0;

      /**
       * สร้างข้อมูลกราฟ
       *
       * day   -> แบ่งตามชั่วโมง
       * week  -> แบ่งตามวัน
       * month -> แบ่งตามวัน
       */
      const chartMap =
        new Map<
          string,
          number[]
        >();

      for (const item of telemetry) {
        const date = new Date(
          item.timestamp
        );

        let key: string;

        if (range === "day") {
          key = `${String(
            date.getHours()
          ).padStart(2, "0")}:00`;
        } else {
          key = date
            .toISOString()
            .slice(0, 10);
        }

        if (!chartMap.has(key)) {
          chartMap.set(key, []);
        }

        chartMap
          .get(key)!
          .push(item.level);
      }

      const chart = Array.from(
        chartMap.entries()
      ).map(
        ([label, values]) => ({
          label,
          level: Number(
            average(values).toFixed(2)
          ),
        })
      );

      res.json({
        success: true,
        data: {
          range,
          startDate:
            startDate.toISOString(),
          endDate:
            now.toISOString(),

          summary: {
            totalRecords,
            averageLevel: Number(
              averageLevel.toFixed(2)
            ),
            averageBattery: Number(
              averageBattery.toFixed(2)
            ),
            averageVoltage: Number(
              averageVoltage.toFixed(2)
            ),
            maxLevel,
          },

          chart,
        },
      });
    } catch (error) {
      console.error(
        "Dashboard statistics error:",
        error
      );

      res.status(500).json({
        success: false,
        error: {
          code:
            "DASHBOARD_STATS_FAILED",
          message:
            "Unable to fetch dashboard statistics",
        },
      });
    }
  }
);

export default router;