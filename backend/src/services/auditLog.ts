import { AuditLog, AuditAction } from "../models/auditLog.js";
import { Request } from "express";

interface AuditOptions {
  req: Request;

  action: AuditAction;

  binId?: string;

  details?: Record<string, unknown>;

  userId?: string;

  email?: string;

  role?: "admin" | "staff" | "viewer";
}

export async function createAuditLog({
  req,
  action,
  binId,
  details,
  userId,
  email,
  role,
}: AuditOptions) {
  try {
    await AuditLog.create({
      userId: userId ?? req.user?.id,
      email: email ?? req.user?.email,
      role: role ?? req.user?.role,

      action,

      binId,

      ip:
        req.ip ||
        req.headers["x-forwarded-for"]?.toString(),

      userAgent:
        req.headers["user-agent"],

      details,

      timestamp: new Date(),
    });
  } catch (error) {
    // Audit log ไม่ควรทำให้ API หลักล้ม
    console.error(
      "❌ Audit log error:",
      error
    );
  }
}   