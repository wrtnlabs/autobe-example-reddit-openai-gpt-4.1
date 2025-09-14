import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import { IPageICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Search and paginate member user accounts (community_platform_memberusers)
 *
 * This endpoint retrieves a paginated list of platform member users for admin
 * use, supporting optional search filters (display_name, status, created_at
 * range) and sorting. Pagination is strictly enforced, and only non-deleted
 * users are returned. Result items conform to
 * ICommunityPlatformMemberUser.ISummary. Only accessible to admin users.
 *
 * @param props - Object providing the authenticated admin user and request body
 *   filters and pagination
 * @param props.adminUser - The authenticated admin user (validated JWT payload)
 * @param props.body - Request criteria: pagination, search filters, and sort
 *   options
 * @returns Paginated set of member user summaries
 * @throws {Error} If database query fails or inputs violate contract
 */
export async function patch__communityPlatform_adminUser_memberUsers(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformMemberUser.IRequest;
}): Promise<IPageICommunityPlatformMemberUser.ISummary> {
  const { adminUser, body } = props;

  // Defensive normalization for pagination
  const page =
    body.page !== undefined && body.page !== null && body.page >= 1
      ? Number(body.page)
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit >= 1
      ? Number(body.limit)
      : 20;

  // Filter construction: only use verified schema fields
  const where = {
    deleted_at: null,
    ...(body.display_name !== undefined &&
      body.display_name !== null &&
      body.display_name.trim().length > 0 && {
        display_name: { contains: body.display_name },
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...((body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && {
                gte: body.created_after,
              }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && {
                lte: body.created_before,
              }),
          },
        }
      : {}),
  };

  // Parse sort string for orderBy (only allow specific fields)
  const allowedSortFields = ["created_at", "display_name", "status"];
  // Fix: define orderBy inline and use "as const" for direction!
  let orderBy: Prisma.community_platform_memberusersOrderByWithRelationInput = {
    created_at: "desc",
  };
  if (
    body.sort !== undefined &&
    body.sort !== null &&
    body.sort.trim().length > 0
  ) {
    const sortParts = body.sort.trim().split(/\s+/);
    const key = sortParts[0];
    // Fix 1: explicit "asc"|"desc", TypeScript expects SortOrder
    const dir: Prisma.SortOrder =
      sortParts[1] && sortParts[1].toLowerCase() === "asc" ? "asc" : "desc";
    if (allowedSortFields.includes(key)) {
      orderBy = {
        [key]: dir,
      } as Prisma.community_platform_memberusersOrderByWithRelationInput;
    }
  }

  // Query DB concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_memberusers.findMany({
      where,
      select: {
        id: true,
        display_name: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_memberusers.count({ where }),
  ]);

  // map result rows and force date conversion
  const data = rows.map((row) => ({
    id: row.id,
    display_name: row.display_name,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
    data,
  };
}
