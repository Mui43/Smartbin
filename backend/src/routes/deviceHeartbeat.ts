import { Router } from "express";
import { Device } from "../models/device.js";

const router = Router();

function checkApiKey(req: any, res: any, next: any) {
  const apiKey = req.header("x-device-api-key");

  if (
    !process.env.DEVICE_API_KEY ||
    apiKey !== process.env.DEVICE_API_KEY
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid device API key",
    });
  }

  next();
}


// =====================================================
// ESP32 Heartbeat
// GET /api/device/poll?deviceId=esp32-01
// =====================================================

router.get(
  "/poll",
  checkApiKey,
  async (req, res) => {
    try {
      const deviceId = String(
        req.query.deviceId || ""
      );

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: "deviceId is required",
        });
      }

      const device = await Device.findOneAndUpdate(
        { deviceId },

        {
          $set: {
            status: "online",
            lastSeen: new Date(),
          },
        },

        {
          new: true,
        }
      );

      if (!device) {
        return res.status(404).json({
          success: false,
          message: "Device not registered",
        });
      }

      res.json({
        success: true,

        data: {
          deviceId: device.deviceId,
          status: device.status,
          lastSeen: device.lastSeen,
        },
      });
    } catch (error) {
      console.error(
        "Device poll error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Device poll failed",
      });
    }
  }
);


// =====================================================
// ESP32 Report
// POST /api/device/report
// =====================================================

router.post(
  "/report",
  checkApiKey,
  async (req, res) => {
    try {
      const {
        deviceId,
        relayStatus,
        lockStatus,
      } = req.body;

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: "deviceId is required",
        });
      }

      const device = await Device.findOneAndUpdate(
        {
          deviceId,
        },

        {
          $set: {
            status: "online",
            lastSeen: new Date(),

            "metadata.relayStatus":
              relayStatus,

            "metadata.lockStatus":
              lockStatus,
          },
        },

        {
          new: true,
        }
      );

      if (!device) {
        return res.status(404).json({
          success: false,
          message: "Device not registered",
        });
      }

      res.json({
        success: true,
        data: device,
      });
    } catch (error) {
      console.error(
        "Device report error:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Device report failed",
      });
    }
  }
);

export default router;