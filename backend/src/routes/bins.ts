import { Router } from "express";
import { Bin } from "../models/bin.js";
import { Telemetry } from "../models/telemetry.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const bins = await Bin.find().sort({ name: 1 }).lean();

    const result = await Promise.all(
      bins.map(async (bin) => {
        const latest = await Telemetry.findOne({
          binId: bin.binId,
        })
          .sort({ timestamp: -1 })
          .lean();

        return {
          id: bin.binId,
          name: bin.name,
          location: bin.location,
          thresholdPct: bin.thresholdPct,
          level: latest?.level ?? null,
          batteryPct: latest?.batteryPct ?? null,
          voltage: latest?.voltage ?? null,
          lastSeen: latest?.timestamp ?? null,
        };
      })
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: {
        code: "BINS_FETCH_FAILED",
        message: "Unable to fetch bins",
      },
    });
  }
});

export default router;