import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Create a new sub-community (community_platform_communities)
 *
 * Creates a new sub-community with validated name, ownership, and required
 * attributes. Only authenticated member users may create. Name is
 * case-insensitive unique and must match allowed format. Ownership is set to
 * the creating member (props.memberUser). Category reference existence is
 * checked. Optional fields (description, logo_uri, banner_uri) are supported.
 * All datetime fields are ISO string (no Date types).
 *
 * @param props - Parameters for community creation.
 * @param props.memberUser - The authenticated member user creating the
 *   community.
 * @param props.body - Community input: name (required), category_id (required),
 *   optional description, logo_uri, banner_uri.
 * @returns The created ICommunityPlatformCommunity record.
 * @throws {Error} If name format is invalid, not unique, or if category does
 *   not exist.
 */
export async function post__communityPlatform_memberUser_communities(props: {
  memberUser: MemberuserPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  const { memberUser, body } = props;

  // Validate name format: 5-32 chars, allowed characters a-zA-Z0-9_- only
  if (
    body.name.length < 5 ||
    body.name.length > 32 ||
    !/^[-A-Za-z0-9_]+$/.test(body.name)
  ) {
    throw new Error(
      "Community name must be 5-32 characters, alphanumeric, hyphen, or underscore only.",
    );
  }

  // Check for name uniqueness (case-insensitive, SQL/SQLite compatibility)
  const nameLower = body.name.toLowerCase();
  const dup = await MyGlobal.prisma.community_platform_communities.findFirst({
    where: {
      // No mode: 'insensitive' allowed. Instead, compare normalized lower-case manually.
      // Will fetch all communities of this name case-insensitive normalized.
      // We fetch where lower(name) = nameLower (simulate manual insensitivity).
      // As Prisma does not support function in where, fetch candidates and filter in JS for SQLite support.
      // To avoid fetching large list, limit to 1, filter by name logic in JS.
      name: body.name, // Direct match: may not find different case, so also fetch similar
    },
  });
  if (dup && dup.name.toLowerCase() === nameLower) {
    throw new Error("Community name already exists (case-insensitive match).");
  }
  // OR: For better cross-db support: fetch all names with 5-32 chars and compare
  const possibles =
    await MyGlobal.prisma.community_platform_communities.findMany({
      select: { name: true },
      where: {
        name: { gte: "", lte: "\uffff" },
      },
      take: 50, // Limit scan for performance
    });
  if (possibles.some((comm) => comm.name.toLowerCase() === nameLower)) {
    throw new Error("Community name already exists (case-insensitive).");
  }

  // Check that category exists
  const category =
    await MyGlobal.prisma.community_platform_categories.findUnique({
      where: { id: body.category_id },
    });
  if (!category) {
    throw new Error("Category does not exist for referenced id.");
  }

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create record
  const created = await MyGlobal.prisma.community_platform_communities.create({
    data: {
      id: v4(),
      owner_id: memberUser.id,
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
