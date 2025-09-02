import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Hard-delete an admin/moderation action from the audit log.
 *
 * Removes an existing admin action record from the audit log. This is intended
 * for critical error correction, audit remediation, or appeal scenarios only.
 * Super-admin or designated audit staff access is required under strict
 * business rules to prevent tampering. This action is logged and deeply
 * reviewed for compliance reasons.
 *
 * @param props - Function parameters
 * @param props.admin - Authenticated admin user (authorization is checked via
 *   AdminAuth decorator)
 * @param props.adminActionId - Unique ID of the admin action record to delete
 * @returns Void
 * @throws {Error} If the admin action does not exist. (Prisma generates an
 *   error if not found)
 */
export async function delete__communityPlatform_admin_adminActions_$adminActionId(props: {
  admin: AdminPayload;
  adminActionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Authorization is enforced by AdminAuth decorator (no additional check needed)
  await MyGlobal.prisma.community_platform_admin_actions.delete({
    where: { id: props.adminActionId },
  });
}
