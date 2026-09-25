import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { connectDatabase } from "./config/database.js";

import healthRouter from "./routes/health.js";
import binsRouter from "./routes/bins.js";
import realtimeRouter from "./routes/realtime.js";
import lockRouter from "./routes/lock.js";
import alertsRouter from "./routes/alerts.js";
import lineRouter from "./routes/line.js";
import authRouter from "./routes/auth.js";
import logsRouter from "./routes/logs.js";
import exportRouter from "./routes/export.js";
import dashboardRouter from "./routes/dashboard.js";
import deviceRouter from "./routes/device.js";
import wasteStatsRouter from "./routes/wasteStats.js";

import { startMqtt } from "./mqtt/client.js";

const app = express();

const PORT =
  Number(process.env.PORT) || 4000;

app.use(helmet());

app.use(
  cors({
    origin: true,
  })
);

app.use(express.json());

app.use(pinoHttp());

// ==================================
// Root
// ==================================

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message:
      "Smart Bin API is running",
  });
});

// ==================================
// Routes
// ==================================

app.use(
  "/api/health",
  healthRouter
);

app.use(
  "/api/bins",
  binsRouter
);

app.use(
  "/api/realtime",
  realtimeRouter
);

app.use(
  "/api/bins",
  lockRouter
);

app.use(
  "/api/alerts",
  alertsRouter
);

app.use(
  "/api/line",
  lineRouter
);

app.use(
  "/api/auth",
  authRouter
);

app.use(
  "/api/logs",
  logsRouter
);

app.use(
  "/api/export",
  exportRouter
);

app.use(
  "/api/dashboard",
  dashboardRouter
);

app.use(
  "/api/waste-stats",
  wasteStatsRouter
);

app.use(
  "/api/device",
  deviceRouter
);

// ==================================
// 404
// ==================================

app.use(
  (_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message:
          "Route not found",
      },
    });
  }
);

// ==================================
// Start Server
// ==================================

async function startServer() {
  try {
    await connectDatabase();

    startMqtt();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `🚀 Backend running on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "❌ Failed to start server:",
      error
    );

    process.exit(1);
  }
}

startServer();