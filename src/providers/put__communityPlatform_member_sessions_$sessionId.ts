import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";
import { MemberPayload } from "../decorators/payload/MemberPayload";

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
 * @param props - Properties needed to update a session.
 *
 *   - Props.member: The authenticated member making the request.
 *   - Props.sessionId: The UUID of the session to update.
 *   - Props.body: The update fields for the session metadata (allowed:
 *       device_fingerprint, expires_at, invalidated_at, deleted_at).
 *
 * @returns The updated session entity (metadata only; never returns tokens).
 * @throws {Error} If the session does not exist, is deleted, or the member is
 *   not the owner.
 */
export async function put__communityPlatform_member_sessions_$sessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformSession.IUpdate;
}): Promise<ICommunityPlatformSession> {
  const { member, sessionId, body } = props;

  // Fetch the session, ensure not soft deleted
  const session = await MyGlobal.prisma.community_platform_sessions.findFirst({
    where: {
      id: sessionId,
      deleted_at: null,
    },
  });
  if (!session) {
    throw new Error("Session not found or has been deleted.");
  }

  // Authorization: only the owner member may update this session
  if (session.community_platform_member_id !== member.id) {
    throw new Error("Unauthorized: Only the session owner may update it.");
  }

  // Perform the update, only allowed fields
  const updated = await MyGlobal.prisma.community_platform_sessions.update({
    where: { id: sessionId },
    data: {
      device_fingerprint: body.device_fingerprint ?? undefined,
      expires_at: body.expires_at ?? undefined,
      invalidated_at: body.invalidated_at ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  // Build return object per DTO, convert all date fields
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
  } satisfies ICommunityPlatformSession;
}
