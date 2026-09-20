import { Router } from "express";
import { sendLineMessage } from "../services/line.js";

const router = Router();

router.post("/test", async (_req, res) => {
  try {
    await sendLineMessage(
      "🤖 Smart Bin Test\n\nระบบเชื่อมต่อ LINE สำเร็จแล้ว ✅"
    );

    res.json({
      success: true,
      message: "LINE message sent",
    });
  } catch (error) {
    console.error(
      "LINE test error:",
      error
    );

    res.status(500).json({
      success: false,
      error: {
        code: "LINE_SEND_FAILED",
        message:
          "Unable to send LINE message",
      },
    });
  }
});

export default router;