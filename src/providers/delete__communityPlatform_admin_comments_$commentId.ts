import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a comment (soft delete, community_platform_comments table).
 *
 * This operation performs a soft-delete of the specified comment by setting its
 * deleted_at field, along with all descendant (threaded) comments and their
 * associated votes. Only accessible by administrators. If the comment does not
 * exist or is already deleted, an error is thrown. Guests cannot invoke this
 * endpoint.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the operation
 * @param props.commentId - Unique identifier (UUID) of the comment to delete
 * @returns Void
 * @throws {Error} When the comment is not found or already deleted
 */
export async function delete__communityPlatform_admin_comments_$commentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, commentId } = props;

  // 1. Check the comment exists and is not already deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: commentId,
      deleted_at: null,
    },
  });
  if (!comment) throw new Error("Comment not found or already deleted");

  // 2. Recursively find all descendants using iterative BFS (breadth-first)
  //    Accumulate all ids in the deletion cascade, including the parent
  let idsToDelete: (string & tags.Format<"uuid">)[] = [commentId];
  let processed = 0;
  while (processed < idsToDelete.length) {
    const currentParentIds = idsToDelete.slice(processed);
    const children = await MyGlobal.prisma.community_platform_comments.findMany(
      {
        where: {
          parent_id: { in: currentParentIds },
          deleted_at: null,
        },
        select: { id: true },
      },
    );
    const newIds = children
      .map((c) => c.id as string & tags.Format<"uuid">)
      .filter((id) => !idsToDelete.includes(id));
    idsToDelete = idsToDelete.concat(newIds);
    processed = idsToDelete.length - newIds.length;
  }

  if (idsToDelete.length === 0) return; // Nothing to delete (shouldn't happen)

  // 3. Soft-delete all comments in the thread (set deleted_at)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_comments.updateMany({
    where: { id: { in: idsToDelete } },
    data: { deleted_at: now },
  });

  // 4. Soft-delete all votes associated with these comments (if any)
  await MyGlobal.prisma.community_platform_votes.updateMany({
    where: {
      comment_id: { in: idsToDelete },
      deleted_at: null,
    },
    data: { deleted_at: now },
  });

  // Note: Further cascading (snapshots, etc.) is not soft-deleted (audit trail is preserved).
  // 5. Done - return void
  return;
}
