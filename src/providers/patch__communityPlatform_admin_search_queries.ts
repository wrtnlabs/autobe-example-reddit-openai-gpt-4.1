import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchQuery";
import { IPageICommunityPlatformSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchQuery";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated/filterable list of search query logs (admin
 * only).
 *
 * Retrieve a paginated, filterable list of search query logs from
 * community_platform_search_queries table. Supports filtering by performed_at,
 * query_text, member_id, admin_id, search_type, context, and ip, plus sorting
 * and pagination. Accessible to admin only.
 *
 * @param props - Request properties
 * @param props.admin - The acting admin user
 * @param props.body - Filtering, sorting and pagination options
 * @returns Paginated list of search query log summaries
 * @throws {Error} If admin authentication fails (enforced upstream)
 */
export async function patch__communityPlatform_admin_search_queries(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSearchQuery.IRequest;
}): Promise<IPageICommunityPlatformSearchQuery.ISummary> {
  const { body } = props;
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 100);

  // Build Prisma where condition with only existing fields
  const where = {
    deleted_at: null,
    ...(body.query_text !== undefined &&
      body.query_text !== null && {
        query_text: { contains: body.query_text, mode: "insensitive" as const },
      }),
    ...(body.search_type !== undefined &&
      body.search_type !== null && {
        search_type: body.search_type,
      }),
    ...(body.member_id !== undefined &&
      body.member_id !== null && {
        member_id: body.member_id,
      }),
    ...(body.admin_id !== undefined &&
      body.admin_id !== null && {
        admin_id: body.admin_id,
      }),
    // Date range: if both are set, merge into one object; if only one, set only gte/lte
    ...((body.performed_at_start !== undefined &&
      body.performed_at_start !== null) ||
    (body.performed_at_end !== undefined && body.performed_at_end !== null)
      ? {
          performed_at: {
            ...(body.performed_at_start !== undefined &&
              body.performed_at_start !== null && {
                gte: body.performed_at_start,
              }),
            ...(body.performed_at_end !== undefined &&
              body.performed_at_end !== null && {
                lte: body.performed_at_end,
              }),
          },
        }
      : {}),
    ...(body.context !== undefined &&
      body.context !== null && {
        context: body.context,
      }),
    ...(body.ip !== undefined &&
      body.ip !== null && {
        ip: body.ip,
      }),
  };

  // Map of allowed fields to sort by
  const allowedSortFields = ["performed_at", "query_text"] as const;
  const sortBy = allowedSortFields.includes(
    (body.sort_by ?? "") as (typeof allowedSortFields)[number],
  )
    ? (body.sort_by as (typeof allowedSortFields)[number])
    : "performed_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // Query rows and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_search_queries.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_search_queries.count({ where }),
  ]);

  // Map results to ISummary, brand all date/datetime fields
  const data = rows.map((row) => ({
    id: row.id,
    member_id: row.member_id ?? null,
    admin_id: row.admin_id ?? null,
    query_text: row.query_text,
    search_type: row.search_type,
    performed_at: toISOStringSafe(row.performed_at),
    context: row.context ?? null,
    ip: row.ip ?? null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
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
