import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details for a specific admin/moderation action by ID.
 *
 * Fetch all available details regarding a specific admin/moderation action for
 * auditing or dispute review. Administrators can examine the action type,
 * affected entity, rationale, and outcome, supporting regulatory and
 * operational compliance. The operation uses the action's unique ID and
 * enforces that only admin accounts can retrieve this sensitive audit data.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin making the request
 * @param props.adminActionId - UUID of the admin action record to retrieve
 * @returns Complete details for the requested admin/moderation action
 * @throws {Error} When the admin action record is not found
 */
export async function get__communityPlatform_admin_adminActions_$adminActionId(props: {
  admin: AdminPayload;
  adminActionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAdminAction> {
  const { admin, adminActionId } = props;

  const record =
    await MyGlobal.prisma.community_platform_admin_actions.findUnique({
      where: { id: adminActionId },
      select: {
        id: true,
        admin_id: true,
        action_type: true,
        target_entity: true,
        target_entity_id: true,
        reason: true,
        result: true,
        created_at: true,
      },
    });
  if (!record) {
    throw new Error("Admin action not found");
  }
  return {
    id: record.id,
    admin_id: record.admin_id,
    action_type: record.action_type,
    target_entity: record.target_entity,
    target_entity_id: record.target_entity_id,
    reason: record.reason,
    result: record.result,
    created_at: toISOStringSafe(record.created_at),
  };
}
