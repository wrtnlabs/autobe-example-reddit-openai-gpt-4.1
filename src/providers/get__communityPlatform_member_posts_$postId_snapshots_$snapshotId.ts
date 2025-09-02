import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve a specific post snapshot (version) for a post by snapshotId.
 *
 * This endpoint returns the full details of one immutable revision snapshot for
 * a specified post, as identified by both postId and snapshotId. Only the
 * post's original author (current member) is allowed to view this snapshot.
 *
 * @param props - Request properties
 * @param props.member - The currently authenticated platform member (must be
 *   the post author to access)
 * @param props.postId - The UUID of the post to which this snapshot belongs
 * @param props.snapshotId - The UUID of the specific snapshot revision to
 *   retrieve
 * @returns Full details of the selected post snapshot version as captured at
 *   the time
 * @throws {Error} When the snapshot is not found or the member is not the post
 *   author
 */
export async function get__communityPlatform_member_posts_$postId_snapshots_$snapshotId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostSnapshot> {
  const { member, postId, snapshotId } = props;
  // Query for the snapshot matching both snapshotId (id) and postId
  const snapshot =
    await MyGlobal.prisma.community_platform_post_snapshots.findFirst({
      where: {
        id: snapshotId,
        community_platform_post_id: postId,
      },
    });
  if (!snapshot) {
    throw new Error("Snapshot not found");
  }
  // Only allow the original author (by member id) to see the snapshot
  if (snapshot.community_platform_member_id !== member.id) {
    throw new Error("Forbidden: Only the post's author can view this snapshot");
  }
  return {
    id: snapshot.id,
    community_platform_post_id: snapshot.community_platform_post_id,
    community_platform_member_id: snapshot.community_platform_member_id,
    title: snapshot.title,
    body: snapshot.body,
    author_display_name: snapshot.author_display_name ?? null,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
