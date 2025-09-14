import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import { IPageICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Search and paginate admin users (community_platform_adminusers)
 *
 * This endpoint fetches a paginated, sortable, and filterable list of platform
 * admin users from the community_platform_adminusers table for privileged
 * dashboards and management tools. Supports filtering by status, display name,
 * date range, and applies robust pagination and sorting logic. All operations
 * require valid adminUser authentication. Returns only active (not
 * soft-deleted) account summaries.
 *
 * @param props - Request properties
 * @param props.adminUser - The authenticated admin user (must have role
 *   'adminUser')
 * @param props.body - Advanced search, filter, and pagination request
 *   parameters
 * @returns Page of admin user summaries for management tools
 * @throws {Error} If not authenticated as an adminUser
 */
export async function patch__communityPlatform_adminUser_adminUsers(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformAdminUser.IRequest;
}): Promise<IPageICommunityPlatformAdminUser.ISummary> {
  const { adminUser, body } = props;

  // Authorization enforcement
  if (!adminUser || adminUser.type !== "adminUser") {
    throw new Error(
      "Unauthorized: Only adminUser role may access this endpoint",
    );
  }

  // Pagination defaults & enforcement
  const page = body.page && body.page > 0 ? body.page : 1;
  const maxLimit = 100;
  const limit =
    body.limit && body.limit > 0
      ? body.limit > maxLimit
        ? maxLimit
        : body.limit
      : 20;

  // Filtering for soft-deleted and active only
  const where = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.display_name !== undefined &&
      body.display_name !== null && {
        display_name: {
          contains: body.display_name,
        },
      }),
    ...(body.created_after !== undefined &&
      body.created_after !== null && {
        created_at: {
          gte: body.created_after,
        },
      }),
    ...(body.created_before !== undefined &&
      body.created_before !== null && {
        created_at: {
          ...(body.created_after !== undefined && body.created_after !== null
            ? { gte: body.created_after }
            : {}),
          lte: body.created_before,
        },
      }),
  };

  // Sorting - restrict to allowed fields for safety
  const allowedSortFields = [
    "id",
    "created_at",
    "updated_at",
    "display_name",
    "status",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort) {
    const [field, direction] = body.sort.split(" ");
    if (
      allowedSortFields.includes(field) &&
      (direction === "asc" || direction === "desc")
    ) {
      orderBy = { [field]: direction };
    }
  }

  // Database fetch (count and data in parallel)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_adminusers.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        display_name: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_adminusers.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      display_name: row.display_name,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
