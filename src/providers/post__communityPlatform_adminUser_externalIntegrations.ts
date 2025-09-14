import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformExternalIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformExternalIntegration";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Create a new external integration (community_platform_external_integrations)
 *
 * Allows administrative users to register a new external integration (such as a
 * webhook, OAuth provider, or analytics endpoint) with the platform. Only admin
 * users are permitted to create integrations.
 *
 * @param props - Operation props
 * @param props.adminUser - Authenticated admin user performing the action
 * @param props.body - Integration creation payload (name, status, URL, config,
 *   optional last sync)
 * @returns The full, newly created ICommunityPlatformExternalIntegration record
 * @throws {Error} If not authorized as adminUser or integration_name is
 *   duplicate
 */
export async function post__communityPlatform_adminUser_externalIntegrations(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformExternalIntegration.ICreate;
}): Promise<ICommunityPlatformExternalIntegration> {
  const { adminUser, body } = props;
  if (!adminUser || adminUser.type !== "adminUser") {
    throw new Error("Admin authorization required");
  }
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.community_platform_external_integrations.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          integration_name: body.integration_name,
          provider_url: body.provider_url ?? null,
          status: body.status,
          config_json: body.config_json,
          last_successful_sync_at: body.last_successful_sync_at ?? null,
          created_at: now,
          updated_at: now,
        },
      });
    return {
      id: created.id,
      integration_name: created.integration_name,
      provider_url: created.provider_url ?? null,
      status: created.status,
      config_json: created.config_json,
      last_successful_sync_at:
        created.last_successful_sync_at != null
          ? toISOStringSafe(created.last_successful_sync_at)
          : null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("Integration name is already in use");
    }
    throw err;
  }
}
