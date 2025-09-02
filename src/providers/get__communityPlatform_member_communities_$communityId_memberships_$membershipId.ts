import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve details on a specific community membership within a given community.
 *
 * This endpoint allows an authenticated member to fetch the details of a
 * specific membership record (join event) in a community. Only the member
 * referenced by the membership, or the owner of the community, may access this
 * detailed information. Returns the membership details including join
 * timestamp. Throws an error if the membership or community does not exist, or
 * if the authenticated member is unauthorized.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member (JWT payload)
 * @param props.communityId - UUID of the community containing the membership
 * @param props.membershipId - UUID of the membership to retrieve details for
 * @returns The detailed community membership record, including join date
 * @throws {Error} When the membership or community does not exist
 * @throws {Error} When the requester is not the member or the owner of the
 *   community
 */
export async function get__communityPlatform_member_communities_$communityId_memberships_$membershipId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityMembership> {
  const { member, communityId, membershipId } = props;

  // Step 1: Look up the membership record by unique ID and community
  const membership =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: { id: membershipId, community_id: communityId },
    });
  if (!membership) throw new Error("Membership not found");

  // Step 2: Look up the community (for owner check)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: communityId },
    });
  if (!community) throw new Error("Community not found");

  // Step 3: Enforce business rule: only the member, or the community owner, may access
  if (member.id !== membership.member_id && member.id !== community.owner_id) {
    throw new Error("Unauthorized to access this membership detail");
  }

  // Step 4: Format and return object, ensuring ISO string for joined_at
  return {
    id: membership.id,
    member_id: membership.member_id,
    community_id: membership.community_id,
    joined_at: toISOStringSafe(membership.joined_at),
  };
}
