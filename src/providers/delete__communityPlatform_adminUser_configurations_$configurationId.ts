import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Delete a configuration entry (community_platform_configurations).
 *
 * Permanently deletes an existing configuration entry identified by UUID from
 * the community_platform_configurations table. Only admin users may perform
 * this operation. The configuration is removed with a hard delete: there is no
 * soft delete or recovery. If the configuration does not exist, an error is
 * thrown. There is no protection system for keys at DB level; all
 * configurations are deletable by admins.
 *
 * @param props - Request properties
 * @param props.adminUser - Authenticated admin user performing the deletion
 * @param props.configurationId - UUID of the configuration entry to delete
 * @returns Void (no result on success)
 * @throws {Error} When the configuration does not exist with the given ID
 */
export async function delete__communityPlatform_adminUser_configurations_$configurationId(props: {
  adminUser: AdminuserPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { configurationId } = props;

  // Check existence, throw if not found
  const exists =
    await MyGlobal.prisma.community_platform_configurations.findUnique({
      where: { id: configurationId },
    });
  if (!exists) {
    throw new Error("Configuration entry not found");
  }

  // Hard delete: remove permanently
  await MyGlobal.prisma.community_platform_configurations.delete({
    where: { id: configurationId },
  });
}
