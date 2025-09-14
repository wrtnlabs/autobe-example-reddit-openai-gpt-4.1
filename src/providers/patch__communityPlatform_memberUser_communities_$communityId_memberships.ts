import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Search and list memberships in a specific community
 *
 * Retrieves a paginated, filtered list of all membership records for a given
 * community (by ID). Includes support for searching, filtering by member user,
 * joined_at, and controlling pagination. Only accessible by authenticated
 * member users who are either the community owner or an active member.
 *
 * @param props - Properties for this operation
 * @param props.memberUser - The authenticated member user making the request
 * @param props.communityId - UUID of the community
 * @param props.body - Search and paging filter options (see IRequest)
 * @returns Paginated list of summary records for community memberships
 * @throws {Error} If the community does not exist or requester is not a
 *   member/owner
 */
export async function patch__communityPlatform_memberUser_communities_$communityId_memberships(props: {
  memberUser: MemberuserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityMembership.IRequest;
}): Promise<IPageICommunityPlatformCommunityMembership.ISummary> {
  const { memberUser, communityId, body } = props;

  // 1. Authorization: Only members or owners can access
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
      select: { id: true, owner_id: true },
    });
  if (!community) throw new Error("Community not found");

  let isMember = false;
  if (community.owner_id === memberUser.id) {
    isMember = true;
  } else {
    const membership =
      await MyGlobal.prisma.community_platform_community_memberships.findFirst({
        where: { community_id: communityId, memberuser_id: memberUser.id },
        select: { id: true },
      });
    isMember = !!membership;
  }
  if (!isMember)
    throw new Error("Forbidden: not a member or owner of this community");

  // 2. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Build joined_at condition
  let joinedAtCondition:
    | {
        gte?: string & tags.Format<"date-time">;
        lte?: string & tags.Format<"date-time">;
      }
    | undefined;
  if (
    (body.joined_at_from !== undefined && body.joined_at_from !== null) ||
    (body.joined_at_to !== undefined && body.joined_at_to !== null)
  ) {
    joinedAtCondition = {};
    if (body.joined_at_from !== undefined && body.joined_at_from !== null)
      joinedAtCondition.gte = body.joined_at_from;
    if (body.joined_at_to !== undefined && body.joined_at_to !== null)
      joinedAtCondition.lte = body.joined_at_to;
  }

  // 4. Build where clause (direct, never as variable for prisma)
  const where = {
    community_id: communityId,
    ...(body.memberuser_id !== undefined &&
      body.memberuser_id !== null && { memberuser_id: body.memberuser_id }),
    ...(joinedAtCondition && { joined_at: joinedAtCondition }),
  };

  // 5. Query memberships and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_memberships.findMany({
      where,
      orderBy: { joined_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_community_memberships.count({ where }),
  ]);

  // 6. Format and return result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit === 0 ? 1 : limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      community_id: row.community_id,
      memberuser_id: row.memberuser_id,
      joined_at: toISOStringSafe(row.joined_at),
    })),
  };
}
