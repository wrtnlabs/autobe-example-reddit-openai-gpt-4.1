import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new community as an authenticated member or admin.
 *
 * This endpoint adds a new entry to the `community_platform_communities` table,
 * requiring a unique, immutable name, assigned category, and references to the
 * creator/owner (from authentication context). Optionally sets display_title,
 * description, logo URI, and banner URI. The returned entity includes all
 * fields as per the ICommunityPlatformCommunity structure, with timestamps
 * normalized and soft-deletion as null.
 *
 * Permissions:
 *
 * - Only authenticated admins can call this provider.
 * - (Business logic may separately allow admins to create on behalf of members.)
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin context (will be set as owner of the
 *   community)
 * @param props.body - The data to create the community with (validated
 *   upstream)
 * @returns The newly created community entity with all core/default fields
 *   populated
 * @throws {Error} If Prisma constraint violations occur (e.g., name uniqueness)
 */
export async function post__communityPlatform_admin_communities(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_communities.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      category_id: props.body.category_id,
      owner_id: props.admin.id,
      name: props.body.name,
      display_title: props.body.display_title ?? undefined,
      description: props.body.description ?? undefined,
      logo_uri: props.body.logo_uri ?? undefined,
      banner_uri: props.body.banner_uri ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    category_id: created.category_id,
    owner_id: created.owner_id,
    name: created.name,
    display_title: created.display_title ?? undefined,
    description: created.description ?? undefined,
    logo_uri: created.logo_uri ?? undefined,
    banner_uri: created.banner_uri ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
