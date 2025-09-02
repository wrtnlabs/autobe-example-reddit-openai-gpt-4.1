import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a specific post snapshot (version) by its snapshotId and parent
 * postId (admin only).
 *
 * This endpoint allows an authenticated admin to fetch the full immutable
 * details of a particular revision snapshot of a post, as identified by both
 * postId and snapshotId. Only admins may access any historical post snapshot
 * for moderation, rollback, or audit history. The operation is strictly
 * read-only.
 *
 * @param props - Request parameters
 * @param props.admin - Authenticated admin performing the access check and API
 *   call
 * @param props.postId - The UUID of the parent post to which the snapshot
 *   belongs
 * @param props.snapshotId - The UUID of the specific snapshot/revision to
 *   retrieve
 * @returns Full details of the specified post snapshot revision, including
 *   title, body, author, and timestamps
 * @throws {Error} If no such post snapshot exists, or if IDs don't match any
 *   record
 */
export async function get__communityPlatform_admin_posts_$postId_snapshots_$snapshotId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostSnapshot> {
  const { postId, snapshotId } = props;
  const snapshot =
    await MyGlobal.prisma.community_platform_post_snapshots.findFirstOrThrow({
      where: {
        id: snapshotId,
        community_platform_post_id: postId,
      },
      select: {
        id: true,
        community_platform_post_id: true,
        community_platform_member_id: true,
        title: true,
        body: true,
        author_display_name: true,
        created_at: true,
      },
    });

  return {
    id: snapshot.id,
    community_platform_post_id: snapshot.community_platform_post_id,
    community_platform_member_id: snapshot.community_platform_member_id,
    title: snapshot.title,
    body: snapshot.body,
    author_display_name: snapshot.author_display_name,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
