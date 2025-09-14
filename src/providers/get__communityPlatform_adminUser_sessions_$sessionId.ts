import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Get details of a session (community_platform_sessions).
 *
 * Retrieves full details for a specific session record by its UUID. Only admin
 * users are authorized to access this endpoint. Session includes metadata for
 * session management, auditing, and security analysis. Date fields are all
 * normalized to ISO8601-typed strings for API response.
 *
 * @param props - AdminUser: Authenticated admin user (AdminuserPayload, already
 *   authenticated and authorized) sessionId: UUID of the session to retrieve
 * @returns Session metadata and tracking fields as ICommunityPlatformSession
 * @throws {Error} If session is not found with the provided UUID
 */
export async function get__communityPlatform_adminUser_sessions_$sessionId(props: {
  adminUser: AdminuserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSession> {
  const { sessionId } = props;
  const session =
    await MyGlobal.prisma.community_platform_sessions.findFirstOrThrow({
      where: { id: sessionId },
    });
  return {
    id: session.id,
    user_id: session.user_id,
    token: session.token,
    issued_at: toISOStringSafe(session.issued_at),
    expires_at: toISOStringSafe(session.expires_at),
    device_info: session.device_info ?? undefined,
    ip_address: session.ip_address ?? undefined,
    revoked_at:
      session.revoked_at !== null && session.revoked_at !== undefined
        ? toISOStringSafe(session.revoked_at)
        : undefined,
    created_at: toISOStringSafe(session.created_at),
  };
}
