import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function post__communityPlatform_memberUser_communities_$communityId_memberships(props: {
  memberUser: MemberuserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityMembership.ICreate;
}): Promise<ICommunityPlatformCommunityMembership> {
  const { memberUser, communityId } = props;

  // Validate that the community exists and is active (not deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: communityId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!community) {
    throw new Error("Community not found or is deleted");
  }

  // Business constraint: Only one active membership per user per community
  const existing =
    await MyGlobal.prisma.community_platform_community_memberships.findFirst({
      where: {
        community_id: communityId,
        memberuser_id: memberUser.id,
      },
      select: { id: true },
    });
  if (existing) {
    throw new Error("User is already a member of this community");
  }

  // Create the membership record
  const joined_at = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_community_memberships.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_id: communityId,
        memberuser_id: memberUser.id,
        joined_at,
      },
      select: {
        id: true,
        community_id: true,
        memberuser_id: true,
        joined_at: true,
      },
    });

  return {
    id: created.id,
    community_id: created.community_id,
    memberuser_id: created.memberuser_id,
    joined_at: toISOStringSafe(created.joined_at),
  };
}
