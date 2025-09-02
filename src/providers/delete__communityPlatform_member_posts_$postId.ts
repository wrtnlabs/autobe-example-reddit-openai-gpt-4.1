import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Soft delete the specified community post by postId (set deleted_at).
 *
 * This operation soft deletes a specific post on the community platform,
 * setting the 'deleted_at' column of community_platform_posts. Only the post's
 * author (member) is permitted to perform this action via this endpoint. Soft
 * deletion ensures the post is hidden from the main feed but remains in the
 * database for compliance, audit, and possible future restoration. Comments,
 * votes, and related moderation data must be handled as per cascade rules in
 * downstream business logic. Attempts to delete already-deleted or unauthorized
 * posts result in an error. Administrative undelete/recovery is handled
 * separately.
 *
 * @param props - The operation properties.
 * @param props.member - The authenticated member payload (must match post
 *   author).
 * @param props.postId - The unique identifier (UUID) of the post to delete
 *   (soft delete).
 * @returns Resolves with void on successful soft delete.
 * @throws {Error} If the post does not exist, is already deleted, or the member
 *   is not the author.
 */
export async function delete__communityPlatform_member_posts_$postId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, postId } = props;

  // 1. Find the post, only if not already soft deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true, community_platform_member_id: true },
  });
  if (!post) throw new Error("Post not found or already deleted");

  // 2. Authorization: member must be the author
  if (post.community_platform_member_id !== member.id) {
    throw new Error("Unauthorized: Only the author can delete this post");
  }

  // 3. Soft-delete: set deleted_at to current timestamp (ISO string)
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: postId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
