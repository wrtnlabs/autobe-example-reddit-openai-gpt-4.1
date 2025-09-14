import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostModerationLog";
import { IPageICommunityPlatformPostModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostModerationLog";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

/**
 * Retrieve paginated moderation logs for a specific post, searchable and
 * filterable.
 *
 * This endpoint provides authorized admin users with a paginated, auditable
 * list of all moderation actions (edit, delete, restore, etc.) taken on a
 * single post. It supports full-text search by action type and reason, advanced
 * date filtering (using UTC ISO strings), sort ordering by recency, and robust
 * pagination. Presents detailed log records per post for platform compliance
 * and review, only to platform admins.
 *
 * @param props - Request object containing adminUser, postId, and
 *   filter/sort/pagination body
 * @param props.adminUser - Authenticated admin user performing the query (must
 *   be present and active)
 * @param props.postId - UUID of the post whose moderation logs are being
 *   queried
 * @param props.body - Filter/sort/pagination query parameters
 * @returns Paginated list of moderation logs for the target post, with full
 *   detail fields
 * @throws {Error} If not authorized as admin user
 */
export async function patch__communityPlatform_adminUser_posts_$postId_moderationLogs(props: {
  adminUser: AdminuserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostModerationLog.IRequest;
}): Promise<IPageICommunityPlatformPostModerationLog> {
  const { adminUser, postId, body } = props;
  if (!adminUser || adminUser.type !== "adminUser") {
    throw new Error("Unauthorized: adminUser credentials required");
  }
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Build where filter with correct handling of all optional filters
  const where: Record<string, unknown> = {
    community_platform_post_id: postId,
    ...(body.action_type !== undefined &&
      body.action_type !== null && {
        action_type: body.action_type,
      }),
    ...(body.action_reason !== undefined &&
      body.action_reason !== null && {
        action_reason: { contains: body.action_reason },
      }),
    ...((body.from_date !== undefined && body.from_date !== null) ||
    (body.to_date !== undefined && body.to_date !== null)
      ? {
          created_at: {
            ...(body.from_date !== undefined &&
              body.from_date !== null && { gte: body.from_date }),
            ...(body.to_date !== undefined &&
              body.to_date !== null && { lte: body.to_date }),
          },
        }
      : {}),
  };

  // Query in parallel for pagination optimization
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_moderation_logs.findMany({
      where,
      orderBy: { created_at: body.sort === "asc" ? "asc" : "desc" },
      skip: Number(skip),
      take: Number(limit),
      select: {
        id: true,
        community_platform_post_id: true,
        performed_adminuser_id: true,
        action_type: true,
        action_reason: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_post_moderation_logs.count({ where }),
  ]);

  // Format result set to correct DTO (date/time as ISO string)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: logs.map((log) => ({
      id: log.id,
      community_platform_post_id: log.community_platform_post_id,
      performed_adminuser_id: log.performed_adminuser_id,
      action_type: log.action_type,
      action_reason: log.action_reason === undefined ? null : log.action_reason,
      created_at: toISOStringSafe(log.created_at),
    })),
  };
}
