import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Soft-delete an existing community platform post by postId (memberUser author
 * only).
 *
 * This operation marks the specified post as deleted by setting its
 * `deleted_at` field. Only the post's author (as member user, not admin) may
 * perform this action through this provider. If the post does not exist, has
 * already been deleted, or the current memberUser is not the author, the
 * operation throws an error. On success, the post is removed from feeds and
 * search but recoverable. No associations are affected directly; cascading
 * business logic is handled elsewhere.
 *
 * @param props - Operation parameters
 * @param props.memberUser - Authenticated MemberuserPayload (must be the
 *   author)
 * @param props.postId - UUID of the post to soft-delete
 * @returns Void
 * @throws {Error} If post does not exist, is already deleted, or the user is
 *   not the author
 */
export async function delete__communityPlatform_memberUser_posts_$postId(props: {
  memberUser: MemberuserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { memberUser, postId } = props;

  // Find the post by ID, only if not already deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      author_memberuser_id: true,
    },
  });
  if (!post) throw new Error("Post not found or already deleted");

  // Only allow deletion by the author (as memberUser)
  if (post.author_memberuser_id !== memberUser.id) {
    throw new Error("Permission denied: Only the author can delete this post");
  }

  // Soft-delete by updating deleted_at (strictly ISO string with correct brand)
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: postId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
