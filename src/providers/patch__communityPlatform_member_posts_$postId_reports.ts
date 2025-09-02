import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Paginated, filtered search for reports/flags on a given post.
 *
 * This endpoint returns a paginated list of post report entities
 * (ICommunityPlatformPostReport) associated with a specific post (by postId).
 * It fetches only the reports filed by the authenticated member, supporting
 * advanced filtering (status, report_type), sorting, and pagination. Returned
 * fields follow the post report DTO and all datetime values are ISO8601
 * strings.
 *
 * Only the member's own reports are listed; access to reports filed by others
 * is denied. Requests for non-existent or deleted posts throw an error. Guests
 * are forbidden from using this operation.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member (JWT payload). Only the
 *   member's own reports are returned.
 * @param props.postId - UUID of the post to query reports for.
 * @param props.body - Paginated, filterable search request
 *   (ICommunityPlatformPostReport.IRequest)
 * @returns Paginated result of post report records, with appropriate DTO field
 *   mapping and correct pagination meta.
 * @throws {Error} When the parent post does not exist, is deleted, or is
 *   inaccessible to this member.
 */
export async function patch__communityPlatform_member_posts_$postId_reports(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostReport.IRequest;
}): Promise<IPageICommunityPlatformPostReport> {
  const { member, postId, body } = props;

  // Check existence of the referenced post (must exist and not be deleted)
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (!post) throw new Error("Post not found or has been deleted");

  // Pagination setup
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where clause with optional filters (only show this member's reports on this post)
  const where = {
    community_platform_post_id: postId,
    reported_by_member_id: member.id,
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.report_type !== undefined &&
      body.report_type !== null && { report_type: body.report_type }),
  };

  // Fetch reports & total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_reports.findMany({
      where,
      orderBy: { created_at: body.order === "asc" ? "asc" : "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_post_reports.count({ where }),
  ]);

  // Map to DTO format, all date fields via toISOStringSafe
  const data = rows.map((row) => ({
    id: row.id,
    community_platform_post_id: row.community_platform_post_id,
    reported_by_member_id: row.reported_by_member_id,
    admin_id: row.admin_id ?? undefined,
    report_type: row.report_type,
    reason: row.reason,
    status: row.status,
    resolution_notes: row.resolution_notes ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    resolved_at: row.resolved_at ? toISOStringSafe(row.resolved_at) : undefined,
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  // Ensure correct pagination math for complex uint32 brands
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
