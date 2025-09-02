import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Update an existing community post by postId, with strict validation and role
 * checks.
 *
 * This endpoint updates a post’s editable fields (title, body,
 * author_display_name) as defined in the community_platform_posts schema. It
 * requires authentication as the post author (member), and enforces input
 * validation upstream. The updated content is persisted, timestamps are
 * updated, and a corresponding post_snapshot is generated for version history.
 * The operation does not allow updates to the post's community, author, or
 * unique id. It fails if the post does not exist, is deleted, or the user lacks
 * write permission.
 *
 * @param props - The request parameters and body.
 * @param props.member - The authenticated member, must be the original author
 *   to update.
 * @param props.postId - The UUID of the post to update.
 * @param props.body - Partial fields to update: title, body, or
 *   author_display_name.
 * @returns The updated post entity with all latest fields.
 * @throws {Error} If post is not found, deleted, or user is not the author.
 */
export async function put__communityPlatform_member_posts_$postId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  const { member, postId, body } = props;

  // Fetch the post and check not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
  });
  if (!post || post.deleted_at !== null) {
    throw new Error("Post not found or already deleted");
  }

  // Authorization: Only the author can update this post via this endpoint
  if (post.community_platform_member_id !== member.id) {
    throw new Error("Forbidden: Only the author can update this post.");
  }

  const now = toISOStringSafe(new Date());

  // Update the post (only allowed fields)
  const updated = await MyGlobal.prisma.community_platform_posts.update({
    where: { id: postId },
    data: {
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      author_display_name: body.author_display_name ?? undefined,
      updated_at: now,
    },
  });

  // Create post snapshot for audit/history
  await MyGlobal.prisma.community_platform_post_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_platform_post_id: postId,
      community_platform_member_id: member.id,
      title: updated.title,
      body: updated.body,
      author_display_name: updated.author_display_name ?? null,
      created_at: now,
    },
  });

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
