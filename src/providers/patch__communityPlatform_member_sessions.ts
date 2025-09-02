import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSession";
import { IPageICommunityPlatformSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieves a filtered and paginated list of the current member user's
 * authenticated sessions.
 *
 * Allows the current logged-in member to view all of their active and
 * historical login sessions, across all devices/browsers. Each session record
 * includes expiration info, device fingerprint, invalidation status, and audit
 * fields as per the schema.
 *
 * Strictly enforces user isolation: sessions are always filtered by the
 * authenticated member's id, regardless of what is provided in the request
 * body. Supports searching, filtering (active/expired, device fingerprint, date
 * range, free-text search), and customizable pagination/sorting.
 *
 * @param props - Provider props containing the authenticated member payload and
 *   search/filter body.
 * @param props.member - The authenticated member making the request. Used to
 *   isolate sessions to this user only.
 * @param props.body - Filtering/pagination options (page, limit, sort, etc.).
 *   User-supplied but always restricted to own sessions.
 * @returns Paginated list of session objects, matching filters and sorted as
 *   requested. Includes session/device/audit fields per schema.
 * @throws {Error} If any unexpected database or filtering error occurs.
 */
export async function patch__communityPlatform_member_sessions(props: {
  member: MemberPayload;
  body: ICommunityPlatformSession.IRequest;
}): Promise<IPageICommunityPlatformSession> {
  const { member, body } = props;
  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  // Always restrict to the current member; never allow cross-account queries
  // Filtering logic based on IRequest DTO
  const where = {
    community_platform_member_id: member.id, // override - never use body.memberId
    deleted_at: null, // only show non-deleted sessions
    // Active or expired filtering
    ...(body.activeOnly === true && {
      invalidated_at: null,
      expires_at: { gt: toISOStringSafe(new Date()) },
    }),
    ...(body.expiredOnly === true && {
      expires_at: { lte: toISOStringSafe(new Date()) },
    }),
    // Device fingerprint exact match
    ...(body.deviceFingerprint !== undefined &&
      body.deviceFingerprint !== null && {
        device_fingerprint: body.deviceFingerprint,
      }),
    // Date range filtering
    ...(body.fromDate !== undefined &&
      body.fromDate !== null && {
        created_at: {
          gte: body.fromDate,
          ...(body.toDate !== undefined &&
            body.toDate !== null && { lte: body.toDate }),
        },
      }),
    ...((body.fromDate === undefined || body.fromDate === null) &&
      body.toDate !== undefined &&
      body.toDate !== null && {
        created_at: { lte: body.toDate },
      }),
    // Free-text device search (on device_fingerprint)
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        device_fingerprint: {
          contains: body.search,
          mode: "insensitive" as const,
        },
      }),
  };

  // Sort by requested field or default to most recent created_at DESC
  const orderBy = ((): Record<string, "asc" | "desc"> => {
    if (
      body.sortBy &&
      body.direction &&
      (body.direction === "asc" || body.direction === "desc")
    ) {
      return { [body.sortBy]: body.direction };
    }
    return { created_at: "desc" };
  })();

  // Retrieve paginated sessions and total count
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.community_platform_sessions.findMany({
      where,
      orderBy,
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.community_platform_sessions.count({ where }),
  ]);

  // Map and brand all output fields properly
  const data = sessions.map((row) => ({
    id: row.id,
    community_platform_member_id: row.community_platform_member_id ?? null,
    community_platform_admin_id: row.community_platform_admin_id ?? null,
    jwt_token: row.jwt_token,
    refresh_token: row.refresh_token,
    device_fingerprint: row.device_fingerprint ?? null,
    expires_at: toISOStringSafe(row.expires_at),
    invalidated_at: row.invalidated_at
      ? toISOStringSafe(row.invalidated_at)
      : null,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
