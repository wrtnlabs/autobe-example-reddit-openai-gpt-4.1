import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";
import { IPageICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSession";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Search and paginate session tokens (community_platform_sessions).
 *
 * Lists and searches user/session tokens for the platform. Admin users can
 * filter sessions by user_id, token, and session status (active, revoked,
 * expired), supporting secure session auditing and device management. All date
 * fields are string & tags.Format<'date-time'>. Authentication is enforced:
 * only adminUser role may access this endpoint.
 *
 * @param props - Input parameters
 * @param props.adminUser - Authenticated adminUser payload
 * @param props.body - Filter and pagination parameters (user_id, token, status,
 *   page, limit)
 * @returns Paginated session metadata suitable for audits and management
 * @throws {Error} When not authenticated as adminUser
 */
export async function patch__communityPlatform_adminUser_sessions(props: {
  adminUser: AdminuserPayload;
  body: ICommunityPlatformSession.IRequest;
}): Promise<IPageICommunityPlatformSession> {
  const { adminUser, body } = props;
  if (adminUser.type !== "adminUser") {
    throw new Error("Unauthorized: Only adminUser can access session listing");
  }

  // build paging
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  // Infer now as ISO string for status filtering (ready for DB filtering)
  const now = toISOStringSafe(new Date());

  // Compose where clause based on filters from body
  // Only fields that exist in schema
  const where: Record<string, unknown> = {
    ...(body.user_id !== undefined && { user_id: body.user_id }),
    ...(body.token !== undefined && { token: body.token }),
  };
  // Status filtering
  if (body.status === "revoked") {
    where.revoked_at = { not: null };
  } else if (body.status === "active") {
    where.revoked_at = null;
    // Only sessions not revoked and not expired
    where.expires_at = { gt: now };
  } else if (body.status === "expired") {
    where.revoked_at = null;
    // Sessions not revoked, but expired as of now
    where.expires_at = { lte: now };
  }

  // Query DB: always direct fill, never extract where/orderBy as variable
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_sessions.findMany({
      where,
      orderBy: { issued_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_sessions.count({ where }),
  ]);

  // Map each result into API DTO shape, fixing all date-time values
  const data: ICommunityPlatformSession[] = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    token: row.token,
    issued_at: toISOStringSafe(row.issued_at),
    expires_at: toISOStringSafe(row.expires_at),
    device_info: row.device_info ?? null,
    ip_address: row.ip_address ?? null,
    revoked_at:
      row.revoked_at !== null && row.revoked_at !== undefined
        ? toISOStringSafe(row.revoked_at)
        : null,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Pagination object, using Number() for current/limit per guideline
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
