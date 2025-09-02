import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves full details for a specific community platform category by
 * categoryId (UUID). Returns the complete information for display/edit in admin
 * interface. The operation checks for soft deletion and returns not found for
 * deleted categories.
 *
 * Only admin users may call this endpoint due to taxonomy system impact.
 * Returns not found for non-existent or soft-deleted categories.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making this request
 * @param props.categoryId - The UUID of the target category to retrieve
 * @returns The complete ICommunityPlatformCategory object with all relevant
 *   fields
 * @throws {Error} When the target category does not exist or is soft-deleted
 */
export async function get__communityPlatform_admin_categories_$categoryId(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCategory> {
  const { categoryId } = props;
  const found = await MyGlobal.prisma.community_platform_categories.findFirst({
    where: {
      id: categoryId,
      deleted_at: null,
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!found) throw new Error("Category not found");
  return {
    id: found.id,
    code: found.code,
    name: found.name,
    description: found.description ?? null,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
  };
}
