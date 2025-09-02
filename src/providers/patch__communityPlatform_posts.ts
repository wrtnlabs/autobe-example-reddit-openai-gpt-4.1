import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Retrieves a searchable, filterable, and paginated list of all posts (threads)
 * available on the platform. Supports filtering by community, search keyword,
 * sort order, and pagination. Only posts that are not soft deleted (deleted_at
 * == null) are returned. Designed for home/community/search feeds and supports
 * advanced UI queries.
 *
 * @param props - Request properties
 * @param props.body - Filtering, sorting, and pagination options for post
 *   listing/search
 * @returns Paginated post summary objects and pagination meta
 * @throws {Error} On database or system error
 */
export async function patch__communityPlatform_posts(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_posts.findMany({
      where: {
        deleted_at: null,
        ...(body.community_platform_community_id !== undefined &&
          body.community_platform_community_id !== null && {
            community_platform_community_id:
              body.community_platform_community_id,
          }),
        ...(body.author_id !== undefined &&
          body.author_id !== null && {
            community_platform_member_id: body.author_id,
          }),
        ...((body.min_date !== undefined && body.min_date !== null) ||
        (body.max_date !== undefined && body.max_date !== null)
          ? {
              created_at: {
                ...(body.min_date !== undefined &&
                  body.min_date !== null && { gte: body.min_date }),
                ...(body.max_date !== undefined &&
                  body.max_date !== null && { lte: body.max_date }),
              },
            }
          : {}),
        ...(body.query && {
          OR: [
            { title: { contains: body.query, mode: "insensitive" as const } },
            { body: { contains: body.query, mode: "insensitive" as const } },
          ],
        }),
      },
      orderBy:
        body.sort_by === "top"
          ? { created_at: "desc" as const }
          : ({
              [body.sort_by || "created_at"]:
                body.order === "asc" ? "asc" : "desc",
            } as const),
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        author_display_name: true,
        community_platform_community_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_posts.count({
      where: {
        deleted_at: null,
        ...(body.community_platform_community_id !== undefined &&
          body.community_platform_community_id !== null && {
            community_platform_community_id:
              body.community_platform_community_id,
          }),
        ...(body.author_id !== undefined &&
          body.author_id !== null && {
            community_platform_member_id: body.author_id,
          }),
        ...((body.min_date !== undefined && body.min_date !== null) ||
        (body.max_date !== undefined && body.max_date !== null)
          ? {
              created_at: {
                ...(body.min_date !== undefined &&
                  body.min_date !== null && { gte: body.min_date }),
                ...(body.max_date !== undefined &&
                  body.max_date !== null && { lte: body.max_date }),
              },
            }
          : {}),
        ...(body.query && {
          OR: [
            { title: { contains: body.query, mode: "insensitive" as const } },
            { body: { contains: body.query, mode: "insensitive" as const } },
          ],
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      title: row.title,
      community_platform_community_id: row.community_platform_community_id,
      author_display_name: row.author_display_name ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
