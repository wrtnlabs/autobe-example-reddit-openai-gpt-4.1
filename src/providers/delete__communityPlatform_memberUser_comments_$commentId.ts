import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Soft-delete a comment by ID (member user's own comment, including all
 * replies).
 *
 * This endpoint allows an authenticated member user to soft-delete their own
 * comment and all recursive replies/minions from the platform, as required for
 * compliance, moderation, and business policy. The operation is authorized for
 * the comment's original author only. All affected comments have their
 * deleted_at timestamp set to the current time, meaning they are hidden from
 * standard access but preserved for audit and compliance requirements. Attempts
 * to delete comments authored by others, or already deleted comments, will fail
 * with an error. The descendant search is application-level and handled
 * recursively.
 *
 * @param props - Object containing request context
 * @param props.memberUser - Authenticated member user payload; must match
 *   author of the comment
 * @param props.commentId - Unique identifier of the comment to soft-delete
 * @returns Void
 * @throws {Error} When comment is not found, is already deleted, or user is not
 *   the comment author
 */
export async function delete__communityPlatform_memberUser_comments_$commentId(props: {
  memberUser: MemberuserPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Lookup the target comment, ensure it is not deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: { id: props.commentId, deleted_at: null },
    select: { id: true, author_memberuser_id: true },
  });
  if (!comment) throw new Error("Comment not found or already deleted");
  if (comment.author_memberuser_id !== props.memberUser.id) {
    throw new Error("Forbidden: You are not the author of this comment");
  }

  // 2. Recursively collect all descendant comment IDs to be soft-deleted
  const gatherDescendants = async (parentIds: string[]): Promise<string[]> => {
    const children = await MyGlobal.prisma.community_platform_comments.findMany(
      {
        where: { parent_comment_id: { in: parentIds }, deleted_at: null },
        select: { id: true },
      },
    );
    if (children.length === 0) return [];
    const childIds = children.map((child) => child.id);
    const grandchildIds = await gatherDescendants(childIds);
    return [...childIds, ...grandchildIds];
  };
  const descendantIds = await gatherDescendants([props.commentId]);
  const idsToDelete = [props.commentId, ...descendantIds];

  // 3. Perform soft-delete by setting deleted_at for all found IDs
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_comments.updateMany({
    where: { id: { in: idsToDelete } },
    data: { deleted_at: now },
  });
}
