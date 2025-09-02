import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";
import { IPageICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformRecentCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * List recent communities touched by a member for sidebar/recent view display.
 *
 * Retrieves a paginated, filterable list of recent communities the current
 * authenticated member has interacted with, for use in sidebar/recent UI
 * components. Filters, sorts, and paginates by recency (`touched_at`), with
 * optional filtering on date range and member display name. Only allows access
 * to the current user's own recent communities; never leaks other members'
 * data.
 *
 * @param props - Request properties
 * @param props.member - Authenticated member payload (user making the request)
 * @param props.communityId - Context community ID for sidebar context (not a
 *   filter)
 * @param props.body - Request body containing pagination, sorting, and filter
 *   information
 * @returns Paginated summary of recent communities the member has interacted
 *   with
 * @throws {Error} If the member_display_name filter does not match the current
 *   user's display name
 */
export async function patch__communityPlatform_member_communities_$communityId_recentCommunities(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformRecentCommunity.IRequest;
}): Promise<IPageICommunityPlatformRecentCommunity.ISummary> {
  const { member, body } = props;
  // Defensive: Only allow access to own recent communities
  // Handle member_display_name filter (if present, must match self)
  if (
    body.member_display_name !== undefined &&
    body.member_display_name !== null
  ) {
    const memberRecord =
      await MyGlobal.prisma.community_platform_members.findUnique({
        where: { id: member.id },
        select: { display_name: true },
      });
    if (
      !memberRecord ||
      memberRecord.display_name !== body.member_display_name
    ) {
      // Return canonical empty result
      return {
        pagination: {
          current: 1,
          limit: 5,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
  }

  // Defaults for pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 5;

  // Build where clause (safe chaining)
  const touchedAtCondition = (() => {
    if (
      body.touched_after !== undefined &&
      body.touched_after !== null &&
      body.touched_before !== undefined &&
      body.touched_before !== null
    ) {
      return {
        gte: body.touched_after,
        lte: body.touched_before,
      };
    }
    if (body.touched_after !== undefined && body.touched_after !== null) {
      return { gte: body.touched_after };
    }
    if (body.touched_before !== undefined && body.touched_before !== null) {
      return { lte: body.touched_before };
    }
    return undefined;
  })();

  // Only list own recent communities
  const where = {
    member_id: member.id,
    ...(touchedAtCondition !== undefined && { touched_at: touchedAtCondition }),
  };

  // Determine sort (default: touched_at desc)
  let orderBy: { [key: string]: "asc" | "desc" } = { touched_at: "desc" };
  if (typeof body.sort === "string" && body.sort.trim()) {
    const parts = body.sort.trim().split(/\s+/);
    if (
      parts.length === 2 &&
      (parts[1] === "asc" || parts[1] === "desc") &&
      ["touched_at", "community_id", "member_id", "id"].includes(parts[0]) // only allow sort fields that exist
    ) {
      orderBy = { [parts[0]]: parts[1] as "asc" | "desc" };
    }
  }

  // Query data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_recent_communities.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.community_platform_recent_communities.count({ where }),
  ]);

  // Build response, converting date fields to string & tags.Format<'date-time'>
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      member_id: row.member_id,
      community_id: row.community_id,
      touched_at: toISOStringSafe(row.touched_at),
    })),
  };
}
