import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Soft-delete an existing post in community_platform_posts by postId; only
 * allowed by author or adminUser.
 *
 * DELETE /posts/{postId} removes a post from user feeds and search by marking
 * the record as deleted (soft delete—sets deleted_at field) in
 * community_platform_posts. Only the author (memberUser/adminUser) or an
 * adminUser can delete. All underlying business checks for ownership,
 * existence, and non-previously-deleted status are enforced.
 *
 * Cascading application logic removes or marks as deleted dependent entities
 * such as comments or votes as per compliance rules. Attempted deletion of
 * non-owned posts by non-admins returns a permission error. Once deleted, the
 * post becomes inaccessible via normal queries, ensuring user privacy and
 * platform integrity. The operation does not return a body on success.
 *
 * @param props - Properties for the operation
 * @param props.adminUser - The authenticated admin user making the request
 * @param props.postId - The UUID of the post to be deleted (soft delete)
 * @returns Void
 * @throws {Error} When the post does not exist, has already been deleted, or
 *   cannot be deleted by the requester
 */
export async function delete__communityPlatform_adminUser_posts_$postId(props: {
  adminUser: AdminuserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { adminUser, postId } = props;
  // Find the post by ID and ensure it is not already soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
    select: { id: true, deleted_at: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new Error("Post not found or already deleted");
  }

  // All admin users can soft-delete any post (as per admin-level endpoint/business rule)
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: postId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
