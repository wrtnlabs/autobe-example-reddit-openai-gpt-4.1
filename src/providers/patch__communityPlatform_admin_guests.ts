import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a paginated, filtered list of guest visitor entities from the
 * platform's analytics data store for auditing and business analysis.
 *
 * This operation allows administrators to search and list guest visitor
 * entities for analytics and audit purposes. It targets the
 * community_platform_guests table, which stores activity and session data of
 * unauthenticated users browsing the platform. This is a read-only,
 * audit-driven feature for tracking visitor trends, abuse prevention, and
 * general engagement reporting. End-users do not manage these entities manually
 * – operations are strictly administrative and compliant with privacy policy
 * controls. Pagination and search by guest_identifier or time frame are
 * supported, but personal identification is not exposed in compliance with
 * privacy regulations. Only authorized admins can access this resource, and all
 * accesses are audit logged for compliance.
 *
 * @param props - Contains authenticated admin payload and search/filter
 *   parameters ({ admin, body }).
 * @param props.admin - Authenticated admin payload, required for access
 *   control.
 * @param props.body - Search and pagination parameters for guest visitor entity
 *   listing.
 * @returns Paginated list of guest visitor records for analytics and audit.
 * @throws {Error} If the operation fails due to database errors or unauthorized
 *   access.
 */
export async function patch__communityPlatform_admin_guests(props: {
  admin: AdminPayload;
  body: ICommunityPlatformGuest.IRequest;
}): Promise<IPageICommunityPlatformGuest> {
  const { body } = props;

  // Pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Compose where object for filtering
  const where = {
    deleted_at: null,
    ...(body.guest_identifier !== undefined && {
      guest_identifier: body.guest_identifier,
    }),
    ...(body.ip_address !== undefined && {
      ip_address: body.ip_address,
    }),
    ...(body.user_agent !== undefined && {
      user_agent: body.user_agent,
    }),
    ...(body.created_after !== undefined && body.created_before !== undefined
      ? {
          created_at: {
            gte: body.created_after,
            lte: body.created_before,
          },
        }
      : body.created_after !== undefined
        ? {
            created_at: {
              gte: body.created_after,
            },
          }
        : body.created_before !== undefined
          ? {
              created_at: {
                lte: body.created_before,
              },
            }
          : {}),
  };

  const [guests, total] = await Promise.all([
    MyGlobal.prisma.community_platform_guests.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_guests.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: guests.map((g) => ({
      id: g.id,
      guest_identifier: g.guest_identifier,
      ip_address: g.ip_address ?? null,
      user_agent: g.user_agent ?? null,
      created_at: toISOStringSafe(g.created_at),
      deleted_at: g.deleted_at ? toISOStringSafe(g.deleted_at) : null,
    })),
  };
}
