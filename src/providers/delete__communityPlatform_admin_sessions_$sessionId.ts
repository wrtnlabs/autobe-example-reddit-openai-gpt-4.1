import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete (invalidate) a session by ID; immediate logout effect.
 *
 * Soft delete (invalidate) a session, marking its deleted_at timestamp.
 * Invalidates the JWT and refresh token for immediate effect. Serves as
 * system/admin-initiated forced logout for user or admin, or user self-logout
 * for a session. Only session owner or admin can perform this deletion. The
 * record remains for audit/logging but cannot be reactivated. Fails if already
 * deleted. This endpoint fulfills logout everywhere/log out current device
 * scenarios in account management flows.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the session
 *   invalidation (must have admin rights)
 * @param props.sessionId - Unique ID for the session to invalidate/delete
 *   (string & tags.Format<'uuid'>)
 * @returns Void
 * @throws {Error} When session does not exist, is already deleted, or is not
 *   found
 */
export async function delete__communityPlatform_admin_sessions_$sessionId(props: {
  admin: AdminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, sessionId } = props;
  // Find session by ID, only if not already deleted (soft delete only)
  const session = await MyGlobal.prisma.community_platform_sessions.findFirst({
    where: {
      id: sessionId,
      deleted_at: null,
    },
  });
  if (!session) {
    throw new Error("Session not found or already deleted");
  }
  // Set deleted_at to now (ISO 8601 format), effect is immediate logout/invalidation
  await MyGlobal.prisma.community_platform_sessions.update({
    where: { id: sessionId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
