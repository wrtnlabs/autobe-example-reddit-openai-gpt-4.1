import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAdminAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminAction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new administrative action record for audit and moderation purposes.
 *
 * Logs a new administrative/moderation action performed by an admin user to
 * support audit trails and compliance. The authenticated admin must match the
 * provided admin_id in the request. All required fields are validated, and the
 * audit record is returned upon success.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user (from AdminAuth decorator)
 * @param props.body - Information required to create a new admin/moderation
 *   action record
 * @returns The created admin/moderation action record
 * @throws {Error} Forbidden when the authenticated admin_id does not match the
 *   provided admin_id
 */
export async function post__communityPlatform_admin_adminActions(props: {
  admin: AdminPayload;
  body: ICommunityPlatformAdminAction.ICreate;
}): Promise<ICommunityPlatformAdminAction> {
  const { admin, body } = props;

  // Enforce that the authenticated admin matches the request.
  if (admin.id !== body.admin_id) {
    throw new Error(
      "Forbidden: authenticated admin_id does not match provided admin_id.",
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.community_platform_admin_actions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        admin_id: body.admin_id,
        action_type: body.action_type,
        target_entity: body.target_entity,
        target_entity_id: body.target_entity_id,
        reason: body.reason ?? null,
        result: body.result,
        created_at: now,
      },
    },
  );

  return {
    id: created.id,
    admin_id: created.admin_id,
    action_type: created.action_type,
    target_entity: created.target_entity,
    target_entity_id: created.target_entity_id,
    reason: created.reason ?? null,
    result: created.result,
    created_at: toISOStringSafe(created.created_at),
  };
}
