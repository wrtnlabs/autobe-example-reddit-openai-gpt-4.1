import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Remove (hard delete) an external integration
 * (community_platform_external_integrations)
 *
 * Permanently deletes an external integration from the platform. The
 * integration is identified by its UUID. This is a hard deletion—once
 * completed, the integration (and all associated metadata/credentials) cannot
 * be recovered. Only admin users are authorized to invoke this operation. An
 * audit log entry is created for compliance.
 *
 * @param props - Request properties:
 *
 *   - AdminUser: Authenticated admin user performing the delete
 *   - ExternalIntegrationId: UUID of the integration to permanently delete
 *
 * @returns Void
 * @throws {Error} If the integration with the provided id does not exist
 */
export async function delete__communityPlatform_adminUser_externalIntegrations_$externalIntegrationId(props: {
  adminUser: AdminuserPayload;
  externalIntegrationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { adminUser, externalIntegrationId } = props;

  // Verify the integration exists
  const integration =
    await MyGlobal.prisma.community_platform_external_integrations.findUnique({
      where: { id: externalIntegrationId },
    });
  if (!integration) {
    throw new Error("Integration not found");
  }

  // Hard delete the integration
  await MyGlobal.prisma.community_platform_external_integrations.delete({
    where: { id: externalIntegrationId },
  });

  // Write audit log (for compliance)
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_adminuser_id: adminUser.id,
      actor_memberuser_id: null,
      event_type: "external_integration_delete",
      event_detail: `Deleted integration ${externalIntegrationId}`,
      ip_address: null,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
