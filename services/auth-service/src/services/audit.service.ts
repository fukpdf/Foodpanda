import type { Database } from "@deliveryos/database";
import { auditLogs } from "@deliveryos/database";

export type AuditAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "password_change"
  | "approve"
  | "reject"
  | "suspend"
  | "ban";

export interface AuditParams {
  db: Database;
  actorId?: string;
  actorRole?: string;
  actorIp?: string;
  actorUserAgent?: string;
  sessionId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  reason?: string;
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await params.db.insert(auditLogs).values({
      actorId: params.actorId ?? null,
      actorRole: params.actorRole,
      actorIp: params.actorIp,
      actorUserAgent: params.actorUserAgent,
      sessionId: params.sessionId ? (params.sessionId as `${string}-${string}-${string}-${string}-${string}`) : null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId as `${string}-${string}-${string}-${string}-${string}`,
      previousValue: params.previousValue,
      newValue: params.newValue,
      metadata: params.metadata,
      reason: params.reason,
      occurredAt: new Date(),
    });
  } catch {
    // Audit logging must never crash the main flow
  }
}
