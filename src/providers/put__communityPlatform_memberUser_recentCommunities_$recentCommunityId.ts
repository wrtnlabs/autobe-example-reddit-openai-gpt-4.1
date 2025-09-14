import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Update a recent community navigation entry
 * (community_platform_recent_communities table).
 *
 * Updates an existing recent community navigation record owned by the
 * authenticated member user. Allows modification of recency rank and activity
 * timestamp to drive UI personalization and navigation order. Only the owner of
 * the record may perform this operation. Attempting to update another user's
 * entry will throw an error.
 *
 * @param props - Operation properties
 * @param props.memberUser - The authenticated member user's payload
 * @param props.recentCommunityId - ID of the recent community entry to update
 * @param props.body - Update payload (may provide recent_rank and/or
 *   last_activity_at)
 * @returns The updated recent community navigation record
 * @throws {Error} If the record does not exist or ownership validation fails
 */
export async function put__communityPlatform_memberUser_recentCommunities_$recentCommunityId(props: {
  memberUser: MemberuserPayload;
  recentCommunityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformRecentCommunity.IUpdate;
}): Promise<ICommunityPlatformRecentCommunity> {
  const { memberUser, recentCommunityId, body } = props;

  // 1. Fetch record and verify ownership
  const target =
    await MyGlobal.prisma.community_platform_recent_communities.findUnique({
      where: { id: recentCommunityId },
      select: {
        id: true,
        memberuser_id: true,
        community_id: true,
        recent_rank: true,
        last_activity_at: true,
      },
    });
  if (!target || target.memberuser_id !== memberUser.id) {
    throw new Error(
      "Unauthorized: You can only update your own recent community record.",
    );
  }

  // 2. Prepare update fields
  const updateData: {
    recent_rank?: number;
    last_activity_at?: string & tags.Format<"date-time">;
  } = {};
  if (body.recent_rank !== undefined) updateData.recent_rank = body.recent_rank;
  if (body.last_activity_at !== undefined)
    updateData.last_activity_at = body.last_activity_at;

  // 3. Execute update
  const updated =
    await MyGlobal.prisma.community_platform_recent_communities.update({
      where: { id: recentCommunityId },
      data: updateData,
      select: {
        id: true,
        memberuser_id: true,
        community_id: true,
        recent_rank: true,
        last_activity_at: true,
      },
    });

  // 4. Return API response object with correct types/formatting
  return {
    id: updated.id,
    memberuser_id: updated.memberuser_id,
    community_id: updated.community_id,
    recent_rank: updated.recent_rank,
    last_activity_at: toISOStringSafe(updated.last_activity_at),
  };
}
