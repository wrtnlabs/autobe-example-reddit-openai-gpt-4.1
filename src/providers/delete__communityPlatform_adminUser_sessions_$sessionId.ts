import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Delete or revoke a session record (community_platform_sessions).
 *
 * This operation permanently revokes a platform session record in the
 * community_platform_sessions schema by setting its revoked_at timestamp. Only
 * admin users may perform this action. If the session has already been revoked,
 * the function returns (idempotent). If the session does not exist, throws an
 * error. All operations use ISO date strings for timestamps, and no native Date
 * type is used anywhere.
 *
 * @param props - The parameters for session revocation.
 * @param props.adminUser - Authenticated admin user (must have type
 *   "adminUser").
 * @param props.sessionId - The session's unique ID in UUID format.
 * @returns Void
 * @throws {Error} If no session with the given ID exists.
 */
export async function delete__communityPlatform_adminUser_sessions_$sessionId(props: {
  adminUser: AdminuserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { adminUser, sessionId } = props;

  // Find the session by ID
  const session = await MyGlobal.prisma.community_platform_sessions.findUnique({
    where: { id: sessionId },
  });
  if (!session) {
    throw new Error("Session not found");
  }

  // If already revoked (revoked_at is set), return with no change (idempotent)
  if (session.revoked_at !== null && session.revoked_at !== undefined) {
    return;
  }

  // Update revoked_at to current ISO string to mark as revoked
  await MyGlobal.prisma.community_platform_sessions.update({
    where: { id: sessionId },
    data: { revoked_at: toISOStringSafe(new Date()) },
  });
}
