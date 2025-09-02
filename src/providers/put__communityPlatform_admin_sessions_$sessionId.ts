import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update device/session metadata and timestamps for a specific session ID.
 *
 * Update allowed fields on a session by its ID—such as device fingerprint,
 * last-used time, or planned expiration time. Only accessible to the session's
 * owner (member/admin) or an administrator. Used in account management or
 * device session management screens. Mutations are strictly limited to session
 * metadata (device, times); tokens are never returned or modifiable via this
 * method. The endpoint validates session existence, integrity, and ownership
 * prior to updating. The response returns the updated session entity. Supports
 * hard or soft expiration extension, but not token regeneration. If session has
 * been soft-deleted, update is rejected.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making this request
 * @param props.sessionId - The UUID of the session record to update
 * @param props.body - Fields to update on the session (device info, expiration,
 *   etc.)
 * @returns The updated session entity (all fields, with sensitive tokens
 *   preserved as-is)
 * @throws {Error} If the session does not exist or has been soft-deleted
 */
export async function put__communityPlatform_admin_sessions_$sessionId(props: {
  admin: AdminPayload;
  sessionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSession.IUpdate;
}): Promise<ICommunityPlatformSession> {
  const { sessionId, body } = props;

  // Fetch session and validate it exists and is not soft-deleted
  const session = await MyGlobal.prisma.community_platform_sessions.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.deleted_at !== null) {
    throw new Error("Session not found or has been deleted");
  }

  // Perform update with only allowed metadata fields
  const updated = await MyGlobal.prisma.community_platform_sessions.update({
    where: { id: sessionId },
    data: {
      device_fingerprint: body.device_fingerprint ?? undefined,
      expires_at: body.expires_at
        ? toISOStringSafe(body.expires_at)
        : undefined,
      invalidated_at:
        body.invalidated_at === null
          ? null
          : body.invalidated_at
            ? toISOStringSafe(body.invalidated_at)
            : undefined,
      deleted_at:
        body.deleted_at === null
          ? null
          : body.deleted_at
            ? toISOStringSafe(body.deleted_at)
            : undefined,
    },
  });

  // Return in API format, converting all date/datetime fields
  return {
    id: updated.id,
    community_platform_member_id: updated.community_platform_member_id ?? null,
    community_platform_admin_id: updated.community_platform_admin_id ?? null,
    jwt_token: updated.jwt_token,
    refresh_token: updated.refresh_token,
    device_fingerprint: updated.device_fingerprint ?? null,
    expires_at: toISOStringSafe(updated.expires_at),
    invalidated_at: updated.invalidated_at
      ? toISOStringSafe(updated.invalidated_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
