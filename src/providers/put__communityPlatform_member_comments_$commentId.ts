import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update an existing comment by ID (community_platform_comments).
 *
 * Edit a comment by its ID, restricted to the comment's author. Payload must
 * contain only the fields allowed by business rules (content only). Content
 * must remain plain text, 2-2000 chars, no scripts. On successful update, the
 * edited flag is set to true, updated_at is refreshed, and an audit snapshot is
 * stored. If the comment does not exist or is deleted, throws 404. Edge cases
 * include update attempts by unauthorized users or invalid content input.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member making the request
 * @param props.commentId - The unique identifier of the comment to update
 * @param props.body - The payload containing new content to update
 * @returns The updated comment object reflecting all new/changed fields
 * @throws {Error} When the comment is not found, deleted, or when a non-author
 *   attempts update
 */
export async function put__communityPlatform_member_comments_$commentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  const { member, commentId, body } = props;
  // Fetch the comment and check not deleted
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: commentId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error("Comment not found");
  }
  if (comment.author_id !== member.id) {
    throw new Error("Unauthorized: Only the author can update their comment");
  }
  // Prepare update fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Update the comment
  const updated = await MyGlobal.prisma.community_platform_comments.update({
    where: { id: commentId },
    data: {
      content: body.content,
      edited: true,
      updated_at: now,
    },
  });
  // Insert audit snapshot
  await MyGlobal.prisma.community_platform_comment_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      comment_id: updated.id as string & tags.Format<"uuid">,
      post_id: updated.post_id as string & tags.Format<"uuid">,
      author_id: updated.author_id as string & tags.Format<"uuid">,
      parent_id: updated.parent_id ?? null,
      content: updated.content,
      edited: updated.edited,
      snapshot_reason: "edit",
      created_at: now,
    },
  });
  // Return updated comment, converting dates appropriately
  return {
    id: updated.id as string & tags.Format<"uuid">,
    post_id: updated.post_id as string & tags.Format<"uuid">,
    author_id: updated.author_id as string & tags.Format<"uuid">,
    parent_id: updated.parent_id ?? null,
    content: updated.content,
    edited: updated.edited,
    score: updated.score ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
