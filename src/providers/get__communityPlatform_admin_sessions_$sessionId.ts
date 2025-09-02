import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves session details for a given session by sessionId. Allows an admin
 * to view all details for audit or support purposes, excluding soft-deleted
 * sessions by default.
 *
 * This endpoint enforces soft deletion: only sessions not marked as deleted
 * (deleted_at IS NULL) are returned. All ISO date handling is done via
 * toISOStringSafe. No native Date type is used.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.sessionId - The unique identifier of the session record
 * @returns ICommunityPlatformSession containing session metadata and device
 *   info
 * @throws {Error} When the session does not exist, is soft-deleted, or is
 *   inaccessible
 */
export async function get__communityPlatform_admin_sessions_$sessionId(props: {
  admin: AdminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSession> {
  const { admin, sessionId } = props;
  const session = await MyGlobal.prisma.community_platform_sessions.findFirst({
    where: {
      id: sessionId,
      deleted_at: null,
    },
  });
  if (!session) throw new Error("Session not found");
  return {
    id: session.id,
    community_platform_member_id: session.community_platform_member_id ?? null,
    community_platform_admin_id: session.community_platform_admin_id ?? null,
    jwt_token: session.jwt_token,
    refresh_token: session.refresh_token,
    device_fingerprint: session.device_fingerprint ?? null,
    expires_at: toISOStringSafe(session.expires_at),
    invalidated_at: session.invalidated_at
      ? toISOStringSafe(session.invalidated_at)
      : null,
    created_at: toISOStringSafe(session.created_at),
    deleted_at: session.deleted_at ? toISOStringSafe(session.deleted_at) : null,
  };
}
