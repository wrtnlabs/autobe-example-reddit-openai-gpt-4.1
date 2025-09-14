import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Create a new community platform category (admin only).
 *
 * This endpoint creates a new entry in the community_platform_categories table
 * with a unique, case-insensitive name, display order, and optional
 * description. Only authenticated admin users may perform this action. The
 * function ensures the name is not already in use before creation.
 *
 * @param props - The request properties
 * @param props.adminUser - The authenticated admin user (authorization
 *   required)
 * @param props.body - Category creation info: name (unique), display_order, and
 *   description (optional)
 * @returns The newly created category object as stored in the database
 * @throws {Error} If a category with the same name already exists (uniqueness
 *   constraint)
 */
export async function post__communityPlatform_adminUser_categories(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformCategory.ICreate;
}): Promise<ICommunityPlatformCategory> {
  const { adminUser, body } = props;
  // Enforce unique name before insertion
  const existing =
    await MyGlobal.prisma.community_platform_categories.findFirst({
      where: { name: body.name },
    });
  if (existing !== null) {
    throw new Error("Category name must be unique");
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_categories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: body.name,
      display_order: body.display_order,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    name: created.name,
    display_order: created.display_order,
    description: created.description,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
