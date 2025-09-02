import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing comment by ID (community_platform_comments).
 *
 * Allows an authenticated admin to modify the content of any comment. Sets
 * 'edited' to true, refreshes 'updated_at', and stores an audit snapshot.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin (authorization is required)
 * @param props.commentId - Unique comment ID to update
 * @param props.body - New content for the comment (plain text, 2-2000 chars)
 * @returns The updated comment as ICommunityPlatformComment.
 * @throws {Error} When the comment does not exist or has been deleted
 */
export async function put__communityPlatform_admin_comments_$commentId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  const { admin, commentId, body } = props;

  // 1. Fetch comment; ensure it exists and is not soft-deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: { id: commentId, deleted_at: null },
  });
  if (!comment) throw new Error("Comment not found or deleted");

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 2. Update comment: only content, edited, updated_at
  const updated = await MyGlobal.prisma.community_platform_comments.update({
    where: { id: commentId },
    data: {
      content: body.content,
      edited: true,
      updated_at: now,
    },
  });

  // 3. Store audit snapshot row
  await MyGlobal.prisma.community_platform_comment_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      comment_id: updated.id,
      post_id: updated.post_id,
      author_id: updated.author_id,
      parent_id: updated.parent_id ?? null,
      content: updated.content,
      edited: updated.edited,
      snapshot_reason: "edit_by_admin",
      created_at: now,
    },
  });

  // 4. Return in DTO format with all fields mapped (properly handle Date and nullables)
  return {
    id: updated.id,
    post_id: updated.post_id,
    author_id: updated.author_id,
    parent_id: updated.parent_id ?? null,
    content: updated.content,
    edited: updated.edited,
    score: updated.score ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
