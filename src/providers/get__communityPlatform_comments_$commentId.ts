import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

/**
 * Retrieve detailed information about a specific comment by its unique ID.
 *
 * Fetches a single comment record from the community_platform_comments table,
 * mapped to the ICommunityPlatformComment structure. Includes all scalar
 * fields: IDs, parent relationships, author references, body, display_name,
 * timestamps, and soft-delete status.
 *
 * Access is publicly available. Only comments that exist (including soft
 * deleted) will be returned; not-found errors are surfaced. Date fields are
 * returned as ISO8601 strings using toISOStringSafe().
 *
 * @param props - Object containing required parameters for this endpoint
 * @param props.commentId - Unique identifier (UUID) of the comment to retrieve
 * @returns ICommunityPlatformComment record with all fields, or throws if not
 *   found
 * @throws {Prisma.NotFoundError} If no comment exists for the given ID
 */
export async function get__communityPlatform_comments_$commentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  const { commentId } = props;
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: commentId },
    });

  return {
    id: comment.id,
    post_id: comment.post_id,
    parent_comment_id: comment.parent_comment_id ?? undefined,
    author_memberuser_id: comment.author_memberuser_id ?? undefined,
    author_guestuser_id: comment.author_guestuser_id ?? undefined,
    author_adminuser_id: comment.author_adminuser_id ?? undefined,
    body: comment.body,
    display_name: comment.display_name ?? undefined,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
