import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Soft-delete a comment and all its replies (recursive) by setting the
 * deleted_at field.
 *
 * Only admin users are permitted to perform this operation. This function finds
 * the target comment by ID, checks for existence, and then soft-deletes it
 * along with all child (nested) replies by setting their deleted_at timestamps
 * to the current time as ISO string (string & tags.Format<'date-time'>).
 *
 * The update is performed recursively via an explicit stack (DFS) to account
 * for arbitrary nesting.
 *
 * @param props - Object containing operation parameters
 * @param props.adminUser - The authenticated admin user (AdminuserPayload)
 *   making the request
 * @param props.commentId - Unique identifier (UUID) of the comment to be
 *   soft-deleted
 * @returns Void
 * @throws {Error} When the targeted comment does not exist
 */
export async function delete__communityPlatform_adminUser_comments_$commentId(props: {
  adminUser: AdminuserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { adminUser, commentId } = props;
  // Check for existence
  const parentComment =
    await MyGlobal.prisma.community_platform_comments.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
  if (!parentComment) {
    throw new Error("Comment not found");
  }
  // Prepare deleted_at value with ISO timestamp (never use Date fields in assignment)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  // Stack for DFS/BFS recursive cascade
  const stack: (string & tags.Format<"uuid">)[] = [commentId];
  while (stack.length > 0) {
    const currentId = stack.pop()!;
    // Update soft-delete flag
    await MyGlobal.prisma.community_platform_comments.update({
      where: { id: currentId },
      data: { deleted_at: deletedAt },
    });
    // Find direct children
    const children = await MyGlobal.prisma.community_platform_comments.findMany(
      {
        where: { parent_comment_id: currentId },
        select: { id: true },
      },
    );
    // Queue up their ids for further processing
    for (const child of children) {
      stack.push(child.id);
    }
  }
}
