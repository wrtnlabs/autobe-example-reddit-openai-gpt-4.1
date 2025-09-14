import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserCredential";
import { IPageICommunityPlatformUserCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserCredential";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Search and paginate user credentials (community_platform_user_credentials)
 *
 * Retrieves a paginated, filterable, and sortable list of user credentials for
 * platform administration. Only exposes safe non-sensitive information: id,
 * email, creation and update timestamps. Filtering supports exact email match,
 * created_at time window, and sorts by created_at/updated_at. Applies strict
 * pagination and returns DTO-conforming structures. Soft-deleted credentials
 * are excluded. Requires adminUser authorization context.
 *
 * @param props - Parameters including adminUser (authorization) and request
 *   body (filters, paging)
 * @param props.adminUser - The authenticated admin user context making this
 *   request
 * @param props.body - Filtering, sorting, and paging criteria
 * @returns Page and list of credential summary objects for administrative/audit
 *   purposes
 * @throws {Error} - When pagination parameters are invalid or internal database
 *   errors occur
 */
export async function patch__communityPlatform_adminUser_userCredentials(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformUserCredential.IRequest;
}): Promise<IPageICommunityPlatformUserCredential.ISummary> {
  const { adminUser, body } = props;

  // Defensive: Ensure adminUser is authenticated (always present due to decorator)
  if (!adminUser || adminUser.type !== "adminUser" || !adminUser.id) {
    throw new Error("Unauthorized: adminUser context required.");
  }

  // Normalize paging
  const pageRaw = body.page;
  const limitRaw = body.limit;
  const page = pageRaw && pageRaw >= 1 ? Number(pageRaw) : 1;
  const limit = limitRaw && limitRaw >= 1 ? Number(limitRaw) : 20;

  // Build where clause (soft delete enforcement + filter logic)
  const where = {
    deleted_at: null,
    ...(body.email !== undefined &&
      body.email !== null && {
        email: body.email,
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

  // Only allow 'created_at'/'updated_at' for sort
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort) {
    const sortMatch = /^([a-zA-Z_]+)\s+(asc|desc)$/i.exec(body.sort.trim());
    if (
      sortMatch &&
      (sortMatch[1] === "created_at" || sortMatch[1] === "updated_at") &&
      (sortMatch[2].toLowerCase() === "asc" ||
        sortMatch[2].toLowerCase() === "desc")
    ) {
      orderBy = {
        [sortMatch[1]]: sortMatch[2].toLowerCase() as "asc" | "desc",
      };
    }
  }

  // Fetch records and count total in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_user_credentials.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_user_credentials.count({ where }),
  ]);

  // Map each record to API DTO, converting Date → string according to type
  const data = rows.map((row) => ({
    id: row.id,
    email: row.email,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

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
