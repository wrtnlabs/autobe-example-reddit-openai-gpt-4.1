import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Remove a single member from a community by deleting the membership record.
 *
 * This operation allows an authenticated user or a community administrator to
 * remove a member from a specific community by deleting the relevant membership
 * record from the community_platform_community_memberships table. Only the
 * member themselves or the owner of the community can perform this deletion.
 * Cascade is hard delete: only the membership record is removed.
 *
 * @param props - Request properties
 * @param props.member - Authenticated member performing the operation
 * @param props.communityId - UUID of the parent community
 * @param props.membershipId - UUID of the community membership to delete
 * @returns Void
 * @throws {Error} When membership does not exist or does not belong to the
 *   community
 * @throws {Error} When the community does not exist
 * @throws {Error} When the member is neither the targeted member nor the
 *   community owner
 */
export async function delete__communityPlatform_member_communities_$communityId_memberships_$membershipId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, communityId, membershipId } = props;
  // 1. Retrieve membership; ensure it exists and belongs to the specified community
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        id: membershipId,
        community_id: communityId,
      },
    });
  if (!membership) throw new Error("Membership not found");

  // 2. Retrieve community; ensure it exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: communityId },
    });
  if (!community) throw new Error("Community not found");

  // 3. Authorization: Only the removed member or the community owner can delete
  if (member.id !== membership.member_id && member.id !== community.owner_id) {
    throw new Error(
      "Forbidden: Only the targeted member or the community owner can remove this membership",
    );
  }

  // 4. Hard delete of the membership record
  await MyGlobal.prisma.community_platform_community_memberships.delete({
    where: { id: membershipId },
  });
  // No return needed as deletion indicates completion
}
