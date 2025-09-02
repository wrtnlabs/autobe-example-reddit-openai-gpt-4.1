import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve details of a specific comment report by reportId.
 *
 * Returns all fields for a single report instance tied to a specific comment.
 * Ensures the full lifecycle (reason, status, assigned admin, timestamps) and
 * resolution notes are available for review. Only the member who filed the
 * report can retrieve their report. Throws errors for invalid IDs, unauthorized
 * access, or if the report does not belong to the specified comment.
 *
 * @member {MemberPayload} member - The authenticated member making the request.
 * @member {string & tags.Format<"uuid">} commentId - The UUID of the comment
 *   being reported.
 * @member {string & tags.Format<"uuid">} reportId - The UUID of the report to
 *   retrieve.
 * @param props - Object containing:
 * @returns {Promise<ICommunityPlatformCommentReport>} The full detail of the
 *   requested comment report.
 * @throws {Error} If the report does not exist, does not match the comment, or
 *   if the member is not the reporter.
 */
export async function get__communityPlatform_member_comments_$commentId_reports_$reportId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentReport> {
  const { member, commentId, reportId } = props;
  const report =
    await MyGlobal.prisma.community_platform_comment_reports.findUniqueOrThrow({
      where: { id: reportId },
    });
  // Defensive: Ensure the report is actually for the comment requested
  if (report.comment_id !== commentId) {
    throw new Error("Report does not belong to specified comment");
  }
  // Authorization: Only the reporting member may view the report
  if (report.reporter_id !== member.id) {
    throw new Error("Forbidden: You may only view reports you filed");
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
