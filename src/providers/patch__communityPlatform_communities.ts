import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Search and paginate sub-communities (community_platform_communities)
 *
 * Retrieves a paginated, filterable list of sub-communities based on complex
 * business, validation, and classification rules. Only active (non-deleted)
 * communities are returned. Filters by name, category, and owner are supported,
 * as well as standard pagination and sorting.
 *
 * @param props - Properties for the search and pagination operation
 * @param props.body - Request body specifying filter and pagination parameters
 * @returns Paged list of community summaries with pagination info for
 *   exploration/grids
 * @throws {Error} If invalid parameters are provided or database fails
 */
export async function patch__communityPlatform_communities(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Determine order by logic per sort_by parameter (define inline for Prisma type inference)
  const sortBy = body.sort_by ?? "newest";
  // Always fallback to created_at desc because schema does not have a 'score' or engagement metric
  // Also, inline the orderBy object and ensure it uses a literal type ("desc" as const)

  // Construct where filters only using schema-verified fields
  const where = {
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null && {
        name: {
          contains: body.name,
        },
      }),
    ...(body.category_id !== undefined &&
      body.category_id !== null && {
        category_id: body.category_id,
      }),
    ...(body.owner_id !== undefined &&
      body.owner_id !== null && {
        owner_id: body.owner_id,
      }),
  };

  // Query data and total count in parallel
  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_communities.findMany({
      where,
      orderBy: { created_at: "desc" as const },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        banner_uri: true,
      },
    }),
    MyGlobal.prisma.community_platform_communities.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      logo_uri: r.logo_uri ?? undefined,
      banner_uri: r.banner_uri ?? undefined,
    })),
  };
}
