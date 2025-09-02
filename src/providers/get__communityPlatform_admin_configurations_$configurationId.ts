import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve the full details of a specific system configuration parameter.
 *
 * This endpoint is restricted to admin users and returns information even if
 * the configuration has been soft-deleted. Used for audit, compliance, and
 * troubleshooting scenarios. Sensitive or confidential values are only
 * displayed if authorized. Lookup is performed by unique configuration ID.
 * Access events are always audit logged by the system.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the lookup
 *   (authorization enforced)
 * @param props.configurationId - The UUID of the configuration parameter to
 *   retrieve
 * @returns The full configuration parameter details (including soft-deleted if
 *   present)
 * @throws {Error} If the admin is not found, inactive, or deleted
 *   (unauthorized)
 * @throws {Error} If the configuration record does not exist
 */
export async function get__communityPlatform_admin_configurations_$configurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformConfiguration> {
  const { admin, configurationId } = props;

  // Authorization enforced by admin param: check is_active, not deleted
  const adminRecord = await MyGlobal.prisma.community_platform_admins.findFirst(
    {
      where: { id: admin.id, is_active: true, deleted_at: null },
    },
  );
  if (!adminRecord) {
    throw new Error("Unauthorized: Admin not found or inactive.");
  }

  // Retrieve configuration by id (returns even if soft-deleted)
  const config =
    await MyGlobal.prisma.community_platform_configurations.findFirst({
      where: { id: configurationId },
    });
  if (!config) {
    throw new Error("Configuration parameter not found");
  }

  return {
    id: config.id,
    key: config.key,
    value: config.value,
    description: config.description ?? null,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at: config.deleted_at ? toISOStringSafe(config.deleted_at) : null,
  };
}
