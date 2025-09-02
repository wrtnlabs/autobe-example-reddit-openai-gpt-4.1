import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve paginated, filtered vote records across posts and comments.
 *
 * This operation allows admins to view a paginated and filtered list of all
 * votes cast on posts or comments in the system. Admins may filter by voter,
 * target, value, and sort, as well as paginate the results. Only votes that are
 * not soft-deleted (deleted_at===null) are returned. The output includes
 * pagination statistics and an array of summarized vote records.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request. Admins have
 *   global access.
 * @param props.body - Advanced filter, search, and pagination criteria for
 *   votes as per ICommunityPlatformVote.IRequest
 * @returns Paginated list of vote summaries matching filter/search criteria
 * @throws {Error} When database operation fails (should not throw for empty/no
 *   results)
 */
export async function patch__communityPlatform_admin_votes(props: {
  admin: AdminPayload;
  body: ICommunityPlatformVote.IRequest;
}): Promise<IPageICommunityPlatformVote.ISummary> {
  const { admin, body } = props;
  // Build filters for Prisma where clause (soft-deleted excluded)
  const where = {
    deleted_at: null,
    ...(body.voter_id !== undefined &&
      body.voter_id !== null && { voter_id: body.voter_id }),
    ...(body.post_id !== undefined &&
      body.post_id !== null && { post_id: body.post_id }),
    ...(body.comment_id !== undefined &&
      body.comment_id !== null && { comment_id: body.comment_id }),
    ...(body.value !== undefined &&
      body.value !== null && { value: body.value }),
  };
  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  // Sorting (default: created_at desc)
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort && typeof body.sort === "string" && body.sort.length > 0) {
    const [field, dir] = body.sort.split(" ");
    if (["created_at", "updated_at", "value"].includes(field)) {
      orderBy = { [field]: dir === "asc" ? "asc" : "desc" };
    }
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_votes.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        voter_id: true,
        post_id: true,
        comment_id: true,
        value: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_votes.count({ where }),
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
      voter_id: row.voter_id,
      post_id: row.post_id ?? null,
      comment_id: row.comment_id ?? null,
      value: row.value as 1 | 0 | -1,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
