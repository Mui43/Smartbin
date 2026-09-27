import { Router } from "express";
import { thaiPeriod, THAI_TIME_ZONE } from "../lib/thaiTime.js";
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

    let period: ReturnType<typeof thaiPeriod>;
    try {
      period = thaiPeriod(range, monthParam ?? undefined);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Invalid range",
      });
    }
    const { start, end } = period;
    const groupFormat = range === "day" ? "%H:00" : "%Y-%m-%d";
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
              timezone: THAI_TIME_ZONE,
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
