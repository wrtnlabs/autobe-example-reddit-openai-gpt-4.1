import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * List all rules for a given community (paginated, for curation)
 *
 * Retrieves a paginated, filterable list of rule entries for a specified
 * community, intended for owner/admin curation and editing. Only the community
 * owner may access this endpoint. Supports filtering by rule_index, substring
 * search on rule_line (case-insensitive), pagination, and ordering by
 * rule_index. The total rule count is capped at 10 per community for business
 * reasons. Enforces strict ownership verification and returns pagination
 * metadata with all rule data.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member making the request (must be
 *   the community owner)
 * @param props.communityId - UUID of the community whose rules are to be listed
 * @param props.body - Filtering and pagination payload (rule_index for
 *   filtering, query for substring search, page, and limit)
 * @returns Paginated set of all rule entries for the specified community, with
 *   pagination metadata and rule data
 * @throws {Error} When the community does not exist or the member is not the
 *   owner
 */
export async function patch__communityPlatform_member_communities_$communityId_rules(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.IRequest;
}): Promise<IPageICommunityPlatformCommunityRule> {
  const { member, communityId, body } = props;

  // 1. Strict ownership check: Only the community owner may use this endpoint
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
      select: { owner_id: true },
    });
  if (!community || community.owner_id !== member.id) {
    throw new Error(
      "Forbidden: Only the community owner may list or curate rules using this endpoint",
    );
  }

  // 2. Pagination/control defaults (limit is capped at 10)
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? Math.min(body.limit, 10) : 10;
  const skip = (page - 1) * limit;

  // 3. Build filter (where clause)
  // Includes: community_id (required), optional rule_index, optional case-insensitive substring filter on rule_line
  // Only define fields that are present/non-null
  const where = {
    community_id: communityId,
    ...(body.rule_index !== undefined &&
      body.rule_index !== null && { rule_index: body.rule_index }),
    ...(body.query && {
      rule_line: { contains: body.query, mode: "insensitive" as const },
    }),
  };

  // 4. Only allow sorting by rule_index (no created_at field in schema)
  const orderBy = [{ rule_index: "asc" as const }];

  // 5. Fetch count (for pagination) and paginated results in parallel
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.community_platform_community_rules.count({ where }),
    MyGlobal.prisma.community_platform_community_rules.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  // 6. Map each DB row to API DTO structure, no type assertions/Date usage needed
  const data = rows.map((row) => ({
    id: row.id,
    community_id: row.community_id,
    rule_index: row.rule_index,
    rule_line: row.rule_line,
  }));

  // 7. Construct and return paginated result with proper pagination meta
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
