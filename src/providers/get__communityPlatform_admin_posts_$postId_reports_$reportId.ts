import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detail for a specific report on a post by reportId.
 *
 * This endpoint retrieves full details of a single post report entity
 * (community_platform_post_reports) as identified by postId and the report's
 * unique id. Only accessible to admins for moderation, transparency, or audit
 * workflows. Includes all core entity fields corresponding to
 * ICommunityPlatformPostReport.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user (privileged, access any report)
 * @param props.postId - The UUID of the post to which the report belongs.
 * @param props.reportId - The UUID of the report entity to retrieve details
 *   for.
 * @returns All field values for the specified post report entity
 * @throws {Error} When the report does not exist or is not associated with the
 *   specified post
 */
export async function get__communityPlatform_admin_posts_$postId_reports_$reportId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostReport> {
  const { postId, reportId } = props;
  const report =
    await MyGlobal.prisma.community_platform_post_reports.findFirst({
      where: {
        id: reportId,
        community_platform_post_id: postId,
      },
      select: {
        id: true,
        community_platform_post_id: true,
        reported_by_member_id: true,
        admin_id: true,
        report_type: true,
        reason: true,
        status: true,
        resolution_notes: true,
        created_at: true,
        updated_at: true,
        resolved_at: true,
        deleted_at: true,
      },
    });
  if (!report) throw new Error("Report not found");
  return {
    id: report.id,
    community_platform_post_id: report.community_platform_post_id,
    reported_by_member_id: report.reported_by_member_id,
    admin_id: report.admin_id ?? null,
    report_type: report.report_type,
    reason: report.reason,
    status: report.status,
    resolution_notes: report.resolution_notes ?? null,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    resolved_at: report.resolved_at
      ? toISOStringSafe(report.resolved_at)
      : null,
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  };
}
