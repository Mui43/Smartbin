import "dotenv/config";
import express from "express";

import { connectDatabase } from "./config/database.js";

const app = express();

const PORT = Number(process.env.PORT) || 4000;

app.get("/", (_req, res) => {
  console.log("GET / received");

  res.status(200).json({
    success: true,
    message: "Smart Bin API is running",
  });
});

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();