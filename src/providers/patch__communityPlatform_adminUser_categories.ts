import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Search and list community platform categories with filtering and pagination.
 *
 * Retrieves a filtered, paginated list of community platform categories from
 * the database, supporting substring search on name and description, sorting,
 * and paging options. Only adminUser-authenticated requests are allowed for
 * this endpoint. Response fields are derived directly from the schema for safe
 * UI rendering.
 *
 * - Available Filters: name (substring, case-insensitive), description
 *   (substring, case-insensitive)
 * - Pagination: page (min 1), limit (default 20)
 * - Sorting: sortBy ("display_order", "name", "created_at", or "updated_at"),
 *   sortDir ("asc", "desc")
 * - Dates are always returned as ISO8601 strings with correct branding
 *
 * @param props - Request object
 * @param props.adminUser - Authenticated admin user making the request
 * @param props.body - Search, filtering, sorting, and pagination controls
 *   ({@link ICommunityPlatformCategory.IRequest})
 * @returns Paginated list of category summaries
 *   ({@link IPageICommunityPlatformCategory.ISummary})
 */
export async function patch__communityPlatform_adminUser_categories(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformCategory.IRequest;
}): Promise<IPageICommunityPlatformCategory.ISummary> {
  const { body } = props;
  const allowedSortBy = ["display_order", "name", "created_at", "updated_at"];
  const sortBy =
    body.sortBy && allowedSortBy.includes(body.sortBy)
      ? body.sortBy
      : "display_order";
  const sortDir: "asc" | "desc" = body.sortDir === "desc" ? "desc" : "asc";
  const page =
    typeof body.page === "number" && body.page >= 1 ? Number(body.page) : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  // Inline where - conditions compactly and safely, for Prisma, only include when actually provided
  const where = {
    ...(body.name?.length ? { name: { contains: body.name } } : {}),
    ...(body.description?.length
      ? { description: { contains: body.description } }
      : {}),
  };

  // Query rows and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_categories.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_categories.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      display_order: row.display_order,
      description: row.description ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
