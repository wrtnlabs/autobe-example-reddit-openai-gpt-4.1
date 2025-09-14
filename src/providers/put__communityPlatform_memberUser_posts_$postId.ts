import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

/**
 * Update a post's title, body, or display name in community_platform_posts by
 * postId.
 *
 * This operation allows an authenticated member user to edit their own post.
 * Only the original author (member user) may update their post; admin
 * privileges do not apply here. The function checks post existence, non-deleted
 * state, and authorship. On successful update, it returns the updated post in
 * the response DTO format. Only the title, body, and author_display_name fields
 * are updatable; other mutations are forbidden.
 *
 * @param props - The request properties for the update operation
 * @param props.memberUser - JWT payload of the authenticated member user
 *   (author, required)
 * @param props.postId - The UUID of the post to update
 * @param props.body - The update payload containing (optionally) title, body,
 *   and author_display_name
 * @returns The updated post, satisfying all API DTO and business constraints
 * @throws {Error} If the post does not exist, is deleted, or is not owned by
 *   the requester
 */
export async function put__communityPlatform_memberUser_posts_$postId(props: {
  memberUser: MemberuserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  const { memberUser, postId, body } = props;

  // Find active post by ID; reject if not found or deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (!post) throw new Error("Post not found or has been deleted");

  // Authorize that only the original member user can edit their post
  if (post.author_memberuser_id !== memberUser.id) {
    throw new Error(
      "Unauthorized: Only the original author can update this post",
    );
  }

  // Perform update (PATCH semantics: only provide fields if defined)
  const updated = await MyGlobal.prisma.community_platform_posts.update({
    where: { id: postId },
    data: {
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      author_display_name: body.author_display_name ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return fully populated DTO, converting all Date fields to branded strings
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
