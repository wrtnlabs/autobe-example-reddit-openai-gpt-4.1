import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Get details for a category by categoryId (UUID) from
 * community_platform_categories.
 *
 * Retrieves details for a specific category record in the
 * community_platform_categories table by categoryId. Returns all category
 * properties including name, display order, description, and timestamps for the
 * given UUID.
 *
 * @param props - Object containing memberUser payload and the categoryId
 * @param props.memberUser - The authenticated member user (authorization
 *   context)
 * @param props.categoryId - Unique identifier for the target category
 * @returns ICommunityPlatformCategory DTO with all fields populated for the
 *   target category
 * @throws {Error} If no category is found with the given categoryId
 */
export async function get__communityPlatform_memberUser_categories_$categoryId(props: {
  memberUser: MemberuserPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCategory> {
  const { categoryId } = props;
  const category =
    await MyGlobal.prisma.community_platform_categories.findUnique({
      where: { id: categoryId },
    });
  if (!category) {
    throw new Error("Category not found");
  }
  return {
    id: category.id,
    name: category.name,
    display_order: category.display_order,
    description: category.description,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
  };
}
