import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Update membership metadata for a specific member of a community.
 *
 * This endpoint updates select metadata for a specific community membership
 * record, referenced by communityId and membershipId. Only the membership owner
 * (memberUser.id) can invoke this operation. The only field that can be
 * modified is 'joined_at'. Attempts to change the community association,
 * membership ownership, or primary key are forbidden and will result in an
 * error. All updates are strictly audited by user association and business
 * rules.
 *
 * @param props - Object containing required parameters:
 *
 *   - MemberUser: Authenticated MemberuserPayload representing the caller, whose id
 *       must match the membership's memberuser_id
 *   - CommunityId: UUID of the community for which the membership exists
 *   - MembershipId: UUID of the membership to update
 *   - Body: Update payload for allowed fields (IUpdate; only joined_at is
 *       permitted)
 *
 * @returns The updated community membership entity with correct field types
 * @throws {Error} If the membership record is not found or caller is not the
 *   owner
 */
export async function put__communityPlatform_memberUser_communities_$communityId_memberships_$membershipId(props: {
  memberUser: MemberuserPayload;
  communityId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityMembership.IUpdate;
}): Promise<ICommunityPlatformCommunityMembership> {
  const { memberUser, communityId, membershipId, body } = props;
  // STEP 1: Fetch membership (must match both membershipId and communityId)
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        id: membershipId,
        community_id: communityId,
      },
    });
  if (!membership) {
    throw new Error("Membership not found in this community.");
  }
  // STEP 2: Authorize ownership
  if (membership.memberuser_id !== memberUser.id) {
    throw new Error(
      "Forbidden: You can only update your own community memberships.",
    );
  }
  // STEP 3: Prepare the update input (only joined_at is mutable)
  const nextJoinedAt =
    body.joined_at !== undefined && body.joined_at !== null
      ? toISOStringSafe(body.joined_at)
      : toISOStringSafe(membership.joined_at);
  // STEP 4: Update record
  const updated =
    await MyGlobal.prisma.community_platform_community_memberships.update({
      where: { id: membershipId },
      data: {
        joined_at: nextJoinedAt,
      },
    });
  // STEP 5: Return DTO-conformant response, convert joined_at to branded string & tags.Format<'date-time'>
  return {
    id: updated.id,
    community_id: updated.community_id,
    memberuser_id: updated.memberuser_id,
    joined_at: toISOStringSafe(updated.joined_at),
  };
}
