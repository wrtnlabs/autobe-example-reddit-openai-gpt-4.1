import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginated, filtered search for reports/flags on a given post.
 *
 * This endpoint returns a paginated list of post report entities associated
 * with a specific post, allowing for advanced filtering (status, type),
 * pagination, and sorting. Accessible only to admins; throws error if post does
 * not exist or is deleted.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user
 * @param props.postId - Post UUID to fetch reports for
 * @param props.body - Query/filter parameters (status, report_type, pagination,
 *   order)
 * @returns Paginated result of reports for the post
 * @throws {Error} When the post does not exist or has been deleted
 */
export async function patch__communityPlatform_admin_posts_$postId_reports(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostReport.IRequest;
}): Promise<IPageICommunityPlatformPostReport> {
  const { admin, postId, body } = props;

  // Authorization: presence of admin means request is authorized; logic present for future extension.

  // 1. Ensure the post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!post) throw new Error("Post not found or deleted");

  // 2. Pagination parameters (defaults: page=1, limit=20)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // 3. Filtering: Build where clause for this post, plus optional report_type/status
  const where = {
    community_platform_post_id: postId,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.report_type !== undefined &&
      body.report_type !== null && { report_type: body.report_type }),
  };

  // 4. orderBy: Must be literal 'asc' | 'desc' as const, defaults to 'desc'
  const orderBy = {
    created_at: body.order === "asc" ? ("asc" as const) : ("desc" as const),
  };
  const skip = (page - 1) * limit;

  // 5. Query reports and total count
  const [reports, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_reports.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_post_reports.count({
      where,
    }),
  ]);

  // 6. Map to output DTO structure; ensure all Date fields use toISOStringSafe()
  const data = reports.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    community_platform_post_id: r.community_platform_post_id as string &
      tags.Format<"uuid">,
    reported_by_member_id: r.reported_by_member_id as string &
      tags.Format<"uuid">,
    admin_id: r.admin_id ?? null,
    report_type: r.report_type,
    reason: r.reason,
    status: r.status,
    resolution_notes: r.resolution_notes ?? null,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
    resolved_at: r.resolved_at ? toISOStringSafe(r.resolved_at) : null,
    deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
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
