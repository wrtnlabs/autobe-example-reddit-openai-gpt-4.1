import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Update properties for a category (description, order) by categoryId (admin
 * only).
 *
 * Updates a community platform category in the community_platform_categories
 * table by categoryId. Allows adminUser to edit only the description and
 * display_order. Attempts to edit the category name or id will be rejected. The
 * category's updated_at timestamp will be refreshed. Returns the updated
 * category. Throws error if category does not exist or if an attempt is made to
 * edit an immutable property.
 *
 * @param props - Object containing all necessary parameters.
 * @param props.adminUser - Authenticated adminUser performing the update
 * @param props.categoryId - UUID of the category to update
 * @param props.body - Category update request, may include description and/or
 *   display_order (name is immutable; attempts to change are rejected)
 * @returns The updated category record
 * @throws {Error} If attempt is made to change the category name, or if
 *   category is not found
 */
export async function put__communityPlatform_adminUser_categories_$categoryId(props: {
  adminUser: AdminuserPayload;
  categoryId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCategory.IUpdate;
}): Promise<ICommunityPlatformCategory> {
  const { adminUser, categoryId, body } = props;
  // Business rule: name is immutable
  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    throw new Error("Category name is immutable and cannot be updated");
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_categories.update({
    where: { id: categoryId },
    data: {
      display_order: body.display_order ?? undefined,
      description:
        body.description === undefined ? undefined : body.description,
      updated_at: now,
    },
  });
  return {
    id: updated.id,
    name: updated.name,
    display_order: updated.display_order,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
