import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformExternalIntegration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformExternalIntegration";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Update existing external integration configuration
 * (community_platform_external_integrations)
 *
 * Allows administrative users to update metadata, provider information, status,
 * or other configuration for a registered external integration. This could
 * include updating the provider URL, status (enabled/disabled), or
 * configuration JSON for an OAuth or webhook endpoint.
 *
 * Only mutable fields (provider_url, status, config_json,
 * last_successful_sync_at) may be updated. Immutable fields such as id,
 * integration_name, created_at, and updated_at are not modified directly.
 * Attempts to update a non-existent integration will result in a 404 error.
 *
 * Admin privileges are required for this operation. Updates are fully audited
 * via timestamps.
 *
 * @param props - Parameters for the update operation
 * @param props.adminUser - The authenticated admin user performing the update
 * @param props.externalIntegrationId - UUID of the external integration to
 *   update
 * @param props.body - Fields to update (provider_url, status, config_json,
 *   last_successful_sync_at). Only present fields are modified.
 * @returns The updated external integration record
 * @throws {Error} If the specified integration does not exist
 */
export async function put__communityPlatform_adminUser_externalIntegrations_$externalIntegrationId(props: {
  adminUser: AdminuserPayload;
  externalIntegrationId: string & tags.Format<"uuid">;
  body: ICommunityPlatformExternalIntegration.IUpdate;
}): Promise<ICommunityPlatformExternalIntegration> {
  const { adminUser, externalIntegrationId, body } = props;

  // Ensure the integration exists, otherwise throw error
  await MyGlobal.prisma.community_platform_external_integrations.findUniqueOrThrow(
    {
      where: { id: externalIntegrationId },
    },
  );

  // Only update allowed mutable fields
  const updated =
    await MyGlobal.prisma.community_platform_external_integrations.update({
      where: { id: externalIntegrationId },
      data: {
        provider_url: body.provider_url ?? undefined,
        status: body.status ?? undefined,
        config_json: body.config_json ?? undefined,
        last_successful_sync_at:
          body.last_successful_sync_at === undefined
            ? undefined
            : body.last_successful_sync_at === null
              ? null
              : toISOStringSafe(body.last_successful_sync_at),
      },
    });

  return {
    id: updated.id,
    integration_name: updated.integration_name,
    provider_url: updated.provider_url,
    status: updated.status,
    config_json: updated.config_json,
    last_successful_sync_at:
      updated.last_successful_sync_at === null
        ? null
        : updated.last_successful_sync_at
          ? toISOStringSafe(updated.last_successful_sync_at)
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
