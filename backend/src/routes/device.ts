import { Router, Request, Response } from "express";
import crypto from "crypto";

import { Device } from "../models/device.js";
import { Bin } from "../models/bin.js";
import { authenticate } from "../middleware/auth.js";
import { broadcastRealtime } from "./realtime.js";
import { confirmRestart, confirmServoCommand } from "../line/commandResults.js";

const router = Router();

type AuthRequest = Request & {
  user?: {
    id?: string;
    role?: string;
  };
};

function isAdmin(req: AuthRequest) {
  return req.user?.role === "admin";
}

function hasDeviceKey(req: Request) {
  const expected = process.env.DEVICE_API_KEY;
  const supplied = req.header("x-api-key");
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length &&
    crypto.timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

function broadcastDevice(device: {
  binId: string;
  deviceId: string;
  name: string;
  status: string;
  lastSeen?: Date;
  state?: string;
}) {
  broadcastRealtime(
    {
      type: "device",
      binId: device.binId,
      deviceId: device.deviceId,
      name: device.name,
      status: device.status,
      lastSeen: device.lastSeen ?? null,
      state: device.state ?? "unknown",
    },
    "device",
  );
}

function isRegistered(device: {
  binId?: string;
  name?: string;
  type?: string;
}) {
  return Boolean(device.binId && device.name && device.type);
}

/** Record an authenticated device heartbeat, check restart completion, and return its pending command. */
router.get("/poll", async (req, res) => {
  if (!hasDeviceKey(req)) {
    return res
      .status(401)
      .json({ success: false, error: { message: "Invalid device API key" } });
  }

  const deviceId = String(req.query.deviceId || "").trim();
  const bootId = String(req.query.bootId || "").trim();
  if (!deviceId) {
    return res
      .status(400)
      .json({ success: false, error: { message: "deviceId is required" } });
  }

  try {
    const device = await Device.findOne({ deviceId });
    if (!device || !isRegistered(device)) {
      return res
        .status(404)
        .json({ success: false, error: { message: "Device not registered" } });
    }

    if (
      device.type === "ESP32" &&
      bootId &&
      /^[a-fA-F0-9]{1,32}$/.test(bootId)
    ) {
      await confirmRestart(device, bootId);
      device.bootId = bootId;
    }
    device.status = "online";
    device.lastSeen = new Date();
    if ((device.type === "IR_SENSOR" || device.type === "PROXIMITY_SENSOR") &&
        (req.query.state === "on" || req.query.state === "off")) {
      device.state = req.query.state;
    }
    await device.save();
    broadcastDevice(device);

    return res.json({ success: true, command: device.pendingCommand ?? null });
  } catch (error) {
    console.error("Device poll error:", error);
    return res
      .status(500)
      .json({ success: false, error: { message: "Device poll failed" } });
  }
});

/** Acknowledge restart receipt, clear the pending action, and allow 90 seconds for LINE restart confirmation. */
router.post("/ack-restart", async (req, res) => {
  if (!hasDeviceKey(req)) {
    return res
      .status(401)
      .json({ success: false, error: { message: "Invalid device API key" } });
  }
  const deviceId = String(req.body?.deviceId || "").trim();
  if (!deviceId)
    return res
      .status(400)
      .json({ success: false, error: { message: "deviceId is required" } });
  try {
    const pending = await Device.findOne({
      deviceId,
      type: "ESP32",
      pendingCommand: "restart",
    });
    if (!pending)
      return res.status(409).json({
        success: false,
        error: { message: "No restart command pending" },
      });
    const update =
      pending.lineCommand?.action === "restart"
        ? {
            $set: {
              pendingCommand: null,
              "lineCommand.phase": "restarting",
              "lineCommand.deadlineAt": new Date(Date.now() + 90_000),
            },
          }
        : { $set: { pendingCommand: null } };
    const device = await Device.findOneAndUpdate(
      { deviceId, type: "ESP32", pendingCommand: "restart" },
      update,
      { new: true },
    );
    if (!device)
      return res.status(409).json({
        success: false,
        error: { message: "No restart command pending" },
      });
    return res.json({ success: true });
  } catch (error) {
    console.error("Restart acknowledgement failed:", error);
    return res.status(500).json({
      success: false,
      error: { message: "Restart acknowledgement failed" },
    });
  }
});

/** Record an authenticated device state report, confirm matching servo commands, and broadcast the state. */
router.post("/report", async (req, res) => {
  if (!hasDeviceKey(req)) {
    return res
      .status(401)
      .json({ success: false, error: { message: "Invalid device API key" } });
  }

  const deviceId = String(req.body?.deviceId || "").trim();
  const state = req.body?.state;
  if (!deviceId || (state !== "on" && state !== "off")) {
    return res.status(400).json({
      success: false,
      error: { message: "Valid deviceId and state are required" },
    });
  }

  try {
    const device = await Device.findOne({ deviceId });
    if (!device || !isRegistered(device)) {
      return res
        .status(404)
        .json({ success: false, error: { message: "Device not registered" } });
    }

    const confirmed = await confirmServoCommand(device, state);
    if (!confirmed) {
      device.state = state;
      device.status = "online";
      device.lastSeen = new Date();
      if (device.pendingCommand === state && !device.lineCommand) {
        device.pendingCommand = null;
        device.pendingCommandAt = null;
      }
      await device.save();
    }
    broadcastDevice(confirmed || device);

    return res.json({ success: true });
  } catch (error) {
    console.error("Device report error:", error);
    return res
      .status(500)
      .json({ success: false, error: { message: "Device report failed" } });
  }
});

// ==================================
// GET /api/device
// Get all devices
// ==================================

router.get("/", async (_req: Request, res: Response) => {
  try {
    const devices = await Device.find({
      binId: { $exists: true, $ne: "" },
      name: { $exists: true },
      type: { $exists: true },
    })
      .sort({
        binId: 1,
        name: 1,
      })
      .lean();

    return res.json({
      success: true,
      devices,
    });
  } catch (error) {
    console.error("GET /api/device error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "DEVICE_LIST_ERROR",
        message: "Failed to get devices",
      },
    });
  }
});

// ==================================
// GET /api/device/bin/:binId
// Get devices of a bin
// ==================================

router.get("/bin/:binId", async (req: Request, res: Response) => {
  try {
    const binId = String(req.params.binId);

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

    const devices = await Device.find({
      binId,
    })
      .sort({
        name: 1,
      })
      .lean();

    return res.json({
      success: true,

      bin: {
        binId: bin.binId,
        name: bin.name,
        location: bin.location,
      },

      devices,
    });
  } catch (error) {
    console.error("GET /api/device/bin/:binId error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "DEVICE_BIN_ERROR",
        message: "Failed to get bin devices",
      },
    });
  }
});

// ==================================
// GET /api/device/:deviceId
// ==================================

router.get("/:deviceId", async (req: Request, res: Response) => {
  try {
    const deviceId = String(req.params.deviceId);

    const device = await Device.findOne({
      deviceId,
    }).lean();

    if (!device || !isRegistered(device)) {
      return res.status(404).json({
        success: false,
        error: {
          code: "DEVICE_NOT_FOUND",
          message: "Device not found",
        },
      });
    }

    const bin = await Bin.findOne({
      binId: device.binId,
    }).lean();

    return res.json({
      success: true,

      device,

      bin: bin
        ? {
            binId: bin.binId,
            name: bin.name,
            location: bin.location,
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/device/:deviceId error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "DEVICE_DETAIL_ERROR",
        message: "Failed to get device",
      },
    });
  }
});

// ==================================
// POST /api/device
// Admin only
// ==================================

router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Admin permission required",
        },
      });
    }

    const { deviceId, binId, name, type, description, metadata } = req.body;

    if (!deviceId || !binId || !name || !type) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "deviceId, binId, name and type are required",
        },
      });
    }

    const bin = await Bin.findOne({
      binId,
    });

    if (!bin) {
      return res.status(404).json({
        success: false,
        error: {
          code: "BIN_NOT_FOUND",
          message: "Bin not found",
        },
      });
    }

    const exists = await Device.findOne({
      deviceId,
    });

    if (exists && isRegistered(exists)) {
      return res.status(409).json({
        success: false,
        error: {
          code: "DEVICE_EXISTS",
          message: "Device ID already exists",
        },
      });
    }

    const device = exists ?? new Device({ deviceId });
    device.binId = binId;
    device.name = name;
    device.type = type;
    device.description = description;
    device.metadata = metadata ?? {};
    device.status = "offline";
    await device.save();

    return res.status(201).json({
      success: true,
      device,
    });
  } catch (error) {
    console.error("POST /api/device error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "DEVICE_CREATE_ERROR",
        message: "Failed to create device",
      },
    });
  }
});

// ==================================
// PUT /api/device/:deviceId
// Admin only
// ==================================

router.put(
  "/:deviceId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Admin permission required",
          },
        });
      }

      const deviceId = String(req.params.deviceId);

      const device = await Device.findOne({
        deviceId,
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: "DEVICE_NOT_FOUND",
            message: "Device not found",
          },
        });
      }

      const { binId, name, type, description, metadata } = req.body;

      if (binId !== undefined) {
        const bin = await Bin.findOne({
          binId,
        });

        if (!bin) {
          return res.status(404).json({
            success: false,
            error: {
              code: "BIN_NOT_FOUND",
              message: "Bin not found",
            },
          });
        }

        device.binId = binId;
      }

      if (name !== undefined) {
        device.name = name;
      }

      if (type !== undefined) {
        device.type = type;
      }

      if (description !== undefined) {
        device.description = description;
      }

      if (metadata !== undefined) {
        device.metadata = metadata;
      }

      await device.save();

      return res.json({
        success: true,
        device,
      });
    } catch (error) {
      console.error("PUT /api/device/:deviceId error:", error);

      return res.status(500).json({
        success: false,
        error: {
          code: "DEVICE_UPDATE_ERROR",
          message: "Failed to update device",
        },
      });
    }
  },
);

// ==================================
// DELETE /api/device/:deviceId
// Admin only
// ==================================

router.delete(
  "/:deviceId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Admin permission required",
          },
        });
      }

      const deviceId = String(req.params.deviceId);

      const device = await Device.findOneAndDelete({
        deviceId,
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          error: {
            code: "DEVICE_NOT_FOUND",
            message: "Device not found",
          },
        });
      }

      return res.json({
        success: true,
        message: "Device deleted",
      });
    } catch (error) {
      console.error("DELETE /api/device/:deviceId error:", error);

      return res.status(500).json({
        success: false,
        error: {
          code: "DEVICE_DELETE_ERROR",
          message: "Failed to delete device",
        },
      });
    }
  },
);

export default router;
