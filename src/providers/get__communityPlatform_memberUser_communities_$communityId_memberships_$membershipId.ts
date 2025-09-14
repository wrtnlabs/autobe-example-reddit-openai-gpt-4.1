import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Get detailed information for a specific community membership
 *
 * Retrieves a single community membership record by membershipId within the
 * specified communityId. Returns all details for that membership, including IDs
 * and join time. Only the member user themselves (the owner of the membership)
 * is allowed to access this detail. All field selection aligns strictly with
 * the schema and DTO. Throws if not found or access is not permitted.
 *
 * @param props - Properties for membership lookup
 * @param props.memberUser - The authenticated member user; only this user can
 *   access their own membership record
 * @param props.communityId - ID of the community (must match the membership's
 *   community_id)
 * @param props.membershipId - Unique identifier for the community membership
 *   record
 * @returns The membership record with all core fields
 * @throws {Error} If membership not found or access is forbidden
 */
export async function get__communityPlatform_memberUser_communities_$communityId_memberships_$membershipId(props: {
  memberUser: MemberuserPayload;
  communityId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityMembership> {
  const { memberUser, communityId, membershipId } = props;

  // Retrieve membership by membershipId and communityId
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirstOrThrow(
      {
        where: {
          id: membershipId,
          community_id: communityId,
        },
        select: {
          id: true,
          community_id: true,
          memberuser_id: true,
          joined_at: true,
        },
      },
    );

  // Only the member themselves may see their own membership
  if (membership.memberuser_id !== memberUser.id) {
    throw new Error(
      "Forbidden: You do not have permission to view this membership record.",
    );
  }

  return {
    id: membership.id,
    community_id: membership.community_id,
    memberuser_id: membership.memberuser_id,
    joined_at: toISOStringSafe(membership.joined_at),
  };
}
