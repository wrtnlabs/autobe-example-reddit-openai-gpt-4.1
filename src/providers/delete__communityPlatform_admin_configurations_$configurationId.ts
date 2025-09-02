import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a system configuration parameter
 * (community_platform_configurations table).
 *
 * Removes a configuration parameter from active use by performing a soft delete
 * (setting the 'deleted_at' field). Only admins may invoke this operation. If
 * the configuration does not exist or has already been deleted, an error is
 * thrown. No data is physically deleted, ensuring audit compliance.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing this soft deletion
 * @param props.configurationId - Unique identifier of the configuration
 *   parameter to soft delete
 * @returns Void
 * @throws {Error} When the configuration does not exist or has already been
 *   deleted (soft-deleted)
 */
export async function delete__communityPlatform_admin_configurations_$configurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, configurationId } = props;

  // 1. Check for existence and not yet deleted
  const config =
    await MyGlobal.prisma.community_platform_configurations.findFirst({
      where: {
        id: configurationId,
        deleted_at: null,
      },
    });

  if (!config) {
    throw new Error("Configuration not found or already deleted");
  }

  // 2. Soft delete the configuration
  await MyGlobal.prisma.community_platform_configurations.update({
    where: { id: configurationId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  return;
}
