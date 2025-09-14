import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Hard delete a community platform category by UUID (admin only).
 *
 * Permanently removes the specified category from the platform. Before
 * deletion, this function verifies that no communities reference the category
 * as their category_id, ensuring referential integrity. If any community exists
 * that uses this category, deletion is forbidden. This operation is
 * irreversible and does not perform a soft delete because the category record
 * has no soft delete field.
 *
 * Only callable by admin users; the adminUser field must be present in the
 * parameter and is validated upstream.
 *
 * @param props - Object containing the adminUser authentication context and
 *   categoryId (UUID) to delete
 * @param props.adminUser - Authenticated admin user performing the deletion
 * @param props.categoryId - UUID of the category to delete
 * @returns Void
 * @throws {Error} If the category does not exist or if deletion would break
 *   referential integrity (i.e. category is used by a community)
 */
export async function delete__communityPlatform_adminUser_categories_$categoryId(props: {
  adminUser: AdminuserPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { adminUser, categoryId } = props;

  // 1. Verify category exists
  const category =
    await MyGlobal.prisma.community_platform_categories.findUnique({
      where: { id: categoryId },
    });
  if (!category) {
    throw new Error("Category not found");
  }

  // 2. Ensure no community currently references this category
  const inUse = await MyGlobal.prisma.community_platform_communities.findFirst({
    where: { category_id: categoryId },
  });
  if (inUse) {
    throw new Error(
      "Cannot delete category: One or more communities are assigned to this category",
    );
  }

  // 3. Perform hard delete (no soft delete field in schema, irreversible)
  await MyGlobal.prisma.community_platform_categories.delete({
    where: { id: categoryId },
  });
}
