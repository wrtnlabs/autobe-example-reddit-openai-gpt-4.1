import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update the metadata and settings of an existing sub-community by communityId.
 *
 * This operation allows authorized users (community owners or admins) to update
 * the editable fields of an existing sub-community. Editable fields include
 * display_title, description, logo_uri, banner_uri, and category_id. The
 * operation enforces business rules for editability, reference integrity (valid
 * category and owner), and proper authorization, as only the community creator
 * may update community metadata. Related entities such as community rules must
 * be edited separately.
 *
 * @param props - Request properties
 * @param props.member - Authenticated MemberPayload (must own the community)
 * @param props.communityId - Unique community id (UUID) to update
 * @param props.body - Editable fields (see ICommunityPlatformCommunity.IUpdate;
 *   may include display_title, description, logo_uri, banner_uri, category_id)
 * @returns The updated community with all current metadata and audit fields
 * @throws {Error} If the community is not found or is deleted.
 * @throws {Error} If the requester is not the community owner.
 * @throws {Error} If category_id is provided but invalid.
 */
export async function put__communityPlatform_member_communities_$communityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  const { member, communityId, body } = props;

  // 1. Fetch the community (must exist, not deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: communityId, deleted_at: null },
    });
  if (!community) {
    throw new Error("Community not found or already deleted");
  }
  // 2. Authorization: Only owner allowed
  if (community.owner_id !== member.id) {
    throw new Error("You are not the owner of this community");
  }

  // 3. If category_id is being changed, validate that it exists and is not deleted
  if (body.category_id !== undefined && body.category_id !== null) {
    const category =
      await MyGlobal.prisma.community_platform_categories.findFirst({
        where: { id: body.category_id, deleted_at: null },
      });
    if (!category) {
      throw new Error("Provided category_id does not exist or is deleted");
    }
  }

  // 4. Prepare updates (only update editable fields)
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_communities.update({
    where: { id: communityId },
    data: {
      display_title: body.display_title ?? undefined,
      description: body.description ?? undefined,
      logo_uri: body.logo_uri ?? undefined,
      banner_uri: body.banner_uri ?? undefined,
      category_id: body.category_id ?? undefined,
      updated_at: now,
    },
  });

  // 5. Return the updated entity, formatting date fields
  return {
    id: updated.id,
    category_id: updated.category_id,
    owner_id: updated.owner_id,
    name: updated.name,
    display_title: updated.display_title ?? null,
    description: updated.description ?? null,
    logo_uri: updated.logo_uri ?? null,
    banner_uri: updated.banner_uri ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
