import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Search and paginate audit logs (community_platform_audit_logs).
 *
 * This operation allows admin users to search, filter, and paginate audit logs
 * recorded in the community_platform_audit_logs table. Filters can be applied
 * by event type, actor user, date range, event detail, and IP address. Results
 * are paginated and sortable by creation time or event type. Accessible only to
 * authenticated admin users via AdminuserPayload context.
 *
 * @param props - The request object containing:
 *
 *   - AdminUser: The authenticated admin user (role context, validated by
 *       decorator)
 *   - Body: The search, filter, sort, and pagination options for audit logs
 *
 * @returns Paginated search result of audit log entries matching the query
 * @throws {Error} If any database error occurs
 */
export async function patch__communityPlatform_adminUser_auditLogs(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformAuditLog.IRequest;
}): Promise<IPageICommunityPlatformAuditLog> {
  const { body } = props;

  // Defaults for pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Ensure allowed sort field and direction
  const sortField = body.sort_by === "event_type" ? "event_type" : "created_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // Date range normalization
  let dateFromIso: (string & tags.Format<"date-time">) | undefined;
  let dateToIso: (string & tags.Format<"date-time">) | undefined;
  if (body.date_from) {
    dateFromIso = toISOStringSafe(new Date(body.date_from + "T00:00:00.000Z"));
  }
  if (body.date_to) {
    dateToIso = toISOStringSafe(new Date(body.date_to + "T23:59:59.999Z"));
  }

  // Where clause - only populated with real schema fields
  const where = {
    ...(body.event_type_query ? { event_type: body.event_type_query } : {}),
    ...(body.actor_memberuser_id
      ? { actor_memberuser_id: body.actor_memberuser_id }
      : {}),
    ...(body.actor_adminuser_id
      ? { actor_adminuser_id: body.actor_adminuser_id }
      : {}),
    ...(body.event_detail_query
      ? { event_detail: { contains: body.event_detail_query } }
      : {}),
    ...(body.ip_address_query
      ? { ip_address: { contains: body.ip_address_query } }
      : {}),
    ...(dateFromIso || dateToIso
      ? {
          created_at: {
            ...(dateFromIso ? { gte: dateFromIso } : {}),
            ...(dateToIso ? { lte: dateToIso } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_audit_logs.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_audit_logs.count({ where }),
  ]);

  // Map database rows to API structure
  const data = rows.map((row) => ({
    id: row.id,
    actor_memberuser_id: row.actor_memberuser_id ?? undefined,
    actor_adminuser_id: row.actor_adminuser_id ?? undefined,
    event_type: row.event_type,
    event_detail: row.event_detail,
    ip_address: row.ip_address ?? undefined,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
