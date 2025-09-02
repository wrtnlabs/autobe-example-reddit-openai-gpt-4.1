import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformRecentCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformRecentCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Add a community to the authenticated member's recent communities list.
 *
 * This operation adds or updates an entry in the member's list of recent
 * communities, enhancing navigation and personalization features. If an entry
 * for the member and the target community exists, only the timestamp is
 * updated; otherwise, a new entry is created. Only authenticated members can
 * add or update their recent communities list. This does not impact memberships
 * or moderation—solely for UI convenience.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member performing the action
 * @param props.communityId - The UUID of the community to be added to the
 *   recent list (must match body.community_id)
 * @param props.body - The request body, containing the community_id
 * @returns The (created or updated) recent community mapping record, aligned
 *   with ICommunityPlatformRecentCommunity type.
 * @throws {Error} If body.community_id does not match the path communityId
 */
export async function post__communityPlatform_member_communities_$communityId_recentCommunities(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformRecentCommunity.ICreate;
}): Promise<ICommunityPlatformRecentCommunity> {
  const { member, communityId, body } = props;
  // Validate that path and body match for safety
  if (body.community_id !== communityId) {
    throw new Error("communityId in path and body.community_id must match");
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const found =
    await MyGlobal.prisma.community_platform_recent_communities.findFirst({
      where: {
        member_id: member.id,
        community_id: communityId,
      },
    });

  if (found) {
    const updated =
      await MyGlobal.prisma.community_platform_recent_communities.update({
        where: { id: found.id },
        data: { touched_at: now },
      });
    return {
      id: updated.id,
      member_id: updated.member_id,
      community_id: updated.community_id,
      touched_at: now,
    };
  } else {
    const created =
      await MyGlobal.prisma.community_platform_recent_communities.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          member_id: member.id,
          community_id: communityId,
          touched_at: now,
        },
      });
    return {
      id: created.id,
      member_id: created.member_id,
      community_id: created.community_id,
      touched_at: now,
    };
  }
}
