import { Router } from "express";
import { WasteEvent } from "../models/wasteEvent.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const range = String(req.query.range || "day");
    const binId = req.query.binId
      ? String(req.query.binId)
      : null;

    const monthParam = req.query.month
      ? String(req.query.month)
      : null;

    const now = new Date();

    let start: Date;
    let end: Date;
    let groupFormat: string;

    // =========================
    // DAY
    // =========================
    if (range === "day") {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );

      groupFormat = "%H:00";
    }

    // =========================
    // WEEK
    // =========================
    else if (range === "week") {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);

      const day = start.getDay();

      const diff = day === 0 ? 6 : day - 1;

      start.setDate(start.getDate() - diff);

      end = new Date(start);
      end.setDate(start.getDate() + 7);

      groupFormat = "%Y-%m-%d";
    }

    // =========================
    // MONTH
    // =========================
    else if (range === "month") {
      if (monthParam) {
        const [year, month] = monthParam
          .split("-")
          .map(Number);

        start = new Date(year, month - 1, 1);

        end = new Date(year, month, 1);
      } else {
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        );

        end = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          1
        );
      }

      groupFormat = "%Y-%m-%d";
    }

    else {
      return res.status(400).json({
        success: false,
        message: "Invalid range",
      });
    }

    const result = await WasteEvent.aggregate([
      {
        $match: {
          ...(binId ? { binId } : {}),
          timestamp: {
            $gte: start,
            $lt: end,
          },
        },
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: "$timestamp",
            },
          },

          count: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const total = result.reduce(
      (sum, item) => sum + item.count,
      0
    );

    res.json({
      success: true,

      data: {
        range,
        start,
        end,
        total,

        chart: result.map((item) => ({
          label: item._id,
          count: item.count,
        })),
      },
    });
  } catch (error) {
    console.error("Waste stats error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load waste statistics",
    });
  }
});

export default router;
