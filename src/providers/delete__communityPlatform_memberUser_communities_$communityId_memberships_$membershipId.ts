import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Remove a user from a community (leave) by deleting their membership.
 *
 * Deletes a membership record in a specific community, referenced by
 * communityId and membershipId. Only the membership's owner (the user
 * themselves) is permitted to perform this operation. The corresponding record
 * in community_platform_community_memberships is permanently removed. On
 * success, the membership is deleted; if not found or unauthorized, appropriate
 * errors are thrown.
 *
 * @param props - Request properties
 * @param props.memberUser - The authenticated member user making the request
 * @param props.communityId - The ID of the community from which to remove the
 *   user
 * @param props.membershipId - The unique identifier for the membership to
 *   delete
 * @returns Void
 * @throws {Error} When membership is not found or the user is not the
 *   membership owner
 */
export async function delete__communityPlatform_memberUser_communities_$communityId_memberships_$membershipId(props: {
  memberUser: MemberuserPayload;
  communityId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { memberUser, communityId, membershipId } = props;

  // Fetch the membership and validate ownership
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        id: membershipId,
        community_id: communityId,
      },
    });
  if (!membership) {
    throw new Error("Membership not found");
  }
  if (membership.memberuser_id !== memberUser.id) {
    throw new Error(
      "Unauthorized: Only the membership owner can remove their membership",
    );
  }
  // Hard-delete the membership
  await MyGlobal.prisma.community_platform_community_memberships.delete({
    where: { id: membershipId },
  });
}
