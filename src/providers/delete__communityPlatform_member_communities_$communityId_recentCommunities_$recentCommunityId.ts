import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Remove a community from a member's list of recent communities.
 *
 * Permanently deletes (hard delete) the mapping between the member and the
 * community from the community_platform_recent_communities table. This affects
 * only the quick-navigate sidebar/UI, not actual membership or any content.
 * Authorization ensures only the owner may delete their mapping.
 *
 * @param props - Request details
 * @param props.member - The authenticated member performing the deletion
 * @param props.communityId - The UUID of the referenced community (for path,
 *   not used in logic)
 * @param props.recentCommunityId - The UUID of the recent community mapping
 *   record to remove
 * @returns Void
 * @throws {Error} If the mapping does not exist
 * @throws {Error} If the authenticated member is not the owner of this mapping
 *   (forbidden)
 */
export async function delete__communityPlatform_member_communities_$communityId_recentCommunities_$recentCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  recentCommunityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, recentCommunityId } = props;

  const mapping =
    await MyGlobal.prisma.community_platform_recent_communities.findUnique({
      where: { id: recentCommunityId },
    });
  if (!mapping) {
    throw new Error("Recent community mapping not found");
  }
  if (mapping.member_id !== member.id) {
    throw new Error("Forbidden: You do not own this recent community mapping");
  }
  await MyGlobal.prisma.community_platform_recent_communities.delete({
    where: { id: recentCommunityId },
  });
}
