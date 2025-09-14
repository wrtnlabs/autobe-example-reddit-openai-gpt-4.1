import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Get all details for a configuration parameter by configurationId (UUID; admin
 * only).
 *
 * Obtains details for a specific platform configuration parameter in the
 * community_platform_configurations table given configurationId. Used for admin
 * interfaces or audits to introspect system state. Returns all DTO fields: id,
 * key, value, description, created_at, updated_at.
 *
 * Requires adminUser authentication (enforced by decorator/payload). Throws
 * error if the record is not found.
 *
 * @param props -
 *
 *   - AdminUser: The authenticated admin user making the request (AdminuserPayload)
 *   - ConfigurationId: Unique UUID for configuration parameter row (primary key)
 *
 * @returns Configuration parameter details (full DTO)
 * @throws {Error} If no configuration entry exists for the given UUID
 */
export async function get__communityPlatform_adminUser_configurations_$configurationId(props: {
  adminUser: AdminuserPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformConfiguration> {
  const { configurationId } = props;
  const config =
    await MyGlobal.prisma.community_platform_configurations.findUniqueOrThrow({
      where: { id: configurationId },
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });
  return {
    id: config.id,
    key: config.key,
    value: config.value,
    description: config.description ?? null,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
  };
}
