import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing admin action record (audit/moderation log).
 *
 * Used by admins to complete, clarify, or supply resolution notes for
 * previously logged moderation/admin actions. Strictly enforces that only the
 * admin who performed the action may update it. Permitted fields for update are
 * limited to 'reason' (nullable for clearing) and 'result' (string). Returns
 * the updated admin action record in compliance-auditable format.
 *
 * @param props - Update parameters
 * @param props.admin - Authenticated admin payload (must match admin_id of the
 *   record)
 * @param props.adminActionId - Unique ID of the admin/moderation action record
 *   to update
 * @param props.body - Updated information for the admin/moderation action
 *   record ('reason' and/or 'result')
 * @returns The updated admin/moderation action record, with immutable fields
 *   preserved and 'created_at' as ISO 8601 string.
 * @throws {Error} If the action doesn't exist or the requesting admin does not
 *   own the action record
 */
export async function put__communityPlatform_admin_adminActions_$adminActionId(props: {
  admin: AdminPayload;
  adminActionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdminAction.IUpdate;
}): Promise<ICommunityPlatformAdminAction> {
  const { admin, adminActionId, body } = props;

  // 1. Fetch target action or throw if not found
  const action =
    await MyGlobal.prisma.community_platform_admin_actions.findUnique({
      where: { id: adminActionId },
    });
  if (!action) throw new Error("Admin action not found");

  // 2. Authorize: only creator (admin_id) may update
  if (action.admin_id !== admin.id) {
    throw new Error("Forbidden: You may only update your own admin actions.");
  }

  // 3. Update allowed fields: reason (nullable) and result (if present)
  const updated = await MyGlobal.prisma.community_platform_admin_actions.update(
    {
      where: { id: adminActionId },
      data: {
        reason: body.reason ?? undefined,
        result: body.result ?? undefined,
      },
    },
  );

  // 4. Build and return DTO with ISO8601 created_at string
  return {
    id: updated.id,
    admin_id: updated.admin_id,
    action_type: updated.action_type,
    target_entity: updated.target_entity,
    target_entity_id: updated.target_entity_id,
    reason: updated.reason ?? null,
    result: updated.result,
    created_at: toISOStringSafe(updated.created_at),
  };
}
