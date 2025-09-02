import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a community platform audit log entry by its ID from the audit log
 * table.
 *
 * This operation retrieves a full audit log record by its unique identifier.
 * The audit log includes details such as the admin or member involved, the type
 * of event (e.g., admin_action, escalation, data_access), the entity type and
 * ID impacted, complete metadata in JSON format, the result of the action, and
 * the timestamp. Audit logs are read-only and not user-editable. Access to this
 * endpoint is restricted to admin users for purposes of compliance, historical
 * traceability, and legal audit obligations. Related operations include listing
 * audit logs for a date range and fetching all actions taken by a specific
 * admin or on a specific entity. Care must be taken to ensure sensitive
 * metadata is handled according to policy.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the request
 * @param props.auditLogId - Unique identifier of the audit log entry to
 *   retrieve
 * @returns Full audit log record matching ICommunityPlatformAuditLog
 * @throws {Error} When the record does not exist (HTTP 404)
 */
export async function get__communityPlatform_admin_auditLogs_$auditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAuditLog> {
  const { auditLogId } = props;
  const record =
    await MyGlobal.prisma.community_platform_audit_logs.findUniqueOrThrow({
      where: { id: auditLogId },
    });
  return {
    id: record.id,
    admin_id: record.admin_id ?? undefined,
    member_id: record.member_id ?? undefined,
    event_type: record.event_type,
    entity_type: record.entity_type,
    entity_id: record.entity_id,
    metadata_json: record.metadata_json ?? undefined,
    result: record.result,
    created_at: toISOStringSafe(record.created_at),
  };
}
