import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated, filtered query of snapshots (version history) for a specific post.
 *
 * This endpoint retrieves paginated historical post revision snapshots for a
 * single post, identified by postId. It is only accessible to admin users.
 * Includes pagination and sort controls.
 *
 * - Verifies post existence (throws error if not found)
 * - Returns snapshot list with pagination, ordered by created_at.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin invoking the query
 * @param props.postId - Unique identifier (UUID) of the post to fetch snapshots
 *   for
 * @param props.body - Pagination/sort options for query
 * @returns Paginated list of snapshots (version history) for the specified post
 * @throws {Error} When the specified post is not found
 */
export async function patch__communityPlatform_admin_posts_$postId_snapshots(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostSnapshot.IRequest;
}): Promise<IPageICommunityPlatformPostSnapshot> {
  const { postId, body } = props;

  // Ensure the post exists (security/404 guarding)
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: { id: postId },
  });
  if (!post) throw new Error("Post not found");

  // Pagination and sort options
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const order = body.order === "asc" ? "asc" : "desc";

  const [snapshots, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_snapshots.findMany({
      where: { community_platform_post_id: postId },
      orderBy: { created_at: order },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.community_platform_post_snapshots.count({
      where: { community_platform_post_id: postId },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: snapshots.map((snapshot) => ({
      id: snapshot.id,
      community_platform_post_id: snapshot.community_platform_post_id,
      community_platform_member_id: snapshot.community_platform_member_id,
      title: snapshot.title,
      body: snapshot.body,
      author_display_name: snapshot.author_display_name ?? null,
      created_at: toISOStringSafe(snapshot.created_at),
    })),
  };
}
