import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedWord";
import { IPageICommunityPlatformBannedWord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBannedWord";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated, filterable list of all banned words managed by the
 * platform.
 *
 * Enables admin users to search, filter, and paginate through banned words in
 * the moderation dictionary. Supports textual search, category filtering,
 * enabled/disabled state, and returns full pagination metadata. Soft-deleted
 * entries are omitted. Only accessible to authenticated admins.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin context (authorization required)
 * @param props.body - Filter/search, pagination, and sort options
 *   (ICommunityPlatformBannedWord.IRequest)
 * @returns Paginated, filterable list of banned word summary entities
 *   (IPageICommunityPlatformBannedWord.ISummary)
 * @throws {Error} If admin is unauthorized or missing
 */
export async function patch__communityPlatform_admin_bannedWords(props: {
  admin: AdminPayload;
  body: ICommunityPlatformBannedWord.IRequest;
}): Promise<IPageICommunityPlatformBannedWord.ISummary> {
  const { admin, body } = props;

  // Authorization enforced by controller/decorator, but verify as contract
  if (!admin) throw new Error("Unauthorized: Admin required");

  // Allowed fields for orderBy
  const allowedOrderFields = ["created_at", "phrase", "category"] as const;
  const orderField =
    body.orderBy && allowedOrderFields.includes(body.orderBy)
      ? body.orderBy
      : "created_at";
  const direction = body.direction === "asc" ? "asc" : "desc";

  // Pagination defaults
  const page = body.page && body.page >= 1 ? body.page : 1;
  const limit = body.limit && body.limit >= 1 ? body.limit : 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Build where clause for Prisma, only include defined fields and soft-delete filter
  const where = {
    deleted_at: null,
    ...(body.enabled !== undefined &&
      body.enabled !== null && { enabled: body.enabled }),
    ...(body.category !== undefined &&
      body.category !== null && { category: body.category }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        phrase: { contains: body.search, mode: "insensitive" as const },
      }),
  };

  // Find rows and total count in parallel (no intermediate variables for params)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_banned_words.findMany({
      where: where,
      orderBy: { [orderField]: direction },
      skip: Number(skip),
      take: Number(limit),
    }),
    MyGlobal.prisma.community_platform_banned_words.count({ where: where }),
  ]);

  // Map to summary DTOs, convert all dates using toISOStringSafe
  const data = rows.map((row) => ({
    id: row.id,
    phrase: row.phrase,
    enabled: row.enabled,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Pagination block - use Number() to ensure uint32 compliance
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Math.ceil(Number(total) / Number(limit)),
  };

  return {
    pagination,
    data,
  };
}
