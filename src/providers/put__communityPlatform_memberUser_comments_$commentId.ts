import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Update a comment's body or display name (community_platform_comments table)
 *
 * This endpoint allows an authenticated member user to edit their own comment's
 * text or author display name. Only the original author of the comment may
 * perform this action. The update is limited to body and display_name fields.
 * The operation is denied if the comment is deleted, does not exist, or is not
 * authored by the requesting user. Edits are tracked with an updated updated_at
 * timestamp.
 *
 * @param props - Object containing the authenticated user, comment ID, and
 *   update body
 * @param props.memberUser - The authenticated member user performing the update
 * @param props.commentId - The unique UUID of the comment to patch
 * @param props.body - The partial payload specifying text/display_name to
 *   update
 * @returns The updated ICommunityPlatformComment object
 * @throws {Error} When the comment does not exist, is deleted, or the user is
 *   not the author
 */
export async function put__communityPlatform_memberUser_comments_$commentId(props: {
  memberUser: MemberuserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  const { memberUser, commentId, body } = props;

  // Find the target comment (not deleted)
  const comment = await MyGlobal.prisma.community_platform_comments.findFirst({
    where: {
      id: commentId,
      deleted_at: null,
    },
  });
  if (!comment) {
    throw new Error("Comment not found or already deleted");
  }

  // Author guard: only the original author (member user) may patch
  if (comment.author_memberuser_id !== memberUser.id) {
    throw new Error("You are not the author of this comment");
  }

  // Patch only provided and valid fields, as per schema
  // Empty display_name means 'Anonymous' (sets null)
  const patch: {
    body?: string;
    display_name?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (body.body !== undefined) {
    patch.body = body.body;
  }
  if (body.display_name !== undefined) {
    patch.display_name = body.display_name === "" ? null : body.display_name;
  }

  // Update comment with patch
  const updated = await MyGlobal.prisma.community_platform_comments.update({
    where: { id: commentId },
    data: patch,
  });

  // Return normalized API DTO result
  return {
    id: updated.id,
    post_id: updated.post_id,
    parent_comment_id: updated.parent_comment_id ?? undefined,
    author_memberuser_id: updated.author_memberuser_id ?? undefined,
    author_guestuser_id: updated.author_guestuser_id ?? undefined,
    author_adminuser_id: updated.author_adminuser_id ?? undefined,
    body: updated.body,
    display_name: updated.display_name ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
