import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Fetch detailed information for a comment by ID (community_platform_comments).
 *
 * Retrieve all details for a specific comment, as identified by its commentId.
 * Any user can fetch public comments; only comments not logically deleted
 * (deleted_at is null) are returned by this endpoint. Returns 404 if the
 * comment does not exist or is logically deleted. Includes content, author,
 * parent (if any), post, timestamps, edit status, score, and logical deletion
 * state.
 *
 * @param props - Request properties
 * @param props.commentId - Unique identifier of the comment to retrieve (UUID)
 * @returns The full comment object with all relevant fields as per
 *   ICommunityPlatformComment
 * @throws {Error} When the comment does not exist or is deleted (returns 404
 *   semantics)
 */
export async function get__communityPlatform_comments_$commentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error("Comment not found");
  }
  return {
    id: comment.id,
    post_id: comment.post_id,
    author_id: comment.author_id,
    parent_id: comment.parent_id ?? undefined,
    content: comment.content,
    edited: comment.edited,
    score: comment.score ?? undefined,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
