import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSearchLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchLog";
import { IPageICommunityPlatformSearchLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchLog";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Paginated search and analytics logs (community_platform_search_logs)
 *
 * Lists search analytics logs from the community_platform_search_logs table,
 * supporting advanced filtering (search_query substring, scope, member/admin,
 * date range) and pagination. Supports sorting (created_at desc/asc) per
 * compliance/audit business rules. Limited to admin users only. All date fields
 * returned as string & tags.Format<'date-time'>. Pagination strictly follows
 * IPage.IPagination.
 *
 * @param props - AdminUser: authenticated AdminuserPayload (must be present in
 *   DB) body: filters for listing logs (ICommunityPlatformSearchLog.IRequest)
 * @returns List of community search logs with pagination, matching supplied
 *   filters and sorting
 * @throws {Error} If database error or Prisma constraint occurs
 */
export async function patch__communityPlatform_adminUser_searchLogs(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformSearchLog.IRequest;
}): Promise<IPageICommunityPlatformSearchLog> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Build where filter for Prisma
  const where = {
    deleted_at: null,
    ...(body.search_query !== undefined &&
      body.search_query !== null &&
      body.search_query.length >= 2 && {
        search_query: { contains: body.search_query },
      }),
    ...(body.member_user_id !== undefined &&
      body.member_user_id !== null && {
        member_user_id: body.member_user_id,
      }),
    ...(body.admin_user_id !== undefined &&
      body.admin_user_id !== null && {
        admin_user_id: body.admin_user_id,
      }),
    ...(body.target_scope !== undefined &&
      body.target_scope !== null && {
        target_scope: body.target_scope,
      }),
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

  // Sort logic: use "as const" to narrow type for Prisma
  const orderBy =
    body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };

  // Always pass skip/take inline
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_search_logs.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.community_platform_search_logs.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    member_user_id: row.member_user_id ?? undefined,
    admin_user_id: row.admin_user_id ?? undefined,
    search_query: row.search_query,
    target_scope: row.target_scope,
    ip_address: row.ip_address,
    user_agent: row.user_agent ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / Number(limit)),
  };

  return {
    pagination,
    data,
  };
}
