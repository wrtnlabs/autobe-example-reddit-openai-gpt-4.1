import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Paginated, filtered query of snapshots (version history) for a specific post.
 *
 * This endpoint retrieves paginated historical post revision snapshots for a
 * single post, identified by postId. It leverages the
 * community_platform_post_snapshots table for immutable audit/history storage.
 * The API supports advanced querying—pagination (page/limit), optional sorting,
 * and filters as described in the request DTO. Snapshots include details such
 * as title, body, author_display_name (if set), and created_at timestamp for
 * each post revision. Operation is restricted: only the original author or an
 * admin may view revision history. Use cases include author content review,
 * editorial control, and moderator audit checks. Security is enforced to ensure
 * privacy of post edit history—read-only unless admin. Errors are returned for
 * unauthorized view or if post/snapshots are not found. This endpoint does not
 * allow edits, only retrieval. Related operations include creating/updating
 * posts and fetching post details.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member making the request (must be
 *   post author)
 * @param props.postId - The unique identifier (UUID) of the post whose
 *   snapshots are listed
 * @param props.body - Pagination and filter parameters for querying post
 *   snapshots
 * @returns Paginated set of post snapshot entities matching query
 * @throws {Error} When the post is not found or requesting member is not
 *   authorized (not the author)
 */
export async function patch__communityPlatform_member_posts_$postId_snapshots(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostSnapshot.IRequest;
}): Promise<IPageICommunityPlatformPostSnapshot> {
  const { member, postId, body } = props;

  // 1. Fetch the post with minimal fields for authorization check
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
    select: { id: true, community_platform_member_id: true },
  });
  if (!post) throw new Error("Post not found");

  // 2. Only allow the author to view snapshot history
  if (post.community_platform_member_id !== member.id) {
    throw new Error(
      "Unauthorized: Only the post author may view revision history",
    );
  }

  // 3. Parse pagination and ordering
  const page = body.page && body.page >= 1 ? body.page : 1;
  const limit = body.limit && body.limit >= 1 ? body.limit : 20;
  const order = body.order === "asc" ? "asc" : "desc";
  const skip = (page - 1) * limit;

  // 4. Query total count of snapshots for the post
  const total = await MyGlobal.prisma.community_platform_post_snapshots.count({
    where: {
      community_platform_post_id: postId,
    },
  });

  // 5. Query current page of snapshot records with sort and pagination
  const rows = await MyGlobal.prisma.community_platform_post_snapshots.findMany(
    {
      where: {
        community_platform_post_id: postId,
      },
      orderBy: { created_at: order },
      skip,
      take: limit,
    },
  );

  // 6. Build response data and map all fields, converting dates
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((snapshot) => ({
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
