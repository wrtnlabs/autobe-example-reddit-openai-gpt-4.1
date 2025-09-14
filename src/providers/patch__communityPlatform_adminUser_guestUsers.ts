import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestUser";
import { IPageICommunityPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patch__communityPlatform_adminUser_guestUsers(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformGuestUser.IRequest;
}): Promise<IPageICommunityPlatformGuestUser.ISummary> {
  const { adminUser, body } = props;

  // ---- Pagination params ----
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 30;
  const page =
    typeof body.page === "number" && body.page >= 1 ? body.page : DEFAULT_PAGE;
  const limit =
    typeof body.limit === "number" && body.limit > 0
      ? body.limit
      : DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  // ---- Build where clause for Prisma ----
  const where = {
    deleted_at: null,
    ...(body.session_signature !== undefined &&
      body.session_signature !== null && {
        session_signature: body.session_signature,
      }),
    ...(body.created_from !== undefined || body.created_to !== undefined
      ? {
          created_at: {
            ...(body.created_from !== undefined && { gte: body.created_from }),
            ...(body.created_to !== undefined && { lte: body.created_to }),
          },
        }
      : {}),
    ...(body.updated_from !== undefined || body.updated_to !== undefined
      ? {
          updated_at: {
            ...(body.updated_from !== undefined && { gte: body.updated_from }),
            ...(body.updated_to !== undefined && { lte: body.updated_to }),
          },
        }
      : {}),
  };

  // ---- Sort and order enforcement ----
  const ALLOWED_SORT_FIELDS = ["created_at", "updated_at"];
  const sort =
    typeof body.sort === "string" && ALLOWED_SORT_FIELDS.includes(body.sort)
      ? body.sort
      : "created_at";
  const order: "asc" | "desc" =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  // ---- Concurrently fetch data and count ----
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_guestusers.findMany({
      where,
      orderBy: { [sort]: order },
      skip,
      take: limit,
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        session_signature: true,
      },
    }),
    MyGlobal.prisma.community_platform_guestusers.count({ where }),
  ]);

  // ---- Map rows to ISummary with date string conversion ----
  const data = rows.map((row) => ({
    id: row.id,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    session_signature:
      row.session_signature !== undefined ? row.session_signature : undefined,
  }));

  // ---- Pagination meta ----
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
