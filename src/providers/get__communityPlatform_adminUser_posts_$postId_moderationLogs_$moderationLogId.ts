import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostModerationLog";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Retrieve detailed information for a specific post moderation log entry by ID.
 *
 * Fetches detailed information about a single moderation log entry for a given
 * post. Only admin users may call this function. Returns all log properties for
 * full audit/compliance.
 *
 * @param props - Request properties for log retrieval
 * @param props.adminUser - Authenticated admin user (AdminuserPayload) making
 *   the request
 * @param props.postId - UUID of the post whose moderation log is being queried
 * @param props.moderationLogId - UUID of the moderation log entry to fetch
 * @returns ICommunityPlatformPostModerationLog: The detailed moderation log for
 *   the specified post/log id
 * @throws {Error} If no moderation log is found or it does not belong to the
 *   specified post
 */
export async function get__communityPlatform_adminUser_posts_$postId_moderationLogs_$moderationLogId(props: {
  adminUser: AdminuserPayload;
  postId: string & tags.Format<"uuid">;
  moderationLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostModerationLog> {
  const { adminUser, postId, moderationLogId } = props;
  // Fetch the moderation log entry by id
  const log =
    await MyGlobal.prisma.community_platform_post_moderation_logs.findUnique({
      where: { id: moderationLogId },
    });
  if (!log) {
    throw new Error("Moderation log not found");
  }
  if (log.community_platform_post_id !== postId) {
    throw new Error("Moderation log does not belong to the specified post");
  }
  return {
    id: log.id,
    community_platform_post_id: log.community_platform_post_id,
    performed_adminuser_id: log.performed_adminuser_id,
    action_type: log.action_type,
    action_reason: log.action_reason ?? undefined,
    created_at: toISOStringSafe(log.created_at),
  };
}
