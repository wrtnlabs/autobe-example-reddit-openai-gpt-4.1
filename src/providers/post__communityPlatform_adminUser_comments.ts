import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Create a new top-level comment or a reply on a post, for authenticated admin
 * users.
 *
 * This operation allows an authenticated admin user to create a comment on a
 * post or as a reply to another comment. It enforces all business rules, such
 * as verifying post and parent comment existence, soft-deletion status, comment
 * content length, and proper field typing and null-propagation. The
 * author_adminuser_id is set to the authenticated admin.
 *
 * @param props - Object containing the adminUser payload and the comment
 *   creation request body
 * @param props.adminUser - Authenticated admin user's JWT payload
 *   (community_platform_adminusers.id, type: 'adminUser')
 * @param props.body - New comment creation request: post_id, optional
 *   parent_comment_id, body, display_name
 * @returns The created comment as ICommunityPlatformComment (returning all
 *   comment fields)
 * @throws {Error} If post does not exist or is deleted
 * @throws {Error} If parent comment does not exist, belongs to a different
 *   post, or is deleted
 * @throws {Error} If comment body does not meet validation constraints
 */
export async function post__communityPlatform_adminUser_comments(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  const { adminUser, body } = props;

  // 1. Check that the referenced post exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: body.post_id,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new Error("Post does not exist or has been deleted");
  }

  // 2. If parent_comment_id provided, check that parent exists, matches the same post, and is not soft-deleted
  if (body.parent_comment_id !== undefined && body.parent_comment_id !== null) {
    const parentComment =
      await MyGlobal.prisma.community_platform_comments.findFirst({
        where: {
          id: body.parent_comment_id,
          post_id: body.post_id,
          deleted_at: null,
        },
      });
    if (!parentComment) {
      throw new Error(
        "Parent comment not found, deleted, or does not belong to the same post",
      );
    }
  }

  // 3. Enforce business rule: body must be between 2 and 2000 characters (plain text assumed per validation spec)
  const commentBody = body.body;
  if (
    typeof commentBody !== "string" ||
    commentBody.length < 2 ||
    commentBody.length > 2000
  ) {
    throw new Error("Comment body must be between 2 and 2000 characters");
  }

  // 4. Set all DB fields (use toISOStringSafe for dates, v4 for ID)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const commentId: string & tags.Format<"uuid"> = v4();
  const created = await MyGlobal.prisma.community_platform_comments.create({
    data: {
      id: commentId,
      post_id: body.post_id,
      parent_comment_id: body.parent_comment_id ?? null,
      author_adminuser_id: adminUser.id,
      body: commentBody,
      display_name: body.display_name ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // 5. Format return DTO (convert dates to ISO strings, propagate all nullable fields per interface)
  return {
    id: created.id,
    post_id: created.post_id,
    parent_comment_id: created.parent_comment_id ?? null,
    author_memberuser_id: created.author_memberuser_id ?? null,
    author_guestuser_id: created.author_guestuser_id ?? null,
    author_adminuser_id: created.author_adminuser_id ?? null,
    body: created.body,
    display_name: created.display_name ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
