import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Retrieve complete community information and relationships by community ID.
 *
 * Get details about a specific community, including all fields, rule lines,
 * category and owner metadata, and related status. All fields defined in the
 * community_platform_communities schema are included, with linked
 * rules/categorization and display information. Public API for community
 * browsing and view pages. Does not return data for soft-deleted communities to
 * prevent invalid or misleading content being shown; admins may have an
 * override to read deleted state for audits. No private or sensitive data
 * returned to member or public roles.
 *
 * @param props - Request properties
 * @param props.communityId - The community record ID to look up
 * @returns The full community entity as defined by ICommunityPlatformCommunity.
 * @throws {Error} When the community is not found or has been soft-deleted
 */
export async function get__communityPlatform_communities_$communityId(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunity> {
  const { communityId } = props;

  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
    });

  if (!community || community.deleted_at) {
    throw new Error("Community not found or was deleted.");
  }

  return {
    id: community.id,
    category_id: community.category_id,
    owner_id: community.owner_id,
    name: community.name,
    display_title: community.display_title ?? null,
    description: community.description ?? null,
    logo_uri: community.logo_uri ?? null,
    banner_uri: community.banner_uri ?? null,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at: null,
  };
}
