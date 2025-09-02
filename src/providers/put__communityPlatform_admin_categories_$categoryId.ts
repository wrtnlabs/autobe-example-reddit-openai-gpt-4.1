import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing community platform category entity by UUID.
 *
 * Updates the display name, description, and other mutable fields for the
 * category specified by `categoryId`. Admin users can update only allowed
 * mutable fields. The 'code' field is immutable—attempts to modify it are
 * forbidden and will throw an error. Name uniqueness is enforced system-wide.
 * Auditing timestamps are updated on every successful change. Soft-deleted
 * categories or non-existent categories cannot be updated and trigger a
 * not-found error.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user context (required)
 * @param props.categoryId - The UUID of the category to update
 * @param props.body - Object specifying mutable fields to update (name,
 *   description)
 * @returns The updated community platform category entity, with all required
 *   fields populated and dates in ISO string format
 * @throws {Error} When category is not found or is soft-deleted
 * @throws {Error} When update attempts to modify forbidden field 'code'
 * @throws {Error} On duplication of category name (unique constraint violation)
 */
export async function put__communityPlatform_admin_categories_$categoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCategory.IUpdate;
}): Promise<ICommunityPlatformCategory> {
  // 1. Guard against forbidden update fields
  if (Object.prototype.hasOwnProperty.call(props.body, "code")) {
    throw new Error("The 'code' field is immutable and cannot be updated");
  }
  // 2. Find the existing category (exclude soft-deleted)
  const existing =
    await MyGlobal.prisma.community_platform_categories.findFirst({
      where: {
        id: props.categoryId,
        deleted_at: null,
      },
    });
  if (!existing) {
    throw new Error("Category not found or already deleted");
  }

  // 3. If updating 'name', enforce uniqueness constraint
  if (
    typeof props.body.name === "string" &&
    props.body.name !== existing.name
  ) {
    const duplicate =
      await MyGlobal.prisma.community_platform_categories.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.categoryId },
          deleted_at: null,
        },
      });
    if (duplicate) {
      throw new Error("A category with this name already exists");
    }
  }

  // 4. Update only mutable fields & updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_categories.update({
    where: { id: props.categoryId },
    data: {
      name: props.body.name ?? undefined,
      description: Object.prototype.hasOwnProperty.call(
        props.body,
        "description",
      )
        ? (props.body.description ?? null)
        : undefined,
      updated_at: now,
    },
  });

  // 5. Return normalized result with all audit fields (dates as branded ISO)
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
