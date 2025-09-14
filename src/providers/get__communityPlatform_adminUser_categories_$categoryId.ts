import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Get details for a category by categoryId (UUID) from
 * community_platform_categories.
 *
 * Obtains a single category by its unique identifier from the
 * community_platform_categories table. The response includes the primary key,
 * name, display order, description, and timestamps as per the schema. Suitable
 * for adminUser and memberUser access, but this route is adminUser-only. For
 * edit dialogs or detail UI.
 *
 * @param props - Request properties
 * @param props.adminUser - Authenticated adminUser performing the request
 * @param props.categoryId - Unique identifier for the target category
 *   (community_platform_categories.id)
 * @returns Details for the specified community platform category
 * @throws {Error} If the category is not found
 */
export async function get__communityPlatform_adminUser_categories_$categoryId(props: {
  adminUser: AdminuserPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCategory> {
  const { categoryId } = props;
  const category =
    await MyGlobal.prisma.community_platform_categories.findUniqueOrThrow({
      where: { id: categoryId },
    });
  return {
    id: category.id,
    name: category.name,
    display_order: category.display_order,
    description: category.description,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
  };
}
