import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", async (_req, res) => {
  const mongoConnected =
    mongoose.connection.readyState === 1;

  const status =
    mongoConnected
      ? "healthy"
      : "degraded";

  res.status(
    mongoConnected ? 200 : 503
  ).json({
    success: true,

    data: {
      status,

      services: {
        mongodb: mongoConnected
          ? "connected"
          : "disconnected",
      },

      timestamp: new Date().toISOString(),
    },
  });
});

export default router;