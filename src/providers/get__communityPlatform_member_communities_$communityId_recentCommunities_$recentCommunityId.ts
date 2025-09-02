import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve detailed information on a recent community for
 * context/community/member auditing or display.
 *
 * Get detail on a specific recent community row for a member, for a given
 * community context. The endpoint returns current state and recency information
 * for that recent community entity. Used by user-profile activity displays,
 * audit views, and membership navigation UIs. Only authenticated users may
 * access, and results may be permission-filtered for privacy or moderation
 * needs. If the entry does not exist or permissions are violated, an
 * appropriate error is returned. This endpoint does not allow editing or
 * deletion; used only for state inspection or activity logging.
 *
 * @param props - Request properties
 * @param props.member - Authenticated member (only the owner may access their
 *   own recent mapping)
 * @param props.communityId - Community context for the recent entry
 * @param props.recentCommunityId - Unique recent community mapping entity ID to
 *   retrieve
 * @returns ICommunityPlatformRecentCommunity with details of the entry
 * @throws {Error} If the entry does not exist
 * @throws {Error} If the authenticated user does not own the entry
 */
export async function get__communityPlatform_member_communities_$communityId_recentCommunities_$recentCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  recentCommunityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformRecentCommunity> {
  const { member, communityId, recentCommunityId } = props;

  const recent =
    await MyGlobal.prisma.community_platform_recent_communities.findFirst({
      where: {
        id: recentCommunityId,
        community_id: communityId,
      },
    });
  if (!recent) {
    throw new Error("Recent community entry not found");
  }

  if (recent.member_id !== member.id) {
    throw new Error(
      "Forbidden: You may only access your own recent community entries",
    );
  }

  return {
    id: recent.id,
    member_id: recent.member_id,
    community_id: recent.community_id,
    touched_at: toISOStringSafe(recent.touched_at),
  };
}
