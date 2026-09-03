import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import AuditLog, { AuditAction } from "@/models/AuditLog";

const SENSITIVE_FIELD = /password|token|secret|authorization|cookie|credential|api[_-]?key/i;

type AuditValue = Record<string, unknown> | undefined;

export interface AuditEventInput {
  action: AuditAction;
  entityType: string;
  entityId?: unknown;
  labId?: unknown;
  branchId?: unknown;
  changes?: AuditValue;
  metadata?: AuditValue;
}

function toObjectId(value: unknown) {
  const stringValue = String(value || "");
  return mongoose.Types.ObjectId.isValid(stringValue) ? new mongoose.Types.ObjectId(stringValue) : undefined;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object" || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SENSITIVE_FIELD.test(key) ? "[REDACTED]" : redact(entry),
    ])
  );
}

export async function writeAuditLog(request: NextRequest, event: AuditEventInput): Promise<void> {
  try {
    await dbConnect();
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const forwardedFor = request.headers.get("x-forwarded-for");

    await AuditLog.create({
      ...event,
      entityId: event.entityId ? String(event.entityId) : undefined,
      labId: toObjectId(event.labId),
      branchId: toObjectId(event.branchId),
      actorId: toObjectId(token?.id),
      actorName: typeof token?.name === "string" ? token.name : undefined,
      actorEmail: typeof token?.email === "string" ? token.email : undefined,
      changes: redact(event.changes),
      metadata: redact(event.metadata),
      requestMethod: request.method,
      requestPath: request.nextUrl.pathname,
      ipAddress: forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
}