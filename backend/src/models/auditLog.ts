import mongoose, {
  Schema,
  Document,
} from "mongoose";

export type AuditAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "CREATE_BIN"
  | "UPDATE_BIN"
  | "DELETE_BIN"
  | "LOCK"
  | "UNLOCK";

export interface IAuditLog extends Document {
  userId?: string;
  email?: string;
  role?: "admin" | "staff" | "viewer";
  action: AuditAction;
  binId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: String,
      index: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["admin", "staff", "viewer"],
    },

    action: {
      type: String,
      enum: [
        "LOGIN",
        "LOGIN_FAILED",
        "CREATE_BIN",
        "UPDATE_BIN",
        "DELETE_BIN",
        "LOCK",
        "UNLOCK",
      ],
      required: true,
      index: true,
    },

    binId: {
      type: String,
      index: true,
    },

    ip: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    details: {
      type: Schema.Types.Mixed,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({
  timestamp: -1,
});

export const AuditLog = mongoose.model<IAuditLog>(
  "AuditLog",
  auditLogSchema
);