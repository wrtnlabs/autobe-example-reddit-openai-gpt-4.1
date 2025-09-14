import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Update a configuration entry (community_platform_configurations).
 *
 * Updates a platform configuration parameter value and/or description by its
 * unique identifier. Only authenticated admin users may perform this operation.
 * Modifying a configuration can affect runtime system behavior. All updates are
 * recorded with an updated timestamp. Immutable fields (id, key) are not
 * modifiable.
 *
 * @param props - Request properties
 * @param props.adminUser - The authenticated admin making the request
 * @param props.configurationId - Unique identifier (UUID) of the configuration
 *   to update
 * @param props.body - Update payload with the new value and/or description
 * @returns The updated configuration entry
 * @throws {Error} When the configuration is not found
 */
export async function put__communityPlatform_adminUser_configurations_$configurationId(props: {
  adminUser: AdminuserPayload;
  configurationId: string & tags.Format<"uuid">;
  body: ICommunityPlatformConfiguration.IUpdate;
}): Promise<ICommunityPlatformConfiguration> {
  const { adminUser, configurationId, body } = props;

  // Check for existence and throw if not found
  const existing =
    await MyGlobal.prisma.community_platform_configurations.findUnique({
      where: { id: configurationId },
    });
  if (!existing) {
    throw new Error("Configuration not found");
  }

  // Update mutable fields (value, description), and force-update updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.community_platform_configurations.update({
      where: { id: configurationId },
      data: {
        value: body.value ?? undefined,
        description: body.description ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
