import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a community category by setting deleted_at; removes from
 * functional lists.
 *
 * Performs a soft delete of the specified community category by marking its
 * deleted_at timestamp in the database. The category will be omitted from
 * normal functional queries, creation flows, or display UIs.
 *
 * Only administrators have the authority to retire categories, and all delete
 * events are logged for audits. This API does not fully erase records but
 * supports future recovery by privileged system operators if necessary. Related
 * endpoints include the category listing, retrieval, creation, and update
 * APIs.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the operation
 *   (AdminPayload)
 * @param props.categoryId - The UUID of the category to soft-delete
 * @returns Void (on successful deletion)
 * @throws {Error} When category is not found or already deleted
 */
export async function delete__communityPlatform_admin_categories_$categoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, categoryId } = props;
  // Look up an active (not-deleted) category by ID
  const category =
    await MyGlobal.prisma.community_platform_categories.findFirst({
      where: {
        id: categoryId,
        deleted_at: null,
      },
    });
  if (!category) {
    throw new Error("Category not found or already deleted");
  }
  // Soft-delete by setting deleted_at to current time (ISO 8601)
  await MyGlobal.prisma.community_platform_categories.update({
    where: { id: categoryId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
