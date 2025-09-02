import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific comment report by reportId.
 *
 * Returns all fields for a single report instance tied to a specific comment.
 * This operation ensures that the full lifecycle (reason, status, assigned
 * admin, timestamps) and resolution notes are available for review. Security
 * logic restricts access: admins can retrieve any report; members may retrieve
 * reports they filed. The call will fail with appropriate errors for invalid
 * IDs, lack of permission, or attempts to access unrelated resources.
 *
 * This endpoint is typically used in moderation dashboards, admin appeals, and
 * user self-service views for checking report status or dispute workflows.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user making this request (must
 *   have full admin privileges)
 * @param props.commentId - The UUID of the comment for which this report
 *   applies
 * @param props.reportId - The UUID of the comment report to retrieve
 * @returns The detailed information about the requested comment report,
 *   including all moderation, audit, and status fields
 * @throws {Error} If the report does not exist or does not belong to that
 *   comment
 */
export async function get__communityPlatform_admin_comments_$commentId_reports_$reportId(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentReport> {
  const { commentId, reportId } = props;

  // Find the report by reportId
  const report =
    await MyGlobal.prisma.community_platform_comment_reports.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        comment_id: true,
        reporter_id: true,
        admin_id: true,
        report_reason: true,
        status: true,
        resolution: true,
        created_at: true,
        updated_at: true,
        resolved_at: true,
      },
    });
  if (!report) {
    throw new Error("Report not found");
  }
  // Validate that this report belongs to the target comment
  if (report.comment_id !== commentId) {
    throw new Error("Report does not belong to the specified comment");
  }

  return {
    id: report.id,
    comment_id: report.comment_id,
    reporter_id: report.reporter_id,
    admin_id: report.admin_id ?? null,
    report_reason: report.report_reason,
    status: report.status,
    resolution: report.resolution ?? null,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    resolved_at: report.resolved_at
      ? toISOStringSafe(report.resolved_at)
      : null,
  };
}
