import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Retrieve details for a specific post by postId from community_platform_posts.
 *
 * This endpoint looks up a post by its UUID, fetching all primary fields from
 * the post entity if found and not soft-deleted. It ensures date and nullable
 * fields are returned with the correct format and branding. If the post does
 * not exist or is soft-deleted, a 404 error is thrown as per public access
 * business rules. This API is for public consumption and requires no
 * authentication.
 *
 * @param props - Request object
 * @param props.postId - The unique identifier (UUID) of the post to retrieve
 * @returns The full post entity including all major fields and soft-delete
 *   status
 * @throws {Error} When the post does not exist or has been soft-deleted (404
 *   Not Found)
 */
export async function get__communityPlatform_posts_$postId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost> {
  const { postId } = props;
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_platform_community_id: true,
      community_platform_member_id: true,
      title: true,
      body: true,
      author_display_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!post) throw new Error("Post not found");
  return {
    id: post.id,
    community_platform_community_id: post.community_platform_community_id,
    community_platform_member_id: post.community_platform_member_id,
    title: post.title,
    body: post.body,
    author_display_name: post.author_display_name ?? null,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
  };
}
