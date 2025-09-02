import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";
import { IPageICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Admin search and listing for session tokens (audit and management use).
 *
 * Search and retrieve session token records with support for advanced filtering
 * (by member/admin/user, IP, validity, creation, and expiration times). Allows
 * admins to monitor session lifecycles, security issues, check for
 * active/expired/inactive sessions, and gather insight about user or
 * system-level session access. Requires admin privileges for sensitive data
 * visibility. Returns a paginated list of session records matching
 * search/filtering criteria, including references to owner/member/admin and
 * device information. This operation does not expose session token values in
 * any standard business user or member flow, and responses are executed solely
 * for admin and system oversight.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.body - Advanced search and pagination parameters for session
 *   tokens. Supports filters like member/admin reference, expiration,
 *   invalidation, device, and time.
 * @returns A paginated collection of session token records matching the search
 *   parameters.
 * @throws {Error} When unauthorized or if parameters are invalid
 */
export async function patch__communityPlatform_admin_sessions(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSession.IRequest;
}): Promise<IPageICommunityPlatformSession> {
  const { admin, body } = props;
  // Authorization enforced by admin presence and decorator

  // Pagination
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 100);

  // Main filter
  const nowIso = toISOStringSafe(new Date());
  const where = {
    deleted_at: null,
    ...(body.memberId !== undefined &&
      body.memberId !== null && {
        community_platform_member_id: body.memberId,
      }),
    ...(body.adminId !== undefined &&
      body.adminId !== null && {
        community_platform_admin_id: body.adminId,
      }),
    ...(body.deviceFingerprint && {
      device_fingerprint: body.deviceFingerprint,
    }),
    ...((body.fromDate !== undefined && body.fromDate !== null) ||
    (body.toDate !== undefined && body.toDate !== null)
      ? {
          created_at: {
            ...(body.fromDate !== undefined &&
              body.fromDate !== null && {
                gte: body.fromDate,
              }),
            ...(body.toDate !== undefined &&
              body.toDate !== null && {
                lte: body.toDate,
              }),
          },
        }
      : {}),
    ...(body.activeOnly
      ? {
          expires_at: { gt: nowIso },
          invalidated_at: null,
        }
      : {}),
    ...(body.expiredOnly
      ? {
          expires_at: { lt: nowIso },
        }
      : {}),
    ...(body.search && {
      device_fingerprint: {
        contains: body.search,
        mode: "insensitive" as const,
      },
    }),
  };

  // Order by
  const orderBy = body.sortBy
    ? {
        [body.sortBy]: (body.direction === "asc" ? "asc" : "desc") as
          | "asc"
          | "desc",
      }
    : { created_at: "desc" as const };

  // Query results and total count in parallel
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.community_platform_sessions.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_sessions.count({ where }),
  ]);

  // Map Prisma result into API type
  const data: ICommunityPlatformSession[] = sessions.map((s) => ({
    id: s.id as string & tags.Format<"uuid">,
    community_platform_member_id: s.community_platform_member_id ?? null,
    community_platform_admin_id: s.community_platform_admin_id ?? null,
    jwt_token: s.jwt_token,
    refresh_token: s.refresh_token,
    device_fingerprint: s.device_fingerprint ?? null,
    expires_at: toISOStringSafe(s.expires_at),
    invalidated_at: s.invalidated_at ? toISOStringSafe(s.invalidated_at) : null,
    created_at: toISOStringSafe(s.created_at),
    deleted_at: s.deleted_at ? toISOStringSafe(s.deleted_at) : null,
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
