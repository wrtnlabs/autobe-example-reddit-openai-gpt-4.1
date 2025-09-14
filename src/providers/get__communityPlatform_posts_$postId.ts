import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Retrieve detailed information for a specific post from
 * community_platform_posts by postId.
 *
 * This endpoint looks up a post by its UUID and returns the complete detail if
 * the post exists and is active (not soft deleted). It exposes all key fields
 * for display: community reference, optional member/admin author ids, title,
 * body, display name, created/updated timestamps, and optional deleted_at
 * (should be undefined/null for active posts). No authentication or
 * authorization is required for this endpoint.
 *
 * @param props - Parameters with postId (UUID of the post to fetch detail for)
 * @returns Complete post details with all fields for display and further
 *   business logic
 * @throws {Error} If the post does not exist or is deleted
 */
export async function get__communityPlatform_posts_$postId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost> {
  const { postId } = props;
  const post = await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
    where: { id: postId, deleted_at: null },
    select: {
      id: true,
      community_platform_community_id: true,
      author_memberuser_id: true,
      author_adminuser_id: true,
      title: true,
      body: true,
      author_display_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: post.id,
    community_platform_community_id: post.community_platform_community_id,
    ...(post.author_memberuser_id != null
      ? { author_memberuser_id: post.author_memberuser_id }
      : {}),
    ...(post.author_adminuser_id != null
      ? { author_adminuser_id: post.author_adminuser_id }
      : {}),
    title: post.title,
    body: post.body,
    ...(post.author_display_name != null
      ? { author_display_name: post.author_display_name }
      : {}),
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    ...(post.deleted_at != null
      ? { deleted_at: toISOStringSafe(post.deleted_at) }
      : {}),
  };
}
