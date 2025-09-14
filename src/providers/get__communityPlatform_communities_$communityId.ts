import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Get full sub-community details by ID (community_platform_communities)
 *
 * Retrieves full detail for a specific sub-community by its unique community
 * ID. Connected to the community_platform_communities table and supports
 * detailed info requests for community home pages and join/leave flows.
 *
 * Allows any user to get a detailed record for a sub-community using its ID.
 * Data returned includes all business-context fields, such as name
 * (case-insensitive), description, logo/banner URIs, rules, owner, and audit
 * timestamps. Underlying model is community_platform_communities.
 *
 * This data is the source for navigation, info boxes, community home layout,
 * and join/leave logic. The operation omits deleted communities and any
 * soft-deleted records.
 *
 * Open to all users (public access), with enhanced permissions for
 * authenticated users when displaying join/leave or edit options.
 *
 * @param props - Object containing the communityId parameter
 * @param props.communityId - Unique identifier for the community record to
 *   retrieve
 * @returns Complete, detailed sub-community information for UI and business
 *   logic
 * @throws {Error} When the community does not exist or has been soft-deleted
 */
export async function get__communityPlatform_communities_$communityId(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunity> {
  const { communityId } = props;
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: communityId,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new Error("Community not found");
  }
  return {
    id: community.id,
    owner_id: community.owner_id,
    category_id: community.category_id,
    name: community.name,
    description: community.description ?? undefined,
    logo_uri: community.logo_uri ?? undefined,
    banner_uri: community.banner_uri ?? undefined,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at: community.deleted_at
      ? toISOStringSafe(community.deleted_at)
      : null,
  };
}
