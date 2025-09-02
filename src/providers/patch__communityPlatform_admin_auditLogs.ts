import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated search of moderation and admin audit logs for compliance review.
 *
 * Returns a paginated, filterable list of all audit logs covering moderation,
 * admin, and business-sensitive events. Filtering parameters and pagination
 * enable incident review for compliance, business reporting, and regulatory
 * audits. Each entry links to both admin and member where relevant, as well as
 * impacted entities. Used by forensic and compliance staff to examine the full
 * trace of platform actions.
 *
 * @param props - The request object
 * @param props.admin - The authenticated admin user making the request
 * @param props.body - Filter and pagination criteria for searching
 *   moderation/admin audit logs
 * @returns The paginated audit log records matching search/filter criteria
 * @throws {Error} When invoked by a non-admin or deleted/inactive admin user
 */
export async function patch__communityPlatform_admin_auditLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformAuditLog.IRequest;
}): Promise<IPageICommunityPlatformAuditLog> {
  const { admin, body } = props;

  // Enforce admin verification
  const adminRecord = await MyGlobal.prisma.community_platform_admins.findFirst(
    {
      where: {
        id: admin.id,
        is_active: true,
        deleted_at: null,
      },
    },
  );
  if (adminRecord === null) {
    throw new Error("Unauthorized: Admin record not found or inactive");
  }

  // Pagination defaults/clamping
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 && body.limit <= 100
      ? body.limit
      : 20;
  const skip = (page - 1) * limit;

  // Filter construction
  const where = {
    ...(body.event_type !== undefined && { event_type: body.event_type }),
    ...(body.entity_type !== undefined && { entity_type: body.entity_type }),
    ...(body.entity_id !== undefined && { entity_id: body.entity_id }),
    ...(body.result !== undefined && { result: body.result }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
  };

  // Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_audit_logs.count({ where }),
  ]);

  // Data transformation to DTO
  const data: ICommunityPlatformAuditLog[] = rows.map((row) => ({
    id: row.id,
    admin_id: row.admin_id ?? null,
    member_id: row.member_id ?? null,
    event_type: row.event_type,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    metadata_json: row.metadata_json ?? null,
    result: row.result,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Pagination object
  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  // Final result
  return {
    pagination,
    data,
  };
}
