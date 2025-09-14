import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Update a session record (community_platform_sessions).
 *
 * Allows an admin user to update mutable fields (device_info, revoked_at) for a
 * session record, identified by UUID. Only admin users may access this
 * endpoint. Immutable fields are untouched. Returns the updated session. All
 * returned date fields are ISO 8601 strings, fully branded. Throws if the
 * session is not found.
 *
 * @param props - Properties for the update operation
 * @param props.adminUser - Authenticated admin user payload (authorization
 *   enforced by controller/decorator)
 * @param props.sessionId - The UUID identifying the session to be updated
 * @param props.body - Object containing mutable updatable fields: device_info
 *   and/or revoked_at
 * @returns The complete updated session record in the ICommunityPlatformSession
 *   shape
 * @throws {Error} If the session does not exist
 */
export async function put__communityPlatform_adminUser_sessions_$sessionId(props: {
  adminUser: AdminuserPayload;
  sessionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSession.IUpdate;
}): Promise<ICommunityPlatformSession> {
  const { sessionId, body } = props;

  // Step 1: Ensure the session exists before attempting update
  const existing = await MyGlobal.prisma.community_platform_sessions.findUnique(
    {
      where: { id: sessionId },
    },
  );
  if (!existing) throw new Error("Session not found");

  // Step 2: Apply updates for mutable fields only
  const updated = await MyGlobal.prisma.community_platform_sessions.update({
    where: { id: sessionId },
    data: {
      device_info: body.device_info ?? undefined,
      revoked_at: body.revoked_at ?? undefined,
    },
  });

  // Step 3: Return updated session with full date conversion and brands
  return {
    id: updated.id,
    user_id: updated.user_id,
    token: updated.token,
    issued_at: toISOStringSafe(updated.issued_at),
    expires_at: toISOStringSafe(updated.expires_at),
    device_info: updated.device_info,
    ip_address: updated.ip_address,
    revoked_at:
      updated.revoked_at !== null && updated.revoked_at !== undefined
        ? toISOStringSafe(updated.revoked_at)
        : updated.revoked_at,
    created_at: toISOStringSafe(updated.created_at),
  };
}
