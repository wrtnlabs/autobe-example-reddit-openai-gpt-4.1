import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Updates metadata and settings for a specific sub-community (excluding
 * name/category).
 *
 * Only the community owner (memberUser) may update description, logo_uri, or
 * banner_uri. Name and category_id are immutable post-creation. This function
 * checks for community existence, enforces ownership, and updates only allowed
 * fields, stamping updated_at with the current timestamp.
 *
 * @param props - Input properties containing authenticated memberUser, the
 *   communityId to update, and body with updatable metadata.
 * @param props.memberUser - Authenticated member user making the request. Must
 *   match owner_id of the community.
 * @param props.communityId - Unique ID of community to be updated.
 * @param props.body - Updatable metadata: description, logo_uri, banner_uri
 *   (all optional).
 * @returns The updated community object with all fields as specified in
 *   ICommunityPlatformCommunity.
 * @throws {Error} If the community does not exist or the requester is not the
 *   owner.
 */
export async function put__communityPlatform_memberUser_communities_$communityId(props: {
  memberUser: MemberuserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  const { memberUser, communityId, body } = props;

  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
    });
  if (!community) {
    throw new Error("Community not found");
  }
  if (community.owner_id !== memberUser.id) {
    throw new Error("Forbidden: You are not the owner of this community.");
  }

  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_communities.update({
    where: { id: communityId },
    data: {
      description: body.description ?? undefined,
      logo_uri: body.logo_uri ?? undefined,
      banner_uri: body.banner_uri ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    owner_id: updated.owner_id,
    category_id: updated.category_id,
    name: updated.name,
    description: updated.description ?? undefined,
    logo_uri: updated.logo_uri ?? undefined,
    banner_uri: updated.banner_uri ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
