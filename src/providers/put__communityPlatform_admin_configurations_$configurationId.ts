import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing system configuration parameter by its unique ID.
 *
 * This operation allows admin users to modify the key, value, or description
 * fields of a configuration parameter in the community_platform_configurations
 * table. Uniqueness of keys is enforced by the database. All changes update the
 * updated_at timestamp. Soft-deleted configurations (deleted_at is not null)
 * cannot be updated. Only active, non-deleted admins may perform this
 * operation.
 *
 * @param props - The function input containing:
 *
 *   - Admin: The authenticated admin user payload (authorization).
 *   - ConfigurationId: The unique UUID of the configuration parameter to update.
 *   - Body: The fields to update (any subset of key, value, description).
 *
 * @returns The full, updated configuration object.
 * @throws {Error} If admin is not found, is not active, or is soft-deleted.
 * @throws {Error} If configuration does not exist or is soft-deleted.
 * @throws {Error} If attempting to update key to a value that already exists
 *   (key uniqueness violation).
 */
export async function put__communityPlatform_admin_configurations_$configurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: ICommunityPlatformConfiguration.IUpdate;
}): Promise<ICommunityPlatformConfiguration> {
  const { admin, configurationId, body } = props;

  // Step 1: Authorization check - admin must exist, be active, and not deleted
  const adminRecord = await MyGlobal.prisma.community_platform_admins.findFirst(
    {
      where: {
        id: admin.id,
        is_active: true,
        deleted_at: null,
      },
    },
  );
  if (!adminRecord) {
    throw new Error(
      "Unauthorized: Admin account not found, inactive, or deleted",
    );
  }

  // Step 2: Find configuration by ID and ensure it is not soft deleted
  const config =
    await MyGlobal.prisma.community_platform_configurations.findFirst({
      where: {
        id: configurationId,
        deleted_at: null,
      },
    });
  if (!config) {
    throw new Error("Configuration not found or has been soft-deleted");
  }

  // Step 3: Build update data from provided body
  const updateData: Partial<
    Omit<
      ICommunityPlatformConfiguration,
      "id" | "created_at" | "updated_at" | "deleted_at"
    >
  > & { updated_at: string & tags.Format<"date-time"> } = {
    ...(body.key !== undefined && { key: body.key }),
    ...(body.value !== undefined && { value: body.value }),
    ...(body.description !== undefined && { description: body.description }),
    updated_at: toISOStringSafe(new Date()),
  };

  // Step 4: Update the configuration record
  const updated =
    await MyGlobal.prisma.community_platform_configurations.update({
      where: { id: configurationId },
      data: updateData,
    });

  // Step 5: Normalize and return the updated record, converting all date fields
  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
