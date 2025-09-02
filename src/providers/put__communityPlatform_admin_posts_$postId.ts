import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates a community post by postId (admin operation).
 *
 * This endpoint updates a post’s major editable fields (title, body,
 * author_display_name) in the community_platform_posts table. Only admins are
 * allowed (enforced by decorator). The operation is denied if the post does not
 * exist or has been soft-deleted. Before updating, the current pre-edit state
 * is captured in a post_snapshot for audit/history. Only allowed fields are
 * updated. Timestamps are managed, with updated_at always set to "now", and all
 * dates handled as string & tags.Format<'date-time'>.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin performing the update
 * @param props.postId - The unique identifier (UUID) of the post to update
 * @param props.body - Fields to update in the specified post (title, body,
 *   author_display_name)
 * @returns The updated post after mutation
 * @throws {Error} If post does not exist, is deleted, or update fails for any
 *   reason
 */
export async function put__communityPlatform_admin_posts_$postId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  const { admin, postId, body } = props;

  // 1. Fetch post, ensure it exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (!post) throw new Error("Post not found or has been deleted");

  // 2. Insert a snapshot with current post values before update
  // (for full audit/versioning compliance)
  await MyGlobal.prisma.community_platform_post_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_platform_post_id: post.id,
      community_platform_member_id: post.community_platform_member_id,
      title: post.title,
      body: post.body,
      author_display_name: post.author_display_name ?? null,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // 3. Update allowed fields only, forcibly update updated_at
  const updated = await MyGlobal.prisma.community_platform_posts.update({
    where: { id: postId },
    data: {
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      author_display_name: body.author_display_name ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 4. Return the post with proper field typing/branding (no Date objects!)
  return {
    id: updated.id,
    community_platform_community_id: updated.community_platform_community_id,
    community_platform_member_id: updated.community_platform_member_id,
    title: updated.title,
    body: updated.body,
    author_display_name: updated.author_display_name ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
