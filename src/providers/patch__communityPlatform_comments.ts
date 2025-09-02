import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * List/filter/search public comments with pagination
 * (community_platform_comments).
 *
 * This operation searches for comments across the platform with advanced
 * filtering, sorting, and pagination capabilities. It targets the
 * community_platform_comments table and returns a paginated list of simplified
 * comment representations (ISummary) suitable for list display.
 *
 * Search by content, post, author, created time, and allow sorting by
 * created_at or score. Only non-deleted comments are included. Public access:
 * anyone (guests, members, admins).
 *
 * @param props - The search and filter request body for comment listing.
 * @returns {IPageICommunityPlatformComment.ISummary} Paginated list and
 *   metadata
 * @throws {Error} If a database or internal error occurs
 */
export async function patch__communityPlatform_comments(props: {
  body: ICommunityPlatformComment.IRequest;
}): Promise<IPageICommunityPlatformComment.ISummary> {
  const { body } = props;

  // Pagination defaults
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 20;
  const page = body.page ?? DEFAULT_PAGE;
  const limit = body.limit ?? DEFAULT_LIMIT;

  // Build where clause using only schema-verified fields
  const where = {
    deleted_at: null,
    ...(body.post_id !== undefined && { post_id: body.post_id }),
    ...(body.author_id !== undefined && { author_id: body.author_id }),
    ...(body.query !== undefined &&
      body.query.length > 0 && {
        content: {
          contains: body.query,
          mode: "insensitive" as const,
        },
      }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // Sorting
  let orderBy: { [key: string]: "asc" | "desc" };
  if (body.sort_by === "score") {
    orderBy = { score: "desc" };
  } else if (body.sort_by === "created_at_asc") {
    orderBy = { created_at: "asc" };
  } else {
    orderBy = { created_at: "desc" };
  }

  // Query and count in parallel (no intermediate variable)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comments.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        post_id: true,
        author_id: true,
        content: true,
        created_at: true,
        score: true,
        edited: true,
      },
    }),
    MyGlobal.prisma.community_platform_comments.count({ where }),
  ]);

  // Map results: ensure date fields use toISOStringSafe conversion
  const data = rows.map((row) => ({
    id: row.id,
    post_id: row.post_id,
    author_id: row.author_id,
    content: row.content,
    created_at: toISOStringSafe(row.created_at),
    score: row.score ?? null,
    edited: row.edited,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
