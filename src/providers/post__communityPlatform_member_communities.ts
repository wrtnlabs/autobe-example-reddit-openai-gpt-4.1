import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Create a new community as an authenticated member.
 *
 * This endpoint inserts a new row into the community_platform_communities
 * table, assigning the authenticated member as the owner/creator. The request
 * requires unique, immutable name, required category assignment, and may
 * optionally include display title, description, logo uri, and banner uri.
 * System fields for id, created_at, updated_at are set automatically. Returns
 * full new entity with all provided and default fields.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member requesting community creation
 * @param props.body - ICommunityPlatformCommunity.ICreate input containing
 *   required and optional fields for the community
 * @returns The created community entity, conforming to
 *   ICommunityPlatformCommunity
 * @throws {Error} When a community with the requested name already exists
 */
export async function post__communityPlatform_member_communities(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  const { member, body } = props;

  // Enforce unique community name
  const existing =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { name: body.name },
      select: { id: true },
    });
  if (existing) {
    throw new Error("Community name already exists");
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_communities.create({
    data: {
      id: v4() as string & tags.Format<"uuid">, // UUID generation as per schema (no default)
      category_id: body.category_id,
      owner_id: member.id,
      name: body.name,
      display_title: body.display_title ?? null,
      description: body.description ?? null,
      logo_uri: body.logo_uri ?? null,
      banner_uri: body.banner_uri ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    category_id: created.category_id,
    owner_id: created.owner_id,
    name: created.name,
    display_title: created.display_title ?? null,
    description: created.description ?? null,
    logo_uri: created.logo_uri ?? null,
    banner_uri: created.banner_uri ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
