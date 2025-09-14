import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformExternalIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformExternalIntegration";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Retrieve external integration detail by ID
 * (community_platform_external_integrations)
 *
 * This endpoint allows an authenticated admin user to retrieve all
 * configuration and metadata details about a specific external integration by
 * its unique identifier (UUID). It returns integration name, provider URL,
 * status, configuration JSON, audit timestamps, and last successful sync time
 * for admin review or edit flows.
 *
 * Only admin users may access this endpoint due to the sensitivity of stored
 * credentials and operational configuration. The query fails with an error (not
 * found) if no matching integration is found with the supplied ID.
 *
 * @param props - Object containing adminUser authentication information and the
 *   integration identifier
 * @param props.adminUser - The authenticated admin user making the request
 *   (authorization handled upstream)
 * @param props.externalIntegrationId - UUID of the external integration to
 *   query
 * @returns Complete external integration details for admin view/edit
 * @throws {Error} If the integration does not exist with the given ID
 */
export async function get__communityPlatform_adminUser_externalIntegrations_$externalIntegrationId(props: {
  adminUser: AdminuserPayload;
  externalIntegrationId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformExternalIntegration> {
  const { externalIntegrationId } = props;
  const record =
    await MyGlobal.prisma.community_platform_external_integrations.findUniqueOrThrow(
      {
        where: { id: externalIntegrationId },
        select: {
          id: true,
          integration_name: true,
          provider_url: true,
          status: true,
          config_json: true,
          last_successful_sync_at: true,
          created_at: true,
          updated_at: true,
        },
      },
    );
  return {
    id: record.id,
    integration_name: record.integration_name,
    provider_url: record.provider_url,
    status: record.status,
    config_json: record.config_json,
    last_successful_sync_at:
      record.last_successful_sync_at === null ||
      typeof record.last_successful_sync_at === "undefined"
        ? null
        : toISOStringSafe(record.last_successful_sync_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
