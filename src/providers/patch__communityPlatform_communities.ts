import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Paginated search and discovery for communities with filtering and sort
 * options.
 *
 * Search and return a paginated list of communities with advanced filtering and
 * sorting. Includes options to filter by category, owner, partial name match,
 * or display title. Results provide summary information for each community
 * along with basic category data and status. Pagination and sort by activity or
 * creation time are supported. Does not return communities flagged as deleted
 * (unless admin override for auditing). Available to all users for discovery,
 * but response includes additional admin details when accessed by
 * administrators. This endpoint is optimized for search/explore and top-level
 * listings.
 *
 * @param props - Request properties
 * @param props.body - Search and filter options for community listings.
 *   Includes pagination, sorting, search string, and category/owner filters.
 * @returns Paginated list of community summaries matching search parameters for
 *   use in listings/search/explore screens.
 * @throws {Error} Throws for unexpected database errors or when unable to fetch
 *   communities.
 */
export async function patch__communityPlatform_communities(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const { body } = props;
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Validate and apply sort keys
  const allowedSorts = [
    "created_at",
    "updated_at",
    "name",
    "display_title",
  ] as const;
  const sortBy =
    allowedSorts.includes(body.sortBy as (typeof allowedSorts)[number]) &&
    body.sortBy
      ? body.sortBy
      : "created_at";
  const direction =
    body.direction === "asc" || body.direction === "desc"
      ? body.direction
      : "desc";

  // Build where clause dynamically
  const where = {
    deleted_at: null,
    ...(body.category_id && { category_id: body.category_id }),
    ...(body.owner_id && { owner_id: body.owner_id }),
    ...(body.name && {
      name: { contains: body.name, mode: "insensitive" as const },
    }),
    ...(body.display_title && {
      display_title: {
        contains: body.display_title,
        mode: "insensitive" as const,
      },
    }),
    ...(body.description && {
      description: { contains: body.description, mode: "insensitive" as const },
    }),
    ...(body.search && {
      OR: [
        { name: { contains: body.search, mode: "insensitive" as const } },
        {
          display_title: {
            contains: body.search,
            mode: "insensitive" as const,
          },
        },
        {
          description: { contains: body.search, mode: "insensitive" as const },
        },
      ],
    }),
  };

  // Fetch data & count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_communities.findMany({
      where,
      orderBy: { [sortBy]: direction },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_communities.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      display_title: row.display_title ?? undefined,
      category_id: row.category_id,
      owner_id: row.owner_id,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
