import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";
import { IPageICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a paginated list of admin/moderation actions with advanced filters.
 *
 * Returns a paginated, filterable list of all admin actions executed on the
 * platform for monitoring and compliance purposes. Filtering is available by
 * admin ID, target entity type/ID, action type, date range, and action result.
 * Results are paginated and sorted for dashboard or audit tool consumption.
 * This endpoint is critical for transparency and enables audits of all
 * moderation/admin activity.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.body - Admin action search and pagination/filter parameters
 * @returns Paginated list of admin action records matching filters and
 *   pagination.
 * @throws {Error} When access is attempted without proper admin authentication
 */
export async function patch__communityPlatform_admin_adminActions(props: {
  admin: AdminPayload;
  body: ICommunityPlatformAdminAction.IRequest;
}): Promise<IPageICommunityPlatformAdminAction> {
  const { admin, body } = props;
  // Authorization: validated via admin parameter, no member exposure

  // Only allow sorting by known allowed fields to avoid injection
  const allowedSortFields = [
    "created_at",
    "id",
    "admin_id",
    "action_type",
    "target_entity",
    "target_entity_id",
    "reason",
    "result",
  ];
  const sortField = allowedSortFields.includes(body.sort_by || "")
    ? body.sort_by!
    : "created_at";
  const sortDir = body.sort_dir === "asc" ? "asc" : "desc";

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Compose where condition
  const where = {
    ...(body.admin_id !== undefined &&
      body.admin_id !== null && { admin_id: body.admin_id }),
    ...(body.action_type !== undefined &&
      body.action_type !== null && { action_type: body.action_type }),
    ...(body.target_entity !== undefined &&
      body.target_entity !== null && { target_entity: body.target_entity }),
    ...(body.target_entity_id !== undefined &&
      body.target_entity_id !== null && {
        target_entity_id: body.target_entity_id,
      }),
    ...(body.reason !== undefined &&
      body.reason !== null && { reason: body.reason }),
    ...(body.result !== undefined &&
      body.result !== null && { result: body.result }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Fetch results and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_admin_actions.findMany({
      where,
      orderBy: {
        [sortField]: sortDir,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_admin_actions.count({ where }),
  ]);

  // Format rows to DTO
  const data = rows.map((row) => ({
    id: row.id as string & tags.Format<"uuid">,
    admin_id: row.admin_id as string & tags.Format<"uuid">,
    action_type: row.action_type,
    target_entity: row.target_entity,
    target_entity_id: row.target_entity_id as string & tags.Format<"uuid">,
    reason: row.reason ?? null,
    result: row.result,
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
