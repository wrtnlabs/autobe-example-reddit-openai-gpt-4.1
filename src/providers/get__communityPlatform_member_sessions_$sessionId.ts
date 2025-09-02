import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieves details about a specific member session by sessionId.
 *
 * Enables members to view their own session info, device fingerprint,
 * expiration, state, and timestamps for security auditing and device
 * management. Authorization is strictly enforced: a member may only view
 * sessions with community_platform_member_id equal to their own member.id.
 * Soft-deleted sessions (deleted_at not null) are excluded. Dates are always
 * returned as ISO 8601 strings.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member requesting their session info
 * @param props.sessionId - The UUID of the session to look up
 * @returns Full details of the session, with all date fields as ISO 8601
 *   strings
 * @throws {Error} If the session does not exist or does not belong to the
 *   member
 */
export async function get__communityPlatform_member_sessions_$sessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSession> {
  const { member, sessionId } = props;

  const session = await MyGlobal.prisma.community_platform_sessions.findFirst({
    where: { id: sessionId, deleted_at: null },
    select: {
      id: true,
      community_platform_member_id: true,
      community_platform_admin_id: true,
      jwt_token: true,
      refresh_token: true,
      device_fingerprint: true,
      expires_at: true,
      invalidated_at: true,
      created_at: true,
      deleted_at: true,
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  // Only allow the member who owns the session to view it
  if (
    !session.community_platform_member_id ||
    session.community_platform_member_id !== member.id
  ) {
    throw new Error("Forbidden: You may only view your own session");
  }

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
