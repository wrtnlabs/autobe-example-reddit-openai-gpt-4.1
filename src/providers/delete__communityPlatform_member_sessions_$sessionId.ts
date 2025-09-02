import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Soft deletes (invalidates) a session by ID for a member; immediate logout
 * effect.
 *
 * This operation sets the session's deleted_at field with the current timestamp
 * (soft delete), immediately invalidating the associated JWT and refresh
 * tokens. Only the session's owner (authenticated member) may perform this
 * action. If the session does not exist, is already deleted, or is not owned by
 * the member, an error is thrown. The record remains for audit and logging;
 * removal is not possible. Used for self-logout or forced account/device
 * logout.
 *
 * @param props - The function props.
 * @param props.member - Authenticated member payload performing the operation.
 * @param props.sessionId - The unique identifier of the session to invalidate.
 * @returns Void
 * @throws {Error} If the session does not exist, is already deleted, or is not
 *   owned by the member.
 */
export async function delete__communityPlatform_member_sessions_$sessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, sessionId } = props;
  // Step 1: Find the specified session, only if active (not deleted)
  const session = await MyGlobal.prisma.community_platform_sessions.findFirst({
    where: {
      id: sessionId,
      deleted_at: null,
    },
  });
  if (!session) {
    throw new Error("Session not found or already deleted");
  }
  // Step 2: Enforce member ownership
  if (session.community_platform_member_id !== member.id) {
    throw new Error(
      "Unauthorized: Only the session owner may delete this session",
    );
  }
  // Step 3: Soft-delete (invalidate) the session with current timestamp
  await MyGlobal.prisma.community_platform_sessions.update({
    where: { id: sessionId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
