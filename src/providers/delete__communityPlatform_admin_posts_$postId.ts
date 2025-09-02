import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete the specified community post by postId (set deleted_at).
 *
 * This operation soft deletes a specific post on the community platform,
 * setting the 'deleted_at' column of community_platform_posts. Only admin users
 * may invoke this operation via the admin panel. Soft deletion ensures the post
 * is hidden from main feeds but remains in DB for audit. Comments, votes, and
 * moderation data are handled by downstream business logic.
 *
 * @param props - Request parameters
 * @param props.admin - The authenticated admin user performing the operation
 * @param props.postId - The UUID of the post to be soft deleted
 * @returns Void
 * @throws {Error} When the post does not exist or is already deleted
 */
export async function delete__communityPlatform_admin_posts_$postId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { postId } = props;

  // Step 1: Find post by id and ensure it's not already deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new Error("Post not found or already deleted");
  }

  // Step 2: Mark post as soft deleted
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: postId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
