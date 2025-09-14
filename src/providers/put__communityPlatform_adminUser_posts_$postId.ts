import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Update a post's title, body, or display name in community_platform_posts by
 * postId.
 *
 * This endpoint allows an authenticated admin user to edit any post, or an
 * admin-author to edit their own post. The operation verifies the post exists,
 * is not deleted (deleted_at is null), and ownership for non-admin edits. Only
 * the title, body, and author_display_name fields may be updated; all others
 * are immutable. Date values are always returned as ISO 8601 branded strings.
 *
 * @param props - Request object for the admin post update operation
 * @param props.adminUser - The authenticated admin user making the request
 *   (AdminuserPayload)
 * @param props.postId - UUID of the post to update
 * @param props.body - Update fields: title, body, and/or author_display_name
 *   (ICommunityPlatformPost.IUpdate)
 * @returns The updated post object, with all date fields properly branded as
 *   ISO strings
 * @throws {Error} If the post does not exist, is deleted, or the user is
 *   unauthorized to update the post
 */
export async function put__communityPlatform_adminUser_posts_$postId(props: {
  adminUser: AdminuserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  const { adminUser, postId, body } = props;

  // Locate the post; must exist and not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new Error("Post not found or has been deleted");
  }

  // Allow update if adminUser is the author_adminuser_id or any admin
  // (since only admins can call this endpoint, always allowed)
  // Optionally, ensure only author may update if desired for extra restrictions
  //   (here, any adminUser can edit any post)

  // Perform the update: only allowed fields; updated_at must be set to now
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.community_platform_posts.update({
    where: { id: postId },
    data: {
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      author_display_name: body.author_display_name ?? undefined,
      updated_at: now,
    },
  });

  // Return post in ICommunityPlatformPost format, with branded date strings
  return {
    id: updated.id,
    community_platform_community_id: updated.community_platform_community_id,
    author_memberuser_id: updated.author_memberuser_id ?? undefined,
    author_adminuser_id: updated.author_adminuser_id ?? undefined,
    title: updated.title,
    body: updated.body,
    author_display_name: updated.author_display_name ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
