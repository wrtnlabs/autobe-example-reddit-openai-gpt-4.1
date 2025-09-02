import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { IPageICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a paginated, filterable list of all community platform categories
 * in the system.
 *
 * Supports advanced filtering by code, display name, or description, as well as
 * searching, sorting, and pagination. Returns only active (not soft-deleted)
 * categories by default. Used for admin-level category management, audit, and
 * UI dropdown curation.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin payload (authorization is handled by
 *   decorator)
 * @param props.body - Filter, search, pagination, and sorting options
 *   conforming to ICommunityPlatformCategory.IRequest
 * @returns Paginated, filterable list of category summary entities, including
 *   code, name, description, and audit info
 * @throws {Error} Will throw if database query fails
 */
export async function patch__communityPlatform_admin_categories(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCategory.IRequest;
}): Promise<IPageICommunityPlatformCategory.ISummary> {
  const { admin, body } = props;
  // --- Authorization guaranteed by admin parameter injection ---

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  const where = {
    deleted_at: null,
    ...(body.code !== undefined && body.code !== null && { code: body.code }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name, mode: "insensitive" as const },
      }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { code: { contains: body.search, mode: "insensitive" as const } },
          { name: { contains: body.search, mode: "insensitive" as const } },
          {
            description: {
              contains: body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
  };

  const orderField = body.orderBy ?? "created_at";
  const orderDir = body.direction ?? "desc";

  // Prisma operation for both data slice and total count
  const [categories, total] = await Promise.all([
    MyGlobal.prisma.community_platform_categories.findMany({
      where,
      orderBy: { [orderField]: orderDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_categories.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: categories.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
