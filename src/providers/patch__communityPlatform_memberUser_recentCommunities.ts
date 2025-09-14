import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";
import { IPageICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformRecentCommunity";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Retrieve recent community navigation list for current member
 * (community_platform_recent_communities table).
 *
 * This endpoint returns a paginated list of recent communities visited or
 * interacted with by the authenticated member user. It strictly returns only
 * the current member's own recent navigation list, supporting pagination and
 * sorting (by recent_rank ASC or last_activity_at DESC). Core fields: id,
 * memberuser_id, community_id, recent_rank, last_activity_at. All dates are ISO
 * strings (no Date).
 *
 * @param props - Object containing memberUser authentication and optional
 *   request body
 * @param props.memberUser - The authenticated member user's JWT payload
 * @param props.body - Pagination/sort parameters (all optional)
 * @returns Paginated recent community navigation entries scoped to the
 *   authenticated memberUser
 * @throws {Error} If authentication is invalid or the user attempts to access
 *   another user's data
 */
export async function patch__communityPlatform_memberUser_recentCommunities(props: {
  memberUser: MemberuserPayload;
  body: ICommunityPlatformRecentCommunity.IRequest;
}): Promise<IPageICommunityPlatformRecentCommunity> {
  const { memberUser, body } = props;
  // Defaults: page 1, limit 5 (per spec, max 5 records shown)
  const page =
    body.page !== undefined && body.page !== null ? Number(body.page) : 1;
  const limit =
    body.limit !== undefined && body.limit !== null ? Number(body.limit) : 5;
  // sort: supported values 'recent_rank', 'last_activity_at', else default to recent_rank
  const sort = body.sort;

  // Determine sort order
  const orderBy =
    sort === "last_activity_at"
      ? [{ last_activity_at: "desc" as const }]
      : [{ recent_rank: "asc" as const }];
  const skip = (page - 1) * limit;

  // Count total records for this user
  const total =
    await MyGlobal.prisma.community_platform_recent_communities.count({
      where: { memberuser_id: memberUser.id },
    });

  // Query records with pagination and sort
  const rows =
    await MyGlobal.prisma.community_platform_recent_communities.findMany({
      where: { memberuser_id: memberUser.id },
      orderBy,
      skip,
      take: limit,
    });

  // Map DB rows to strictly-branded API DTO, with ISO date strings
  const data = rows.map(
    (row): ICommunityPlatformRecentCommunity => ({
      id: row.id as string & tags.Format<"uuid">,
      memberuser_id: row.memberuser_id as string & tags.Format<"uuid">,
      community_id: row.community_id as string & tags.Format<"uuid">,
      recent_rank: row.recent_rank as number & tags.Type<"int32">,
      last_activity_at: toISOStringSafe(row.last_activity_at),
    }),
  );

  // Build pagination info (numbers are re-cast to comply with tagging/branding)
  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: Number(total) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(Number(total) / Number(limit)) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
