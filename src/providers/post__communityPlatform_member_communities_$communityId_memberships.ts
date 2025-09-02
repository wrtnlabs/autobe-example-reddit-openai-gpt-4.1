import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Join a sub-community (create new membership) as an authenticated user.
 *
 * This operation allows an authenticated user to join a sub-community by
 * creating a new active membership in the
 * community_platform_community_memberships table.
 *
 * - Enforces that a member cannot join the same community twice (unique
 *   constraint).
 * - On success, returns the new membership record with relevant IDs and join
 *   date.
 * - Throws an error if the member has already joined the community.
 *
 * @param props - Request properties
 * @param props.member - Authenticated member attempting to join a community
 *   (authorization enforced)
 * @param props.communityId - UUID of the community to join
 * @param props.body - (Ignored; DTO present for API structure compatibility, no
 *   client-writable fields)
 * @returns The new membership record (ID, member ID, community ID, join
 *   timestamp)
 * @throws {Error} If membership already exists (duplicate join forbidden)
 */
export async function post__communityPlatform_member_communities_$communityId_memberships(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityMembership.ICreate;
}): Promise<ICommunityPlatformCommunityMembership> {
  const { member, communityId } = props;

  // Step 1: Enforce authorization (member is present and already validated by decorator)
  // (No explicit checks needed; decorator guarantees member is valid and active)

  // Step 2: Prevent duplicate membership (enforced at app-level for semantics and clearer errors)
  const prior =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        member_id: member.id,
        community_id: communityId,
      },
    });
  if (prior) {
    throw new Error(
      "You have already joined this community. Duplicate memberships are not allowed.",
    );
  }

  // Step 3: Create new active membership entry
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_community_memberships.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        member_id: member.id,
        community_id: communityId,
        joined_at: now,
      },
    });

  // Step 4: Return full membership record, normalizing joined_at as ISO string
  return {
    id: created.id,
    member_id: created.member_id,
    community_id: created.community_id,
    joined_at: toISOStringSafe(created.joined_at),
  };
}
