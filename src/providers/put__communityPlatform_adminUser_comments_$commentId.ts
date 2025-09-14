import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Update a comment's body or display name (community_platform_comments table)
 *
 * Allows an admin user to edit the content or display name of any existing
 * comment by unique ID. Enforces permission (admin role can always update any
 * comment). Accepts partial patch: body and/or display_name. Updates audit
 * timestamp. Returns the full comment details in standard format. Throws error
 * if not found. Performs all date handling as branded strings; does not use
 * Date type in domain types or anywhere except for immediate conversion.
 *
 * @param props - Parameters for the operation
 * @param props.adminUser - The authenticated admin user performing the update
 * @param props.commentId - The comment's unique identifier to update
 * @param props.body - Patch input, any of: body, display_name
 * @returns The updated comment in ICommunityPlatformComment format
 * @throws {Error} Comment not found with the specified commentId
 */
export async function put__communityPlatform_adminUser_comments_$commentId(props: {
  adminUser: AdminuserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.IUpdate;
}): Promise<ICommunityPlatformComment> {
  const { commentId, body } = props;

  // Fetch the original comment record
  const original = await MyGlobal.prisma.community_platform_comments.findUnique(
    { where: { id: commentId } },
  );
  if (!original) {
    throw new Error("Comment not found");
  }

  // Only patch allowed fields and audit timestamp
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_comments.update({
    where: { id: commentId },
    data: {
      body: body.body ?? undefined,
      display_name: body.display_name ?? undefined,
      updated_at: now,
    },
  });

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
