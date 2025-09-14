import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Create a new top-level comment or a reply on a post, for authenticated users.
 *
 * Allows an authenticated member user to create a comment for a post or as a
 * nested reply. This enforces business logic regarding authentication, content
 * validation, and reply thread constraints for platform compliance.
 *
 * This operation verifies post existence and status, validates parent comment
 * relationships if replying, and applies all required logic for minimum/maximum
 * comment body length. Only the authenticated member user may own the resulting
 * comment, and all timestamps and foreign keys are resolved per the platform
 * contract.
 *
 * @param props - Request properties
 * @param props.memberUser - The authenticated member user creating the comment
 * @param props.body - The payload for creating the comment (post_id, body,
 *   display_name, parent_comment_id optional)
 * @returns The newly created comment, matching ICommunityPlatformComment
 * @throws {Error} If authentication is missing or invalid
 * @throws {Error} If the post is not found or is deleted
 * @throws {Error} If the parent comment does not exist, is in a different post,
 *   or is deleted
 * @throws {Error} If the body of the comment is not plain text or is not within
 *   allowed length
 */
export async function post__communityPlatform_memberUser_comments(props: {
  memberUser: MemberuserPayload;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  const { memberUser, body } = props;

  // Ensure authenticated member user
  if (!memberUser || !memberUser.id) {
    throw new Error("Authentication required: member user not found");
  }

  // Validate the referenced post exists and is active (not deleted)
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: body.post_id,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new Error("Post does not exist or has been deleted");
  }

  // If replying, validate parent comment existence and context
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
      throw new Error("Parent comment not found in this post or is deleted");
    }
  }

  // Validate business rules for comment body
  const commentBody = body.body;
  if (
    typeof commentBody !== "string" ||
    commentBody.length < 2 ||
    commentBody.length > 2000
  ) {
    throw new Error("Comment body must be plain text with 2–2000 characters.");
  }

  // Generate new IDs and timestamps
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Insert comment
  const created = await MyGlobal.prisma.community_platform_comments.create({
    data: {
      id,
      post_id: body.post_id,
      parent_comment_id: body.parent_comment_id ?? null,
      author_memberuser_id: memberUser.id,
      author_guestuser_id: null,
      author_adminuser_id: null,
      body: body.body,
      display_name: body.display_name ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      post_id: true,
      parent_comment_id: true,
      author_memberuser_id: true,
      author_guestuser_id: true,
      author_adminuser_id: true,
      body: true,
      display_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  // Build DTO, ensuring all date/id fields are proper string & tags.Format
  return {
    id: created.id,
    post_id: created.post_id,
    parent_comment_id: created.parent_comment_id ?? undefined,
    author_memberuser_id: created.author_memberuser_id ?? undefined,
    author_guestuser_id: created.author_guestuser_id ?? undefined,
    author_adminuser_id: created.author_adminuser_id ?? undefined,
    body: created.body,
    display_name: created.display_name ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
