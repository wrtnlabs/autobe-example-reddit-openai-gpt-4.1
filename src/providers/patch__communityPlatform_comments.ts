import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Paginated and searchable list of comments with core summary data.
 *
 * Retrieves a paginated, filtered list of comments system-wide or for a
 * particular context (e.g., specific post or parent comment). Supports rich
 * filtering (e.g., by post, author, nesting), advanced full-text search on
 * content, and paging for performance. Sorting is offered by newest or top
 * score (top not supported in this operation).
 *
 * Each comment entry exposes summary fields per the Prisma schema: content
 * (body), display name, creation date, parent linkage, etc. Publicly readable
 * by any role, including unauthenticated users, but only non-private fields are
 * returned if accessed as a guest.
 *
 * Operation is accessible to all users; sensitive fields are omitted for guests
 * as per privacy rules. Standard error handling is enforced for malformed
 * queries or unauthorized field access.
 *
 * @param props - Request properties
 * @param props.body - Search/filter criteria and pagination options for
 *   querying comments.
 * @returns Paginated list of comment summary data matching the search criteria.
 * @throws {Error} If an invalid parameter, query, or sort value is provided.
 */
export async function patch__communityPlatform_comments(props: {
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const { body } = props;
  const page: number =
    body.page && typeof body.page === "number" ? body.page : 1;
  const limit: number =
    body.limit && typeof body.limit === "number" ? body.limit : 20;

  // where clause construction per schema-safe spread pattern
  const where = {
    deleted_at: null,
    ...(body.post_id !== undefined && { post_id: body.post_id }),
    // For parent_comment_id allow: undefined (not filtered), null (search for top-level), or specific value
    ...(body.parent_comment_id !== undefined
      ? { parent_comment_id: body.parent_comment_id }
      : {}),
    ...(body.author_memberuser_id !== undefined && {
      author_memberuser_id: body.author_memberuser_id,
    }),
    ...(body.author_guestuser_id !== undefined && {
      author_guestuser_id: body.author_guestuser_id,
    }),
    ...(body.author_adminuser_id !== undefined && {
      author_adminuser_id: body.author_adminuser_id,
    }),
    ...(body.body_query !== undefined &&
      body.body_query !== null &&
      body.body_query.length > 0 && {
        body: { contains: body.body_query },
      }),
  };

  // Determine ordering (only 'newest' is supported; 'top' fallback to created_at desc)
  const orderBy = { created_at: "desc" as const };

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comments.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true,
        post_id: true,
        parent_comment_id: true,
        display_name: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_comments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: comments.map((comment) => ({
      id: comment.id,
      post_id: comment.post_id,
      parent_comment_id: comment.parent_comment_id ?? undefined,
      display_name: comment.display_name ?? undefined,
      created_at: toISOStringSafe(comment.created_at),
    })),
  };
}
