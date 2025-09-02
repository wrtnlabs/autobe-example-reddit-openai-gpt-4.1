import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Delete a comment (soft delete, community_platform_comments table).
 *
 * Deletes a comment by its unique ID. Only the comment's author may perform
 * this operation; guests and non-authors are forbidden. The operation performs
 * a soft delete by setting `deleted_at`, retains the row for audit/logs, and
 * also cascades the soft-delete to all descendant (child) comments and deletes
 * all votes associated with the thread (target plus all descendants). If the
 * comment does not exist or is already deleted, throws a 404 error. All
 * operations are performed in a single transaction to guarantee data
 * consistency.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member performing the deletion
 * @param props.commentId - Unique identifier of the comment to delete
 * @returns Void
 * @throws {Error} If the comment does not exist, is already deleted, or the
 *   current member is not the author
 */
export async function delete__communityPlatform_member_comments_$commentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, commentId } = props;
  // Use transaction for atomic multi-table updates
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1: Fetch the comment (and minimal fields)
    const comment = await tx.community_platform_comments.findFirst({
      where: {
        id: commentId,
        deleted_at: null,
      },
      select: {
        id: true,
        author_id: true,
      },
    });
    if (!comment) throw new Error("Comment not found or already deleted");
    if (comment.author_id !== member.id) {
      throw new Error(
        "Unauthorized: Only the comment author can delete the comment",
      );
    }
    const now = toISOStringSafe(new Date());
    // Step 2: Collect all descendant comment IDs (recursive)
    const idsToDelete: string[] = [commentId];
    let nextIds: string[] = [commentId];
    while (nextIds.length > 0) {
      const children = await tx.community_platform_comments.findMany({
        where: {
          parent_id: { in: nextIds },
          deleted_at: null,
        },
        select: { id: true },
      });
      const foundIds = children.map((c) => c.id);
      if (foundIds.length === 0) break;
      idsToDelete.push(...foundIds);
      nextIds = foundIds;
    }
    // Step 3: Soft delete all (update deleted_at)
    await tx.community_platform_comments.updateMany({
      where: {
        id: { in: idsToDelete },
        deleted_at: null,
      },
      data: { deleted_at: now },
    });
    // Step 4: Remove all votes for these comments
    await tx.community_platform_votes.deleteMany({
      where: {
        comment_id: { in: idsToDelete },
      },
    });
  });
  return;
}
