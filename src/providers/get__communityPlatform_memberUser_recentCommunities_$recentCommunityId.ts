import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Retrieves a specific recent community navigation entry for a member user.
 *
 * This operation fetches a single row from the
 * community_platform_recent_communities table by its primary key, ensuring it
 * belongs to the authenticated member user. Access is restricted to only those
 * records owned by the user, enforcing platform privacy.
 *
 * @param props - Operation parameters
 * @param props.memberUser - The authenticated member user (JWT payload)
 * @param props.recentCommunityId - The UUID of the recent community entry to
 *   retrieve
 * @returns The detailed recent community object with id, memberuser_id,
 *   community_id, recent_rank, last_activity_at
 * @throws {Error} If no such record exists or if the entry does not belong to
 *   the authenticated user
 */
export async function get__communityPlatform_memberUser_recentCommunities_$recentCommunityId(props: {
  memberUser: MemberuserPayload;
  recentCommunityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformRecentCommunity> {
  const { memberUser, recentCommunityId } = props;

  // Fetch the recent community record by ID
  const record =
    await MyGlobal.prisma.community_platform_recent_communities.findFirst({
      where: { id: recentCommunityId },
      select: {
        id: true,
        memberuser_id: true,
        community_id: true,
        recent_rank: true,
        last_activity_at: true,
      },
    });
  if (!record) throw new Error("Recent community not found");
  if (record.memberuser_id !== memberUser.id) {
    throw new Error("Forbidden: Not your record");
  }

  return {
    id: record.id,
    memberuser_id: record.memberuser_id,
    community_id: record.community_id,
    recent_rank: record.recent_rank,
    last_activity_at: toISOStringSafe(record.last_activity_at),
  };
}
