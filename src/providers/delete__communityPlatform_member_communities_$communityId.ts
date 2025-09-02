import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Soft delete (logical delete) a sub-community by setting deleted_at timestamp.
 *
 * This operation soft deletes a specific sub-community by setting its
 * deleted_at timestamp in the {
 *
 * @param props - Request properties.
 * @param props.member - The authenticated member performing the operation (must
 *   match community owner).
 * @param props.communityId - Unique ID of the community to soft delete.
 * @returns Void
 * @throws {Error} When the community does not exist, is already deleted, or
 *   user is not the owner.
 * @link community_platform_communities } table. This soft deletion process preserves the record for audit purposes, preventing permanent loss and allowing potential restoration if required by business policy. All associated posts, comments, memberships, and related entities are handled according to cascade soft-delete logic. Only the community owner (creator) may perform this operation from this endpoint. The endpoint enforces referential integrity and ensures all cross-entity relationships are marked as deleted appropriately. The operation is fully audited for both data integrity and administrative monitoring, in accordance with the soft-delete pattern supported by the Prisma schema.
 */
export async function delete__communityPlatform_member_communities_$communityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, communityId } = props;
  // 1. Fetch the community: must exist and not already soft deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: communityId,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new Error("Community not found or already deleted");
  }
  // 2. Authorization: only the owner may delete
  if (community.owner_id !== member.id) {
    throw new Error(
      "Only the community owner can perform deletion from this endpoint",
    );
  }
  // 3. Set deleted_at timestamp (soft delete)
  await MyGlobal.prisma.community_platform_communities.update({
    where: { id: communityId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
