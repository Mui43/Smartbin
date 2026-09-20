import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { User } from "../models/user.js";
import { createAuditLog } from "../services/auditLog.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // ตรวจสอบข้อมูล Login
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_CREDENTIALS",
          message: "Email and password are required",
        },
      });
    }

    // ตรวจสอบ JWT Secret
    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: {
          code: "AUTH_CONFIG_ERROR",
          message: "JWT_SECRET is not configured",
        },
      });
    }

    // ค้นหา User
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    // ไม่พบ User
    if (!user) {
      await createAuditLog({
        req,
        action: "LOGIN_FAILED",
        email: email.toLowerCase().trim(),
        details: {
          reason: "USER_NOT_FOUND",
        },
      });

      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    // User ถูกปิดใช้งาน
    if (!user.active) {
      await createAuditLog({
        req,
        action: "LOGIN_FAILED",
        userId: String(user._id),
        email: user.email,
        details: {
          reason: "USER_INACTIVE",
        },
      });

      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    // ตรวจสอบ Password
    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatch) {
      await createAuditLog({
        req,
        action: "LOGIN_FAILED",
        userId: String(user._id),
        email: user.email,
        details: {
          reason: "INVALID_PASSWORD",
        },
      });

      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    // สร้าง JWT
    const token = jwt.sign(
      {
        id: String(user._id),
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // Audit Log: Login สำเร็จ
    await createAuditLog({
      req,
      action: "LOGIN",
      userId: String(user._id),
      email: user.email,
      role: user.role,
      details: {
        message: "User logged in successfully",
      },
    });

    // ส่งข้อมูลกลับ Frontend
    return res.json({
      success: true,
      data: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "LOGIN_FAILED",
        message: "Login failed",
      },
    });
  }
});

export default router;