import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import { IPageICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAppeal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and filter member-initiated appeals for moderation/admin actions.
 *
 * Retrieve a paginated, filterable list of appeals from the platform. This
 * endpoint supports filtering by member/admin/action/status/decision_reason,
 * pagination, date ranges, and returns a paginated list of summaries for all
 * matches.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user (authorization required)
 * @param props.body - Search/filter/pagination object for appeals
 * @returns Paginated list of appeal summaries and pagination info
 * @throws {Error} If the querying admin is not valid (should have already been
 *   verified by decorator)
 */
export async function patch__communityPlatform_admin_appeals(props: {
  admin: AdminPayload;
  body: ICommunityPlatformAppeal.IRequest;
}): Promise<IPageICommunityPlatformAppeal.ISummary> {
  const { admin, body } = props;
  // Authorization: Already enforced by decorator

  // Pagination params with default fallback
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // WHERE clause: constructed from all allowed DTO fields
  const where = {
    ...(body.member_id !== undefined &&
      body.member_id !== null && { member_id: body.member_id }),
    ...(body.admin_id !== undefined &&
      body.admin_id !== null && { admin_id: body.admin_id }),
    ...(body.admin_action_id !== undefined &&
      body.admin_action_id !== null && {
        admin_action_id: body.admin_action_id,
      }),
    ...(body.appeal_status !== undefined &&
      body.appeal_status !== null && { appeal_status: body.appeal_status }),
    ...(body.decision_reason !== undefined &&
      body.decision_reason !== null && {
        decision_reason: {
          contains: body.decision_reason,
          mode: "insensitive" as const,
        },
      }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
    ...(body.updated_at_from !== undefined || body.updated_at_to !== undefined
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined &&
              body.updated_at_from !== null && {
                gte: body.updated_at_from,
              }),
            ...(body.updated_at_to !== undefined &&
              body.updated_at_to !== null && {
                lte: body.updated_at_to,
              }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_appeals.findMany({
      where,
      orderBy: { updated_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        member_id: true,
        admin_action_id: true,
        appeal_status: true,
        decision_reason: true,
        admin_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_appeals.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id as string & tags.Format<"uuid">,
      member_id: row.member_id as string & tags.Format<"uuid">,
      admin_action_id: row.admin_action_id as string & tags.Format<"uuid">,
      appeal_status: row.appeal_status,
      decision_reason: row.decision_reason ?? null,
      admin_id: row.admin_id ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
