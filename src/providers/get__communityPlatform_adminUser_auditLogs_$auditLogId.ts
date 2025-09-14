import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Get details of an audit log entry (community_platform_audit_logs).
 *
 * Retrieves a specific audit log entry by its unique UUID from the database.
 * Only admin users are authorized to access audit logs, which contain details
 * of sensitive security and platform events. The returned object includes event
 * metadata, actor information, event context, and exact timing.
 *
 * @param props - Function parameters
 * @param props.adminUser - The authenticated admin user performing the request
 *   (authorization enforced by decorator)
 * @param props.auditLogId - Unique identifier (UUID) of the audit log entry to
 *   retrieve
 * @returns The detailed information of the audit log entry (event type, actor,
 *   detail, timestamp, etc.)
 * @throws {Error} When the audit log does not exist (404) or database access
 *   fails
 */
export async function get__communityPlatform_adminUser_auditLogs_$auditLogId(props: {
  adminUser: AdminuserPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAuditLog> {
  const { auditLogId } = props;
  const log =
    await MyGlobal.prisma.community_platform_audit_logs.findUniqueOrThrow({
      where: { id: auditLogId },
      select: {
        id: true,
        actor_memberuser_id: true,
        actor_adminuser_id: true,
        event_type: true,
        event_detail: true,
        ip_address: true,
        created_at: true,
      },
    });

  return {
    id: log.id,
    actor_memberuser_id: log.actor_memberuser_id ?? undefined,
    actor_adminuser_id: log.actor_adminuser_id ?? undefined,
    event_type: log.event_type,
    event_detail: log.event_detail,
    ip_address: log.ip_address ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  };
}
