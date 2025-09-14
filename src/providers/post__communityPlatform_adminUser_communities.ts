import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Create a new sub-community (community_platform_communities)
 *
 * This endpoint allows an authenticated admin user to create a new
 * sub-community on the platform. The sub-community is linked to the admin as
 * owner, references a valid category, and supports optional descriptive and
 * visual fields. Names are enforced as unique and required, and categories are
 * validated as existing in the system. All date values are formatted as ISO
 * 8601 strings, and IDs are generated as UUID v4. No native Date types are used
 * anywhere in this implementation.
 *
 * @param props - Properties for the creation operation
 * @param props.adminUser - Authenticated admin user (AdminuserPayload) who will
 *   be set as owner of the new community
 * @param props.body - ICommunityPlatformCommunity.ICreate: data for the
 *   community to be created (required and optional attributes as per spec)
 * @returns Fully populated ICommunityPlatformCommunity DTO conforming to
 *   business and schema rules
 * @throws {Error} When the referenced category_id does not exist or the
 *   community name is already in use
 */
export async function post__communityPlatform_adminUser_communities(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  const { adminUser, body } = props;
  // Validate the referenced category exists
  const category =
    await MyGlobal.prisma.community_platform_categories.findFirst({
      where: {
        id: body.category_id,
      },
    });
  if (!category) {
    throw new Error("Invalid category_id: category not found");
  }
  // Enforce uniqueness of community name among active (not soft-deleted) communities
  const existing =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: body.name,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new Error("Community name is already in use");
  }
  // Generate ID and timestamps _without_ using native Date anywhere
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  // Create the community
  const created = await MyGlobal.prisma.community_platform_communities.create({
    data: {
      id,
      owner_id: adminUser.id,
      category_id: body.category_id,
      name: body.name,
      description: body.description ?? undefined,
      logo_uri: body.logo_uri ?? undefined,
      banner_uri: body.banner_uri ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Return the API DTO, converting all optional/nullable types strictly according to the DTO contract
  return {
    id: created.id,
    owner_id: created.owner_id,
    category_id: created.category_id,
    name: created.name,
    description: created.description ?? undefined,
    logo_uri: created.logo_uri ?? undefined,
    banner_uri: created.banner_uri ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
