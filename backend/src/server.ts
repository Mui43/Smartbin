import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { connectDatabase } from "./config/database.js";

import healthRouter from "./routes/health.js";
import binsRouter from "./routes/bins.js";

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

app.get("/", (req, res) => {
  res.json({
    message: "Smart Bin API is running",
    status: "OK"
  });
});

app.use(
  "/api/health",
  healthRouter
);

app.use(
  "/api/bins",
  binsRouter
);

app.use(
  (
    _req,
    res
  ) => {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  }
);

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(
        `Backend running on port ${PORT}`   
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server",
      error
    );

    process.exit(1);
  }
}

startServer();